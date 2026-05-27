import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  Loader2,
  RefreshCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAllInstructorsForAssignment } from "@/queries/kam";
import {
  defaultExportFilename,
  downloadCSV,
  lessonsToCSV,
  plusDaysYmd,
  todayYmd,
  tomorrowYmd,
  useAllKAMsForFilter,
  useLessonsDashboard,
} from "@/queries/lessonsDashboard";

type DatePreset = "today" | "tomorrow" | "next7" | "custom";

const STATUS_OPTIONS: { key: string; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "paused", label: "Paused" },
  { key: "pending_payment", label: "Pending payment" },
];

const enrollmentBadgeClass: Record<string, string> = {
  course: "bg-emerald-100 text-emerald-900 border-emerald-300",
  demo: "bg-blue-100 text-blue-900 border-blue-300",
  topup: "bg-teal-100 text-teal-900 border-teal-300",
};

const statusBadgeClass: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-900 border-emerald-300",
  completed: "bg-gray-100 text-gray-800 border-gray-300",
  paused: "bg-amber-100 text-amber-900 border-amber-300",
  pending_payment: "bg-purple-100 text-purple-900 border-purple-300",
  cancelled: "bg-red-100 text-red-900 border-red-300",
};

export default function LessonsDashboard() {
  const [preset, setPreset] = useState<DatePreset>("today");
  const [customFrom, setCustomFrom] = useState<string>(todayYmd());
  const [customTo, setCustomTo] = useState<string>(plusDaysYmd(7));

  const { from, to } = useMemo(() => {
    switch (preset) {
      case "today":
        return { from: todayYmd(), to: todayYmd() };
      case "tomorrow":
        return { from: tomorrowYmd(), to: tomorrowYmd() };
      case "next7":
        return { from: todayYmd(), to: plusDaysYmd(6) };
      case "custom":
        return { from: customFrom, to: customTo };
    }
  }, [preset, customFrom, customTo]);

  const [selectedKamIds, setSelectedKamIds] = useState<string[]>([]);
  const [selectedInstructorIds, setSelectedInstructorIds] = useState<string[]>(
    [],
  );
  const [classNumbersInput, setClassNumbersInput] = useState("");
  const [statuses, setStatuses] = useState<string[]>([
    "active",
    "completed",
    "paused",
    "pending_payment",
  ]);
  const [search, setSearch] = useState("");

  const classNumbers = useMemo(() => {
    return classNumbersInput
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => Number(p))
      .filter((n) => Number.isFinite(n) && n > 0);
  }, [classNumbersInput]);

  const {
    data: rows,
    isLoading,
    isFetching,
    refetch,
  } = useLessonsDashboard({
    from,
    to,
    kamIds: selectedKamIds,
    instructorIds: selectedInstructorIds,
    classNumbers,
    statuses,
    search,
  });

  const { data: kams } = useAllKAMsForFilter();
  const { data: instructors } = useAllInstructorsForAssignment();

  const handleExport = () => {
    if (!rows || rows.length === 0) return;
    const csv = lessonsToCSV(rows);
    downloadCSV(defaultExportFilename(from, to), csv);
  };

  const dateLabel =
    from === to
      ? format(parseISO(from), "EEE d MMM yyyy")
      : `${format(parseISO(from), "EEE d MMM")} – ${format(
          parseISO(to),
          "EEE d MMM yyyy",
        )}`;

  const clearFilters = () => {
    setSelectedKamIds([]);
    setSelectedInstructorIds([]);
    setClassNumbersInput("");
    setStatuses(["active", "completed", "paused", "pending_payment"]);
    setSearch("");
  };

  const filterCount =
    (selectedKamIds.length > 0 ? 1 : 0) +
    (selectedInstructorIds.length > 0 ? 1 : 0) +
    (classNumbers.length > 0 ? 1 : 0) +
    (statuses.length < STATUS_OPTIONS.length ? 1 : 0) +
    (search.trim() ? 1 : 0);

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Lessons Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Consolidated ops view of all scheduled lessons.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="mr-1 h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={!rows || rows.length === 0}
            >
              <Download className="mr-1 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-3">
            {/* Date preset buttons */}
            <div className="flex items-center gap-1 rounded-md border bg-background p-1">
              {(
                [
                  ["today", "Today"],
                  ["tomorrow", "Tomorrow"],
                  ["next7", "Next 7d"],
                  ["custom", "Custom"],
                ] as [DatePreset, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPreset(k)}
                  className={cn(
                    "rounded px-2 py-1 text-xs font-medium transition-colors",
                    preset === k
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {preset === "custom" && (
              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 w-[10.5rem]"
                />
                <span className="text-xs text-muted-foreground">→</span>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 w-[10.5rem]"
                />
              </div>
            )}

            <span className="ml-1 text-xs font-medium">{dateLabel}</span>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <MultiSelectPopover
                label="KAM"
                options={(kams ?? []).map((k) => ({
                  value: k.id,
                  label: k.name,
                }))}
                selected={selectedKamIds}
                onChange={setSelectedKamIds}
              />
              <MultiSelectPopover
                label="Instructor"
                options={(instructors ?? []).map((i) => ({
                  value: i.id_instructor,
                  label: i.name ?? "(unnamed)",
                }))}
                selected={selectedInstructorIds}
                onChange={setSelectedInstructorIds}
              />
              <div className="relative">
                <Input
                  placeholder="Class # (e.g. 1, 2, 3)"
                  value={classNumbersInput}
                  onChange={(e) => setClassNumbersInput(e.target.value)}
                  className="h-8 w-48"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Customer name / phone"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 w-56 pl-8"
                />
              </div>
            </div>
          </CardContent>

          {/* Status chips row */}
          <CardContent className="flex flex-wrap items-center gap-2 border-t p-3 pt-2">
            <Label className="text-xs text-muted-foreground">Status:</Label>
            {STATUS_OPTIONS.map((opt) => {
              const on = statuses.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() =>
                    setStatuses((prev) =>
                      prev.includes(opt.key)
                        ? prev.filter((s) => s !== opt.key)
                        : [...prev, opt.key],
                    )
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                    on
                      ? (statusBadgeClass[opt.key] ?? "bg-muted")
                      : "border-dashed text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
            {filterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-auto h-7 text-xs"
              >
                <X className="mr-1 h-3 w-3" />
                Clear filters ({filterCount})
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Result count + table */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b p-3 text-xs text-muted-foreground">
              <span>
                {isLoading
                  ? "Loading…"
                  : `Showing ${rows?.length ?? 0} lesson${
                      (rows?.length ?? 0) === 1 ? "" : "s"
                    }`}
              </span>
              {rows && rows.length > 200 && (
                <span className="text-amber-600">
                  Tip: narrow the date range or filters for faster export.
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !rows || rows.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No lessons match the current filters.
              </div>
            ) : (
              <ScrollArea className="max-h-[70vh]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/60 text-xs font-medium text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Time</th>
                      <th className="px-3 py-2 text-left">Customer</th>
                      <th className="px-3 py-2 text-left">Class</th>
                      <th className="px-3 py-2 text-left">Instructor</th>
                      <th className="px-3 py-2 text-left">Vehicle</th>
                      <th className="px-3 py-2 text-left">KAM</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Pickup</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r) => (
                      <tr key={r.scheduleId} className="hover:bg-muted/30">
                        <td className="px-3 py-2 tabular-nums">
                          {format(parseISO(r.date), "d MMM")}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {r.startTime}–{r.endTime}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {r.customerName ?? "—"}
                            </span>
                            {r.customerPhone && (
                              <span className="text-[11px] text-muted-foreground">
                                {r.customerPhone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">
                              {r.classNumber != null
                                ? `L${r.classNumber}`
                                : "—"}
                            </span>
                            {r.enrollmentType && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px]",
                                  enrollmentBadgeClass[r.enrollmentType] ?? "",
                                )}
                              >
                                {r.enrollmentType}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span>{r.instructorName ?? "—"}</span>
                            {r.instructorPhone && (
                              <span className="text-[11px] text-muted-foreground">
                                {r.instructorPhone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.vehicle ?? "—"}
                        </td>
                        <td className="px-3 py-2">{r.kamName ?? "—"}</td>
                        <td className="px-3 py-2">
                          {r.status && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                statusBadgeClass[r.status] ?? "",
                              )}
                            >
                              {r.status.replace("_", " ")}
                            </Badge>
                          )}
                        </td>
                        <td className="max-w-[14rem] px-3 py-2 text-muted-foreground">
                          <span className="line-clamp-2">
                            {r.pickupLocation ?? "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MultiSelectPopover({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
          <Users className="h-3.5 w-3.5" />
          {label}
          {selected.length > 0 ? (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {selected.length}
            </Badge>
          ) : null}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${label.toLowerCase()}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              {selected.length} selected
            </span>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-primary hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <ScrollArea className="max-h-56 rounded border">
            {filtered.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">
                No matches.
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((o) => {
                  const on = selected.includes(o.value);
                  return (
                    <label
                      key={o.value}
                      className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(o.value)}
                      />
                      <span>{o.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
