import { supabase } from "@/lib/supabaseClient";
import { isTimeUnavailable } from "@/utils/time";

export type ScheduleConflict =
  | {
      type: "overlap";
      schedule: {
        id: number;
        start_time: string;
        end_time: string;
        status: string | null;
        learner_id: string | null;
      };
    }
  | { type: "unavailability"; at: string };

export type ConflictCheckParams = {
  instructorId: string;
  date: string;
  startTime: string;
  endTime: string;
  excludeScheduleId?: number | null;
};

const FREE_STATUSES = ["cancelled", "rejected"];

function toMinutes(hhmm: string): number {
  const [h, m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export async function checkScheduleConflict(
  params: ConflictCheckParams,
): Promise<ScheduleConflict[]> {
  const { instructorId, date, startTime, endTime, excludeScheduleId } = params;

  if (!instructorId || !date || !startTime || !endTime) {
    throw new Error("checkScheduleConflict: missing required fields");
  }

  const reqStart = toMinutes(startTime);
  const reqEnd = toMinutes(endTime);
  if (reqEnd <= reqStart) {
    throw new Error("checkScheduleConflict: end_time must be after start_time");
  }

  const conflicts: ScheduleConflict[] = [];

  let scheduleQuery = supabase
    .from("Schedule")
    .select("id, start_time, end_time, status, learner_id")
    .eq("instructor_id", instructorId)
    .eq("date", date)
    .not("status", "in", `(${FREE_STATUSES.join(",")})`);

  if (excludeScheduleId != null) {
    scheduleQuery = scheduleQuery.neq("id", excludeScheduleId);
  }

  const { data: rows, error: scheduleError } = await scheduleQuery;
  if (scheduleError) throw scheduleError;

  for (const row of rows ?? []) {
    if (!row.start_time || !row.end_time) continue;
    const rowStart = toMinutes(row.start_time);
    const rowEnd = toMinutes(row.end_time);
    if (rowStart < reqEnd && rowEnd > reqStart) {
      conflicts.push({ type: "overlap", schedule: row });
    }
  }

  const { data: instructor, error: instructorError } = await supabase
    .from("Instructor")
    .select("unavailability")
    .eq("id_instructor", instructorId)
    .single();

  if (instructorError) throw instructorError;

  const day = new Date(`${date}T00:00:00`);
  for (let m = reqStart; m < reqEnd; m += 15) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const unavailability = instructor?.unavailability;
    if (
      isTimeUnavailable(
        Array.isArray(unavailability) ? unavailability : null,
        day,
        h,
        min,
      )
    ) {
      conflicts.push({ type: "unavailability", at: `${pad(h)}:${pad(min)}` });
      break;
    }
  }

  return conflicts;
}

export function formatConflictMessage(conflicts: ScheduleConflict[]): string {
  if (conflicts.length === 0) return "";
  const parts: string[] = [];
  const overlaps = conflicts.filter((c) => c.type === "overlap");
  const blocks = conflicts.filter((c) => c.type === "unavailability");

  if (overlaps.length > 0) {
    const times = overlaps
      .map((c) =>
        c.type === "overlap"
          ? `${c.schedule.start_time.slice(0, 5)}–${c.schedule.end_time.slice(0, 5)}`
          : "",
      )
      .filter(Boolean)
      .join(", ");
    parts.push(`Instructor already booked: ${times}`);
  }
  if (blocks.length > 0) {
    parts.push(
      `Instructor marked unavailable at ${(blocks[0] as { at: string }).at}`,
    );
  }
  return parts.join(" • ");
}
