import { ExternalLink, Phone } from "lucide-react";
import { Fragment } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  MATRIX_DAY_END_HOUR,
  MATRIX_DAY_START_HOUR,
  MatrixRow,
  MatrixSchedule,
  MatrixSlot,
} from "@/queries/instructorMatrix";

interface Props {
  row: MatrixRow | null;
  onOpenChange: (open: boolean) => void;
}

const enrollmentBadge: Record<string, string> = {
  course: "bg-emerald-100 text-emerald-900 border-emerald-300",
  demo: "bg-blue-100 text-blue-900 border-blue-300",
  topup: "bg-teal-100 text-teal-900 border-teal-300",
  tentative: "bg-purple-100 text-purple-900 border-purple-300",
};

const slotBg: Record<MatrixSlot["status"], string> = {
  free: "bg-white text-gray-500 border-gray-200",
  booked: "bg-red-200 text-red-900 border-red-300",
  unavailable: "bg-gray-200 text-gray-600 border-gray-300",
  conflict: "bg-yellow-300 text-yellow-900 border-yellow-500",
};

function formatHour(h: number) {
  const next = (h + 1) % 24;
  return `${String(h).padStart(2, "0")}–${String(next).padStart(2, "0")}`;
}

function SlotContent({ slot }: { slot: MatrixSlot }) {
  if (slot.status === "free")
    return <span className="text-[10px] italic">free</span>;
  if (slot.status === "unavailable")
    return <span className="text-[10px]">unavail</span>;
  const s = slot.schedules[0];
  if (!s) return <span className="text-[10px]">—</span>;
  return (
    <div className="flex flex-col items-start leading-tight">
      <span className="truncate text-[11px] font-medium">
        {s.learnerName ?? "Learner"}
      </span>
      <span className="text-[10px] opacity-75">
        {s.lessonNumber != null ? `L${s.lessonNumber}` : "—"}
        {s.enrollmentType ? ` · ${s.enrollmentType}` : ""}
      </span>
    </div>
  );
}

function ScheduleDetail({ s }: { s: MatrixSchedule }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{s.learnerName ?? "Learner"}</span>
        {s.enrollmentType && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              enrollmentBadge[s.enrollmentType] ?? "",
            )}
          >
            {s.enrollmentType}
          </Badge>
        )}
      </div>
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <span>
          {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
        </span>
        <span>
          {s.lessonNumber != null ? `Lesson ${s.lessonNumber}` : "No lesson #"}{" "}
          {s.status ? `· ${s.status}` : ""}
        </span>
        {s.learnerPhone && (
          <a
            href={`tel:${s.learnerPhone}`}
            className="flex items-center gap-1 text-foreground hover:underline"
          >
            <Phone className="h-3 w-3" /> {s.learnerPhone}
          </a>
        )}
      </div>
      <Link
        to="/admin/schedules"
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        Open in Schedule Management <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

export function InstructorMatrixDrawer({ row, onOpenChange }: Props) {
  const open = !!row;
  const hours: number[] = [];
  for (let h = MATRIX_DAY_START_HOUR; h < MATRIX_DAY_END_HOUR; h++)
    hours.push(h);

  const utilizationPct =
    row && row.weekCapacityHours > 0
      ? Math.round((row.weekBookedHours / row.weekCapacityHours) * 100)
      : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-none sm:max-w-3xl lg:max-w-4xl"
      >
        {row && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {row.instructor.name}
                {row.weekConflictCount > 0 && (
                  <Badge
                    variant="outline"
                    className="border-yellow-500 bg-yellow-300 text-[10px] text-yellow-900"
                  >
                    {row.weekConflictCount} conflict
                    {row.weekConflictCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-3">
                {row.instructor.phone && (
                  <a
                    href={`tel:${row.instructor.phone}`}
                    className="flex items-center gap-1 hover:underline"
                  >
                    <Phone className="h-3 w-3" /> {row.instructor.phone}
                  </a>
                )}
                <span>
                  <span className="font-medium tabular-nums text-foreground">
                    {row.weekBookedHours.toFixed(0)}
                  </span>{" "}
                  booked /
                  <span className="font-medium tabular-nums text-foreground">
                    {" "}
                    {row.weekCapacityHours}
                  </span>{" "}
                  free hrs · {utilizationPct}%
                </span>
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="mt-4 h-[calc(100vh-9rem)] pr-2">
              <div
                className="grid gap-1 text-xs"
                style={{
                  gridTemplateColumns: `4rem repeat(7, minmax(0, 1fr))`,
                }}
              >
                <div />
                {row.days.map((d) => (
                  <div
                    key={d.date}
                    className="px-1 pb-1 text-center text-[11px] font-medium text-muted-foreground"
                  >
                    {d.weekday} {d.dayOfMonth}
                    <div className="text-[10px] font-normal tabular-nums">
                      {d.bookedHours.toFixed(0)}/{d.capacityHours}h
                    </div>
                  </div>
                ))}

                {hours.map((h) => (
                  <Fragment key={`row-${h}`}>
                    <div className="flex items-center justify-end pr-2 text-[10px] tabular-nums text-muted-foreground">
                      {formatHour(h)}
                    </div>
                    {row.days.map((d) => {
                      const slot = d.slots.find((s) => s.hour === h);
                      if (!slot) return <div key={`${d.date}-${h}`} />;
                      const cellInner = (
                        <button
                          type="button"
                          className={cn(
                            "flex h-12 w-full items-start justify-start rounded border px-1 py-1 text-left transition-colors",
                            slotBg[slot.status],
                            slot.status === "booked" ||
                              slot.status === "conflict"
                              ? "hover:brightness-95"
                              : "cursor-default",
                          )}
                        >
                          <SlotContent slot={slot} />
                        </button>
                      );

                      if (
                        slot.status !== "booked" &&
                        slot.status !== "conflict"
                      ) {
                        return <div key={`${d.date}-${h}`}>{cellInner}</div>;
                      }

                      return (
                        <Popover key={`${d.date}-${h}`}>
                          <PopoverTrigger asChild>{cellInner}</PopoverTrigger>
                          <PopoverContent className="w-72">
                            <div className="space-y-3">
                              {slot.schedules.map((s) => (
                                <ScheduleDetail key={s.id} s={s} />
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
