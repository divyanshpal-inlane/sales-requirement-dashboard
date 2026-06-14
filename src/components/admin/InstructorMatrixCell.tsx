import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { MatrixDay } from "@/queries/instructorMatrix";
import { utilizationStyle } from "@/utils/utilizationColor";

interface Props {
  day: MatrixDay;
  onClick?: () => void;
}

export function InstructorMatrixCell({ day, onClick }: Props) {
  const style = utilizationStyle(
    day.bookedHours,
    day.capacityHours,
    day.conflictCount,
  );
  const freeHours = Math.max(0, day.capacityHours - day.bookedHours);

  const inner = (() => {
    if (style.bucket === "off") {
      return (
        <>
          <span className="text-xs font-medium uppercase tracking-wide">
            Off
          </span>
          <span className="text-[10px] text-gray-500">no availability</span>
        </>
      );
    }
    return (
      <>
        <span className="text-sm font-semibold tabular-nums">
          {day.bookedHours.toFixed(0)} / {day.capacityHours}
        </span>
        <span className="text-[10px] tabular-nums">
          {style.bucket === "overbooked"
            ? `${day.conflictCount} conflict${day.conflictCount > 1 ? "s" : ""}`
            : `${freeHours.toFixed(0)}h free`}
        </span>
      </>
    );
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${day.weekday} ${day.dayOfMonth} — ${style.label}`}
      className={cn(
        "relative flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded border px-1 transition-all hover:scale-[1.03] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
        style.bg,
        style.text,
        style.border,
      )}
    >
      {style.bucket === "overbooked" && (
        <AlertTriangle className="absolute h-3 w-3" />
      )}
      {day.tentativeHours > 0 && (
        <span
          className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-purple-400"
          title={`${day.tentativeHours.toFixed(1)}h tentative (not counted)`}
        />
      )}
      {inner}
    </button>
  );
}
