import { addDays, endOfWeek, format, startOfWeek } from "date-fns";
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Clock,
  Moon,
  Plus,
  Repeat,
  Sun,
  Sunset,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { StepProps, Unavailability } from "../types";

// Time slot definitions
const TIME_SLOTS = [
  { id: "morning", label: "Morning", start: "06:00", end: "12:00", icon: Sun },
  {
    id: "afternoon",
    label: "Afternoon",
    start: "12:00",
    end: "17:00",
    icon: Sunset,
  },
  { id: "evening", label: "Evening", start: "17:00", end: "21:00", icon: Moon },
];

const DAYS_OF_WEEK = [
  { id: "monday", label: "Mon", fullLabel: "Monday" },
  { id: "tuesday", label: "Tue", fullLabel: "Tuesday" },
  { id: "wednesday", label: "Wed", fullLabel: "Wednesday" },
  { id: "thursday", label: "Thu", fullLabel: "Thursday" },
  { id: "friday", label: "Fri", fullLabel: "Friday" },
  { id: "saturday", label: "Sat", fullLabel: "Saturday" },
  { id: "sunday", label: "Sun", fullLabel: "Sunday" },
];

// Grid cell state type
interface GridCell {
  day: string;
  slot: string;
  blocked: boolean;
}

// Helper to format unavailability for display
function formatUnavailability(item: Unavailability): string {
  if (item.booked_date) {
    const date = format(new Date(item.booked_date), "MMM d, yyyy");
    if (item.all_day) return `${date} (All Day)`;
    return `${date} (${item.booked_start_time} - ${item.booked_end_time})`;
  }

  if (item.days_of_week && item.days_of_week.length > 0) {
    const days = item.days_of_week
      .map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3))
      .join(", ");
    if (item.all_day) return `Every ${days} (All Day)`;
    return `Every ${days} (${item.booked_start_time} - ${item.booked_end_time})`;
  }

  if (item.day_of_week) {
    const day =
      item.day_of_week.charAt(0).toUpperCase() + item.day_of_week.slice(1);
    if (item.all_day) return `Every ${day} (All Day)`;
    return `Every ${day} (${item.booked_start_time} - ${item.booked_end_time})`;
  }

  if (item.start_date && item.end_date) {
    const start = format(new Date(item.start_date), "MMM d");
    const end = format(new Date(item.end_date), "MMM d, yyyy");
    if (item.range_all_day) return `${start} - ${end} (All Day)`;
    return `${start} - ${end} (${item.range_start_time} - ${item.range_end_time})`;
  }

  return "Unknown period";
}

function getTypeIcon(item: Unavailability) {
  if (item.booked_date) return CalendarDays;
  if (item.days_of_week || item.day_of_week) return Repeat;
  if (item.start_date) return CalendarRange;
  return Calendar;
}

function getTypeBadge(item: Unavailability): string {
  if (item.type) {
    return item.type === "single"
      ? "One-time"
      : item.type === "recurring"
        ? "Weekly"
        : "Range";
  }
  if (item.booked_date) return "One-time";
  if (item.days_of_week || item.day_of_week) return "Weekly";
  if (item.start_date) return "Range";
  return "Unknown";
}

export function UnavailabilityStep({ data, updateData }: StepProps) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"quick" | "weekly" | "custom">(
    "quick",
  );

  // Weekly grid state - tracks which cells are selected
  const [weeklyGrid, setWeeklyGrid] = useState<Record<string, boolean>>({});

  // Custom form state
  const [customType, setCustomType] = useState<"single" | "range">("single");
  const [customDate, setCustomDate] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [customStartTime, setCustomStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");
  const [customAllDay, setCustomAllDay] = useState(true);
  const [customReason, setCustomReason] = useState("");

  // Add unavailability helper
  const addUnavailability = (item: Unavailability) => {
    updateData({ unavailability: [...data.unavailability, item] });
  };

  // Remove unavailability
  const removeUnavailability = (index: number) => {
    updateData({
      unavailability: data.unavailability.filter((_, i) => i !== index),
    });
  };

  // Quick preset handlers
  const handleQuickPreset = (preset: string) => {
    const today = new Date();

    switch (preset) {
      case "today":
        addUnavailability({
          type: "single",
          booked_date: format(today, "yyyy-MM-dd"),
          all_day: true,
          reason: "Blocked",
        });
        break;

      case "tomorrow":
        addUnavailability({
          type: "single",
          booked_date: format(addDays(today, 1), "yyyy-MM-dd"),
          all_day: true,
          reason: "Blocked",
        });
        break;

      case "this-week":
        addUnavailability({
          type: "range",
          start_date: format(
            startOfWeek(today, { weekStartsOn: 1 }),
            "yyyy-MM-dd",
          ),
          end_date: format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          range_all_day: true,
          reason: "Week Off",
        });
        break;

      case "weekends":
        addUnavailability({
          type: "recurring",
          days_of_week: ["saturday", "sunday"],
          all_day: true,
          reason: "Weekends Off",
        });
        break;

      case "mornings":
        addUnavailability({
          type: "recurring",
          days_of_week: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ],
          booked_start_time: "06:00",
          booked_end_time: "12:00",
          reason: "Mornings Blocked",
        });
        break;

      case "afternoons":
        addUnavailability({
          type: "recurring",
          days_of_week: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ],
          booked_start_time: "12:00",
          booked_end_time: "17:00",
          reason: "Afternoons Blocked",
        });
        break;

      case "evenings":
        addUnavailability({
          type: "recurring",
          days_of_week: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ],
          booked_start_time: "17:00",
          booked_end_time: "21:00",
          reason: "Evenings Blocked",
        });
        break;
    }
  };

  // Toggle grid cell
  const toggleGridCell = (day: string, slot: string) => {
    const key = `${day}-${slot}`;
    setWeeklyGrid((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Apply weekly grid as recurring blocks
  const applyWeeklyGrid = () => {
    // Group by time slot
    const slotGroups: Record<string, string[]> = {};

    Object.entries(weeklyGrid).forEach(([key, blocked]) => {
      if (!blocked) return;
      const [day, slot] = key.split("-");
      if (!slotGroups[slot]) slotGroups[slot] = [];
      slotGroups[slot].push(day);
    });

    // Create unavailability for each group
    Object.entries(slotGroups).forEach(([slot, days]) => {
      const timeSlot = TIME_SLOTS.find((s) => s.id === slot);
      if (!timeSlot || days.length === 0) return;

      addUnavailability({
        type: "recurring",
        days_of_week: days,
        booked_start_time: timeSlot.start,
        booked_end_time: timeSlot.end,
        reason: `${timeSlot.label} Block`,
      });
    });

    // Clear grid
    setWeeklyGrid({});
  };

  // Check if any grid cells are selected
  const hasGridSelection = Object.values(weeklyGrid).some(Boolean);

  // Handle custom form submit
  const handleCustomSubmit = () => {
    if (customType === "single" && customDate) {
      addUnavailability({
        type: "single",
        booked_date: customDate,
        all_day: customAllDay,
        booked_start_time: customAllDay ? undefined : customStartTime,
        booked_end_time: customAllDay ? undefined : customEndTime,
        reason: customReason || "Blocked",
      });
    } else if (customType === "range" && customStartDate && customEndDate) {
      addUnavailability({
        type: "range",
        start_date: customStartDate,
        end_date: customEndDate,
        range_all_day: customAllDay,
        range_start_time: customAllDay ? undefined : customStartTime,
        range_end_time: customAllDay ? undefined : customEndTime,
        reason: customReason || "Blocked",
      });
    }

    // Reset form
    setCustomDate("");
    setCustomStartDate("");
    setCustomEndDate("");
    setCustomStartTime("");
    setCustomEndTime("");
    setCustomAllDay(true);
    setCustomReason("");
  };

  // Count selected grid cells
  const selectedCellsCount = Object.values(weeklyGrid).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="mb-4 text-center">
        <h2 className="text-xl font-semibold">Availability Setup</h2>
        <p className="text-sm text-muted-foreground">
          Block times when the instructor is NOT available
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quick" className="text-xs">
            <Clock className="mr-1 h-3 w-3" />
            Quick Block
          </TabsTrigger>
          <TabsTrigger value="weekly" className="text-xs">
            <Repeat className="mr-1 h-3 w-3" />
            Weekly
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs">
            <Calendar className="mr-1 h-3 w-3" />
            Custom
          </TabsTrigger>
        </TabsList>

        {/* Quick Presets */}
        <TabsContent value="quick" className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickPreset("today")}
              className="justify-start"
            >
              <CalendarDays className="mr-2 h-4 w-4 text-red-500" />
              Block Today
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickPreset("tomorrow")}
              className="justify-start"
            >
              <CalendarDays className="mr-2 h-4 w-4 text-orange-500" />
              Block Tomorrow
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickPreset("this-week")}
              className="justify-start"
            >
              <CalendarRange className="mr-2 h-4 w-4 text-purple-500" />
              Block This Week
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickPreset("weekends")}
              className="justify-start"
            >
              <Repeat className="mr-2 h-4 w-4 text-blue-500" />
              Block Weekends
            </Button>
          </div>

          <div className="border-t pt-3">
            <p className="mb-2 text-xs text-muted-foreground">
              Block time of day (every day):
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickPreset("mornings")}
                className="h-auto flex-col py-2"
              >
                <Sun className="mb-1 h-4 w-4 text-yellow-500" />
                <span className="text-xs">Mornings</span>
                <span className="text-[10px] text-muted-foreground">
                  6AM-12PM
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickPreset("afternoons")}
                className="h-auto flex-col py-2"
              >
                <Sunset className="mb-1 h-4 w-4 text-orange-500" />
                <span className="text-xs">Afternoons</span>
                <span className="text-[10px] text-muted-foreground">
                  12PM-5PM
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickPreset("evenings")}
                className="h-auto flex-col py-2"
              >
                <Moon className="mb-1 h-4 w-4 text-indigo-500" />
                <span className="text-xs">Evenings</span>
                <span className="text-[10px] text-muted-foreground">
                  5PM-9PM
                </span>
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Weekly Grid */}
        <TabsContent value="weekly" className="mt-4">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Click cells to block recurring time slots:
            </p>

            {/* Grid Header */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="w-16 p-1"></th>
                    {DAYS_OF_WEEK.map((day) => (
                      <th key={day.id} className="p-1 text-center font-medium">
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((slot) => (
                    <tr key={slot.id}>
                      <td className="whitespace-nowrap p-1 text-right text-muted-foreground">
                        <div className="flex items-center justify-end gap-1">
                          <slot.icon className="h-3 w-3" />
                          <span>{slot.label}</span>
                        </div>
                        <div className="text-[10px]">
                          {slot.start}-{slot.end}
                        </div>
                      </td>
                      {DAYS_OF_WEEK.map((day) => {
                        const key = `${day.id}-${slot.id}`;
                        const isBlocked = weeklyGrid[key];
                        return (
                          <td key={day.id} className="p-1">
                            <button
                              type="button"
                              onClick={() => toggleGridCell(day.id, slot.id)}
                              className={cn(
                                "h-10 w-full rounded border-2 transition-all",
                                isBlocked
                                  ? "border-red-600 bg-red-500 text-white"
                                  : "border-gray-200 bg-gray-50 hover:border-red-300 hover:bg-red-50",
                              )}
                            >
                              {isBlocked && "X"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Apply Button */}
            {hasGridSelection && (
              <Button
                type="button"
                onClick={applyWeeklyGrid}
                className="w-full"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Apply {selectedCellsCount} Block(s)
              </Button>
            )}
          </div>
        </TabsContent>

        {/* Custom Date/Range */}
        <TabsContent value="custom" className="mt-4">
          <div className="space-y-4">
            {/* Type Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={customType === "single" ? "default" : "outline"}
                size="sm"
                onClick={() => setCustomType("single")}
                className="flex-1"
              >
                <CalendarDays className="mr-1 h-4 w-4" />
                Single Day
              </Button>
              <Button
                type="button"
                variant={customType === "range" ? "default" : "outline"}
                size="sm"
                onClick={() => setCustomType("range")}
                className="flex-1"
              >
                <CalendarRange className="mr-1 h-4 w-4" />
                Date Range
              </Button>
            </div>

            {/* Date Inputs */}
            {customType === "single" ? (
              <div className="space-y-2">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="h-9"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            )}

            {/* All Day Toggle */}
            <div className="flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={customAllDay}
                  onChange={(e) => setCustomAllDay(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">All Day</span>
              </label>

              {!customAllDay && (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Start"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="End"
                  />
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <Label className="text-xs">Reason (optional)</Label>
              <Input
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="e.g., Personal, Holiday, Training..."
                className="h-9"
              />
            </div>

            {/* Add Button */}
            <Button
              type="button"
              onClick={handleCustomSubmit}
              disabled={
                customType === "single"
                  ? !customDate
                  : !customStartDate || !customEndDate
              }
              className="w-full"
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Block
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Blocked Periods List */}
      <Collapsible defaultOpen={data.unavailability.length > 0}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-auto w-full items-center justify-between p-2"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Blocked Periods
              {data.unavailability.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {data.unavailability.length}
                </Badge>
              )}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {data.unavailability.length > 0 ? (
            <div className="mt-2 space-y-2">
              {data.unavailability.map((item, index) => {
                const Icon = getTypeIcon(item);
                return (
                  <Card key={index} className="border-red-100 bg-red-50">
                    <CardContent className="flex items-center justify-between px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-red-500" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {formatUnavailability(item)}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="h-4 px-1 text-[10px]"
                            >
                              {getTypeBadge(item)}
                            </Badge>
                            {item.reason && (
                              <span className="truncate text-[10px] text-muted-foreground">
                                {item.reason}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeUnavailability(index)}
                        className="h-8 w-8 shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              <Calendar className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">No blocked periods yet</p>
              <p className="text-xs">
                Use the options above to block time slots
              </p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
