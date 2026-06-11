import { useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";

import { supabase } from "@/lib/supabaseClient";
import { isTimeUnavailable } from "@/utils/time";

export const MATRIX_DAY_START_HOUR = 6;
export const MATRIX_DAY_END_HOUR = 20;
export const MATRIX_HOURS_PER_DAY = MATRIX_DAY_END_HOUR - MATRIX_DAY_START_HOUR; // 14

// The grid is rendered in 30-minute slots so half-hour lessons map to a single
// block instead of bleeding across two whole-hour cells.
export const MATRIX_SLOT_MINUTES = 30;
export const MATRIX_DAY_START_MIN = MATRIX_DAY_START_HOUR * 60; // 06:00
export const MATRIX_DAY_END_MIN = MATRIX_DAY_END_HOUR * 60; // 20:00
export const MATRIX_SLOTS_PER_DAY =
  (MATRIX_DAY_END_MIN - MATRIX_DAY_START_MIN) / MATRIX_SLOT_MINUTES; // 28

export type SlotStatus = "free" | "booked" | "unavailable" | "conflict";

export type EnrollmentType = "course" | "demo" | "topup" | "tentative" | null;

export interface MatrixSchedule {
  id: number;
  start_time: string;
  end_time: string;
  startHour: number;
  endHour: number;
  startMin: number | null; // minutes from midnight
  endMin: number | null;
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
  startMin: number; // minutes from midnight, start of the 30-min slot
  endMin: number; // minutes from midnight, end of the 30-min slot
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

const timeToMinutes = (t: string | null | undefined): number | null => {
  if (!t) return null;
  const [h, m = "0"] = t.split(":");
  return Number(h) * 60 + Number(m);
};

// Two half-open intervals [aStart, aEnd) and [bStart, bEnd) overlap only if each
// starts strictly before the other ends. Touching ends (back-to-back lessons)
// do NOT count as overlapping.
const intervalsOverlap = (
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean => aStart < bEnd && bStart < aEnd;

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
          startMin: timeToMinutes(s.start_time),
          endMin: timeToMinutes(s.end_time),
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

          // Conflicts are detected from real time-overlap between lessons,
          // independent of the display grid. Back-to-back lessons (e.g.
          // 12:00–12:30 and 12:30–13:00) do NOT conflict; genuinely
          // overlapping lessons do. conflictCount = number of lessons that
          // clash with at least one other lesson that day.
          const conflictIds = new Set<number>();
          for (let i = 0; i < daySchedules.length; i++) {
            const a = daySchedules[i];
            if (a.startMin == null || a.endMin == null) continue;
            for (let j = i + 1; j < daySchedules.length; j++) {
              const b = daySchedules[j];
              if (b.startMin == null || b.endMin == null) continue;
              if (
                intervalsOverlap(a.startMin, a.endMin, b.startMin, b.endMin)
              ) {
                conflictIds.add(a.id);
                conflictIds.add(b.id);
              }
            }
          }
          const conflictCount = conflictIds.size;

          let unavailableSlots = 0;
          const slots: MatrixSlot[] = [];

          // 30-minute slots across the working window (06:00–20:00).
          for (
            let m = MATRIX_DAY_START_MIN;
            m < MATRIX_DAY_END_MIN;
            m += MATRIX_SLOT_MINUTES
          ) {
            const slotEnd = m + MATRIX_SLOT_MINUTES;
            const overlapping = daySchedules.filter(
              (sch) =>
                sch.startMin != null &&
                sch.endMin != null &&
                intervalsOverlap(m, slotEnd, sch.startMin, sch.endMin),
            );
            const unavailable = isTimeUnavailable(
              unavailability,
              dayDate,
              Math.floor(m / 60),
              m % 60,
            );

            let status: SlotStatus;
            if (overlapping.length > 1) {
              status = "conflict";
            } else if (overlapping.length === 1) {
              status = "booked";
            } else if (unavailable) {
              status = "unavailable";
              unavailableSlots += 1;
            } else {
              status = "free";
            }

            slots.push({ startMin: m, endMin: slotEnd, status, schedules: overlapping });
          }

          // Each unavailable 30-min slot is half an hour of lost capacity.
          const unavailableHours =
            (unavailableSlots * MATRIX_SLOT_MINUTES) / 60;

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
