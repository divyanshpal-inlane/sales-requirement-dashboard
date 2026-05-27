import { useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";

import { supabase } from "@/lib/supabaseClient";
import { isTimeUnavailable } from "@/utils/time";

export const MATRIX_DAY_START_HOUR = 6;
export const MATRIX_DAY_END_HOUR = 20;
export const MATRIX_HOURS_PER_DAY = MATRIX_DAY_END_HOUR - MATRIX_DAY_START_HOUR; // 14

export type SlotStatus = "free" | "booked" | "unavailable" | "conflict";

export type EnrollmentType = "course" | "demo" | "topup" | "tentative" | null;

export interface MatrixSchedule {
  id: number;
  start_time: string;
  end_time: string;
  startHour: number;
  endHour: number;
  status: string | null;
  isTentative: boolean | null;
  learnerId: string | null;
  learnerName: string | null;
  learnerPhone: string | null;
  lessonId: string | null;
  lessonNumber: number | null;
  enrollmentType: EnrollmentType;
}

export interface MatrixSlot {
  hour: number; // 0-23, start hour of the slot
  status: SlotStatus;
  schedules: MatrixSchedule[]; // usually 0 or 1; >1 means conflict
}

export interface MatrixDay {
  date: string; // yyyy-MM-dd
  weekday: string; // e.g., "Mon"
  dayOfMonth: number;
  slots: MatrixSlot[];
  bookedHours: number;
  unavailableHours: number;
  capacityHours: number; // hours actually offered (working window − unavailable)
  conflictCount: number;
}

export interface MatrixInstructor {
  id: string;
  name: string;
  phone: string | null;
}

export interface MatrixRow {
  instructor: MatrixInstructor;
  days: MatrixDay[];
  weekBookedHours: number;
  weekCapacityHours: number;
  weekConflictCount: number;
}

export interface InstructorMatrixData {
  from: string; // yyyy-MM-dd
  to: string; // yyyy-MM-dd (inclusive)
  dayHeaders: { date: string; weekday: string; dayOfMonth: number }[];
  rows: MatrixRow[];
  totals: {
    instructorCount: number;
    bookedHours: number;
    capacityHours: number;
    conflictCount: number;
  };
}

const overlapsHour = (
  hour: number,
  startTime: string | null,
  endTime: string | null,
): boolean => {
  if (!startTime || !endTime) return false;
  const [sh, sm = "0"] = startTime.split(":");
  const [eh, em = "0"] = endTime.split(":");
  const startMin = Number(sh) * 60 + Number(sm);
  const endMin = Number(eh) * 60 + Number(em);
  const slotStart = hour * 60;
  const slotEnd = (hour + 1) * 60;
  return startMin < slotEnd && endMin > slotStart;
};

const hoursBetween = (
  startTime: string | null,
  endTime: string | null,
): number => {
  if (!startTime || !endTime) return 0;
  const [sh, sm = "0"] = startTime.split(":");
  const [eh, em = "0"] = endTime.split(":");
  const startMin = Number(sh) * 60 + Number(sm);
  const endMin = Number(eh) * 60 + Number(em);
  return Math.max(0, (endMin - startMin) / 60);
};

export function useInstructorMatrix(opts: {
  weekStart: Date; // Monday at 00:00 local
  enabled?: boolean;
}) {
  const { weekStart, enabled = true } = opts;
  const from = format(weekStart, "yyyy-MM-dd");
  const to = format(addDays(weekStart, 6), "yyyy-MM-dd");

  return useQuery<InstructorMatrixData>({
    queryKey: ["instructor-matrix", from, to],
    enabled,
    queryFn: async () => {
      const { data: instructorRows, error: instructorErr } = await supabase
        .from("Instructor")
        .select("id_instructor, name, phone, unavailability, enabled")
        .order("name", { ascending: true });

      if (instructorErr) throw instructorErr;

      const instructors = (instructorRows ?? []).filter(
        (i) => i.enabled !== false,
      );

      const { data: scheduleRows, error: scheduleErr } = await supabase
        .from("Schedule")
        .select(
          "id, instructor_id, learner_id, lesson_id, date, start_time, end_time, status, isTentative, Learner(id, name, phone), Lesson(id, number)",
        )
        .gte("date", from)
        .lte("date", to)
        .not("status", "in", "(paused,pending_payment)");

      if (scheduleErr) throw scheduleErr;

      const schedules = scheduleRows ?? [];

      // Enrollment lookup for booked learners — to tag course / demo / topup.
      const uniqueLearnerIds = Array.from(
        new Set(
          schedules.map((s) => s.learner_id).filter((id): id is string => !!id),
        ),
      );

      const enrollmentTypeByLearner = new Map<string, EnrollmentType>();
      if (uniqueLearnerIds.length > 0) {
        const { data: enrollmentRows } = await supabase
          .from("enrollment")
          .select("learner_id, course_id, progress, created_at")
          .in("learner_id", uniqueLearnerIds)
          .order("created_at", { ascending: false });

        for (const e of enrollmentRows ?? []) {
          if (enrollmentTypeByLearner.has(e.learner_id)) continue;
          const progress = e.progress as { type?: string } | null | undefined;
          const t = progress?.type ?? (e.course_id ? "course" : null);
          enrollmentTypeByLearner.set(
            e.learner_id,
            t === "course" || t === "demo" || t === "topup" ? t : null,
          );
        }
      }

      // Group schedules: instructor_id -> date -> list
      const byInstrDate = new Map<string, Map<string, MatrixSchedule[]>>();
      for (const s of schedules) {
        if (!s.instructor_id) continue;
        const learner = Array.isArray(s.Learner) ? s.Learner[0] : s.Learner;
        const lesson = Array.isArray(s.Lesson) ? s.Lesson[0] : s.Lesson;
        const enriched: MatrixSchedule = {
          id: s.id,
          start_time: s.start_time,
          end_time: s.end_time,
          startHour: Number(s.start_time?.slice(0, 2) ?? 0),
          endHour: Number(s.end_time?.slice(0, 2) ?? 0),
          status: s.status,
          isTentative: s.isTentative,
          learnerId: s.learner_id,
          learnerName: learner?.name ?? s["leadName" as keyof typeof s] ?? null,
          learnerPhone: learner?.phone ?? null,
          lessonId: s.lesson_id,
          lessonNumber: lesson?.number ?? null,
          enrollmentType: s.isTentative
            ? "tentative"
            : s.learner_id
              ? (enrollmentTypeByLearner.get(s.learner_id) ?? null)
              : null,
        };

        if (!byInstrDate.has(s.instructor_id)) {
          byInstrDate.set(s.instructor_id, new Map());
        }
        const dateMap = byInstrDate.get(s.instructor_id)!;
        if (!dateMap.has(s.date)) dateMap.set(s.date, []);
        dateMap.get(s.date)!.push(enriched);
      }

      // Build day headers
      const dayHeaders = Array.from({ length: 7 }).map((_, i) => {
        const d = addDays(weekStart, i);
        return {
          date: format(d, "yyyy-MM-dd"),
          weekday: format(d, "EEE"),
          dayOfMonth: d.getDate(),
        };
      });

      // Build rows
      const rows: MatrixRow[] = instructors.map((instr) => {
        const unavailability = Array.isArray(instr.unavailability)
          ? (instr.unavailability as unknown[])
          : null;
        const dateMap = byInstrDate.get(instr.id_instructor) ?? new Map();
        let weekBookedHours = 0;
        let weekCapacityHours = 0;
        let weekConflictCount = 0;

        const days: MatrixDay[] = dayHeaders.map((header, dayIdx) => {
          const dayDate = addDays(weekStart, dayIdx);
          const daySchedules: MatrixSchedule[] = dateMap.get(header.date) ?? [];

          let unavailableHours = 0;
          let conflictCount = 0;
          const slots: MatrixSlot[] = [];

          for (let h = MATRIX_DAY_START_HOUR; h < MATRIX_DAY_END_HOUR; h++) {
            const overlapping = daySchedules.filter((sch) =>
              overlapsHour(h, sch.start_time, sch.end_time),
            );
            const unavailable = isTimeUnavailable(
              unavailability,
              dayDate,
              h,
              0,
            );

            let status: SlotStatus;
            if (overlapping.length > 1) {
              status = "conflict";
              conflictCount += 1;
            } else if (overlapping.length === 1) {
              status = "booked";
            } else if (unavailable) {
              status = "unavailable";
              unavailableHours += 1;
            } else {
              status = "free";
            }

            slots.push({ hour: h, status, schedules: overlapping });
          }

          // Sum hours from schedules that may extend beyond [06,20] for booked total
          // but capacity uses the fixed working window.
          const capacityHours = Math.max(
            0,
            MATRIX_HOURS_PER_DAY - unavailableHours,
          );

          // Use schedule durations for a more accurate booked-hours count when
          // schedules don't align to the hour grid.
          const exactBookedHours = daySchedules.reduce(
            (sum, s) =>
              sum +
              Math.min(
                MATRIX_HOURS_PER_DAY,
                hoursBetween(s.start_time, s.end_time),
              ),
            0,
          );

          weekBookedHours += exactBookedHours;
          weekCapacityHours += capacityHours;
          weekConflictCount += conflictCount;

          return {
            date: header.date,
            weekday: header.weekday,
            dayOfMonth: header.dayOfMonth,
            slots,
            bookedHours: exactBookedHours,
            unavailableHours,
            capacityHours,
            conflictCount,
          };
        });

        return {
          instructor: {
            id: instr.id_instructor,
            name: instr.name ?? "(unnamed)",
            phone: instr.phone,
          },
          days,
          weekBookedHours,
          weekCapacityHours,
          weekConflictCount,
        };
      });

      const totals = rows.reduce(
        (acc, r) => ({
          instructorCount: acc.instructorCount + 1,
          bookedHours: acc.bookedHours + r.weekBookedHours,
          capacityHours: acc.capacityHours + r.weekCapacityHours,
          conflictCount: acc.conflictCount + r.weekConflictCount,
        }),
        {
          instructorCount: 0,
          bookedHours: 0,
          capacityHours: 0,
          conflictCount: 0,
        },
      );

      return { from, to, dayHeaders, rows, totals };
    },
  });
}
