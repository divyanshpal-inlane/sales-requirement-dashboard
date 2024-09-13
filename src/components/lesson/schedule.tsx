import { format, isSameDay, setHours, setMinutes, startOfDay } from "date-fns";
import React, { useState } from "react";

import { DatePickerDemo } from "@/components/date-picker";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TimeSlot {
  start: Date;
  end: Date;
  isBlocked: boolean;
}

export interface SelectedSlot {
  date: Date;
  slots: TimeSlot[];
}

const CELL_SIZE = "w-10 h-10";

const CalendarTimeSlotSelector: React.FC = ({
  blockedSlots,
  days,
  hours,
}: {
  blockedSlots: any;
  days: any;
  hours: any;
}) => {
  const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()));
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);

  const isSlotBlocked = (date: Date, hour: number): boolean => {
    const key = `${format(date, "yyyy-MM-dd")}-${hour}`;
    return blockedSlots[key];
  };

  const isSlotSelected = (date: Date, hour: number): boolean => {
    return selectedSlots.some(
      (s) =>
        isSameDay(s.date, date) &&
        s.slots.some((slot) => slot.start.getHours() === hour),
    );
  };

  const handleSlotSelection = (date: Date, hour: number) => {
    if (isSlotBlocked(date, hour)) return;

    const slotStart = setMinutes(setHours(date, hour), 0);
    const slotEnd = setMinutes(setHours(date, hour + 1), 0);
    const newSlot: TimeSlot = {
      start: slotStart,
      end: slotEnd,
      isBlocked: false,
    };

    const existingSelection = selectedSlots.find((s) =>
      isSameDay(s.date, date),
    );
    let updatedSelection: SelectedSlot[];

    if (existingSelection) {
      const updatedSlots = [...existingSelection.slots, newSlot].sort(
        (a, b) => a.start.getTime() - b.start.getTime(),
      );

      if (
        updatedSlots.length > 2 &&
        (updatedSlots[2].start.getTime() - updatedSlots[0].start.getTime() >
          2 * 60 * 60 * 1000 ||
          updatedSlots.length > 4)
      ) {
        return;
      }

      updatedSelection = selectedSlots.map((s) =>
        isSameDay(s.date, date) ? { ...s, slots: updatedSlots } : s,
      );
    } else {
      updatedSelection = [...selectedSlots, { date, slots: [newSlot] }];
    }

    const totalHours = updatedSelection.reduce(
      (sum, day) => sum + day.slots.length,
      0,
    );
    if (totalHours <= 10) {
      setSelectedSlots(updatedSelection);
    }
  };

  const getTotalSelectedHours = (): number => {
    return selectedSlots.reduce((sum, day) => sum + day.slots.length, 0);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col justify-center gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="startDate">Start date</Label>
          <DatePickerDemo />
        </div>

        <div className="flex">
          <ScrollArea className="flex h-[600px] w-0 grow rounded-md border border-border p-2">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr>
                  <th
                    className={`${CELL_SIZE} sticky left-0 top-0 z-20 w-12 bg-white p-1`}
                  ></th>
                  {days.map((day, index) => (
                    <th
                      key={index}
                      className={`${CELL_SIZE} sticky top-0 z-10 border-b bg-white p-1 text-center text-sm font-normal`}
                    >
                      <p>{format(day, "d")}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map((hour) => (
                  <tr key={hour}>
                    <td
                      className={`${CELL_SIZE} sticky left-0 z-10 w-16 bg-white p-1 text-center text-xs`}
                    >
                      {format(setHours(new Date(), hour), "h a")}
                    </td>
                    {days.map((day, dayIndex) => {
                      const isBlocked = isSlotBlocked(day, hour);
                      const isSelected = isSlotSelected(day, hour);
                      return (
                        <td
                          key={dayIndex}
                          className={`${CELL_SIZE} border p-0`}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                onClick={() => handleSlotSelection(day, hour)}
                                className={`h-full w-full cursor-pointer transition-colors duration-200 ${
                                  isBlocked
                                    ? "cursor-not-allowed bg-red-100"
                                    : isSelected
                                      ? "bg-green-200 hover:bg-green-300"
                                      : "bg-white hover:bg-gray-100"
                                }`}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              {isBlocked
                                ? "Blocked"
                                : isSelected
                                  ? "Selected"
                                  : "Available"}
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <Badge variant="secondary" className="w-fit text-lg">
          Total Selected Hours: {getTotalSelectedHours()} / 10
        </Badge>
      </div>
    </TooltipProvider>
  );
};

export default CalendarTimeSlotSelector;
