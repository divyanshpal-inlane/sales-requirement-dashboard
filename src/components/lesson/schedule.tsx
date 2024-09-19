import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/context/auth-context";

interface LearnerScheduleSelectorProps {
  learnerId: string;
  learnerArea: string | null;
  totalTime: number;
  courseId: string;
  lessonIds: string[];
}

interface TimeSlot {
  date: Date;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  selectedDuration: number;
  availableInstructors: string[];
}

const timeSlots = [
  { start: "06:00:00", end: "09:00:00", label: "6 AM - 9 AM" },
  { start: "09:00:00", end: "12:00:00", label: "9 AM - 12 PM" },
  { start: "12:00:00", end: "15:00:00", label: "12 PM - 3 PM" },
  { start: "15:00:00", end: "18:00:00", label: "3 PM - 6 PM" },
  { start: "18:00:00", end: "21:00:00", label: "6 PM - 9 PM" },
];

const LearnerScheduleSelector: React.FC<LearnerScheduleSelectorProps> = ({
  learnerId,
  learnerArea,
  totalTime,
  courseId,
  lessonIds,
}) => {
  const [startDate, setStartDate] = useState(addDays(new Date(), 1));
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch schedules for the next 14 days
  const { data: schedules, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ["schedules", startDate],
    queryFn: async () => {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 13);

      const { data, error } = await supabase
        .from("Schedule")
        .select("*")
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0]);

      if (error) throw error;
      return data;
    },
  });

  // Fetch instructors for the learner's area
  const { data: instructors, isLoading: isLoadingInstructors } = useQuery({
    queryKey: ["instructors", learnerArea],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Instructor")
        .select("*")
        .contains("areas", [learnerArea]);

      if (error) throw error;
      return data;
    },
  });

  const { mutate } = useMutation({
    mutationFn: async (slots: TimeSlot[]) => {
      const bookings = slots.flatMap((slot) => {
        const bookingHours = slot.selectedDuration === 2 ? [0, 1] : [0];
        return bookingHours.map((hour, index) => ({
          learner_id: learnerId,
          instructor_id: slot.availableInstructors[0],
          date: slot.date.toISOString().split("T")[0],
          start_time: addHours(slot.startTime, hour),
          end_time: addHours(slot.startTime, hour + 1),
          course_id: courseId,
          lesson_id: lessonIds[index],
          status: "booked",
        }));
      });

      const { data, error } = await supabase.from("Schedule").upsert(bookings);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["schedule"],
      });
    },
  });

  const checkSlotAvailability = useCallback(
    (date: Date, startTime: string, endTime: string) => {
      if (!schedules || !instructors)
        return { isAvailable: false, availableInstructors: [] };

      const relevantSchedules = schedules.filter(
        (s) =>
          s.date === date.toISOString().split("T")[0] &&
          s.start_time >= startTime &&
          s.end_time <= endTime,
      );

      const availableInstructors = instructors
        .filter((instructor) => {
          const instructorSchedules = relevantSchedules.filter(
            (s) => s.instructor_id === instructor.id_instructor,
          );
          return instructorSchedules.length === 0;
        })
        .map((instructor) => instructor.id_instructor);

      return {
        isAvailable: availableInstructors.length > 0,
        availableInstructors,
      };
    },
    [schedules, instructors],
  );

  useEffect(() => {
    if (schedules && instructors) {
      const newSlots: TimeSlot[] = [];
      for (let i = 0; i < 14; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        timeSlots.forEach((slot) => {
          const { isAvailable, availableInstructors } = checkSlotAvailability(
            currentDate,
            slot.start,
            slot.end,
          );
          newSlots.push({
            date: currentDate,
            startTime: slot.start,
            endTime: slot.end,
            isAvailable,
            selectedDuration: 0,
            availableInstructors,
          });
        });
      }
      setSelectedSlots(newSlots);
    }
  }, [schedules, instructors, startDate, checkSlotAvailability]);

  const handleSlotClick = (clickedSlot: TimeSlot) => {
    if (!clickedSlot.isAvailable) return;

    const updatedSlots = selectedSlots.map((slot) => {
      if (
        slot.date.getTime() === clickedSlot.date.getTime() &&
        slot.startTime === clickedSlot.startTime
      ) {
        return {
          ...slot,
          selectedDuration: slot.selectedDuration === 0 ? 1 : 0,
        };
      }
      return slot;
    });

    const daySlots = updatedSlots.filter(
      (slot) =>
        slot.date.getTime() === clickedSlot.date.getTime() &&
        slot.selectedDuration > 0,
    );

    if (daySlots.length > 2) {
      alert("You can only select up to 2 slots per day.");
      return;
    }

    if (daySlots.length === 2) {
      const sortedSlots = daySlots.sort((a, b) =>
        a.startTime.localeCompare(b.startTime),
      );
      if (sortedSlots[0].startTime === addHours(sortedSlots[1].startTime, -3)) {
        alert("You cannot select consecutive slots.");
        return;
      }
    }

    const totalSelectedHours = updatedSlots.reduce(
      (sum, slot) => sum + slot.selectedDuration,
      0,
    );
    if (totalSelectedHours > totalTime) {
      alert(
        `You can only select up to ${totalTime} hours of lessons in total.`,
      );
      return;
    }

    setSelectedSlots(updatedSlots);
  };

  const handleDurationChange = (clickedSlot: TimeSlot, duration: number) => {
    const updatedSlots = selectedSlots.map((slot) => {
      if (
        slot.date.getTime() === clickedSlot.date.getTime() &&
        slot.startTime === clickedSlot.startTime
      ) {
        return { ...slot, selectedDuration: duration };
      }
      return slot;
    });

    const totalSelectedHours = updatedSlots.reduce(
      (sum, slot) => sum + slot.selectedDuration,
      0,
    );
    if (totalSelectedHours > totalTime) {
      alert(
        `You can only select up to ${totalTime} hours of lessons in total.`,
      );
      return;
    }

    setSelectedSlots(updatedSlots);
  };

  const handleBookSlots = () => {
    const slotsToBook = selectedSlots.filter(
      (slot) => slot.selectedDuration > 0,
    );
    if (slotsToBook.length === 0) {
      alert("Please select at least one slot to book.");
      return;
    }

    mutate(slotsToBook, {
      onSuccess: () => {
        navigate("/createSchedule/uploadLL");
      },
      onError: (error) => {
        alert("Error booking slots: " + error.message);
      },
    });
  };

  const addHours = (timeString: string, hours: number) => {
    const [h, m, s] = timeString.split(":").map(Number);
    const date = new Date(2000, 0, 1, h, m, s);
    date.setHours(date.getHours() + hours);
    return date.toTimeString().slice(0, 8);
  };

  const handleDateChange = (direction: "left" | "right") => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + (direction === "left" ? -7 : 7));
    setStartDate(newDate);
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between">
        <Button onClick={() => handleDateChange("left")}>
          <ChevronLeft />
        </Button>
        <Button onClick={() => handleDateChange("right")}>
          <ChevronRight />
        </Button>
      </div>
      <ScrollArea className="w-full whitespace-nowrap rounded-md">
        <div className="flex">
          {[...Array(14)].map((_, dayOffset) => {
            const currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() + dayOffset);
            return (
              <Card key={dayOffset} className="m-2 w-64 flex-shrink-0">
                <CardHeader className="p-2">
                  <CardTitle className="text-sm">
                    {currentDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-1">
                  {timeSlots.map((time) => {
                    const slot = selectedSlots.find(
                      (s) =>
                        s.date.getTime() === currentDate.getTime() &&
                        s.startTime === time.start,
                    );
                    return (
                      <TooltipProvider key={time.start}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="mb-1 flex items-center">
                              <Button
                                variant={
                                  slot?.selectedDuration ? "default" : "outline"
                                }
                                className={`flex-grow p-1 text-xs ${!slot?.isAvailable ? "cursor-not-allowed opacity-50" : ""}`}
                                onClick={() => slot && handleSlotClick(slot)}
                                disabled={!slot?.isAvailable}
                              >
                                {time.label}{" "}
                                {slot?.selectedDuration
                                  ? `(${slot.selectedDuration}h)`
                                  : ""}
                              </Button>
                              {slot && slot.selectedDuration > 0 && (
                                <div className="ml-1">
                                  <Button
                                    size="sm"
                                    variant={
                                      slot.selectedDuration === 1
                                        ? "default"
                                        : "outline"
                                    }
                                    className="px-2 py-1 text-xs"
                                    onClick={() =>
                                      handleDurationChange(slot, 1)
                                    }
                                  >
                                    1h
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={
                                      slot.selectedDuration === 2
                                        ? "default"
                                        : "outline"
                                    }
                                    className="ml-1 px-2 py-1 text-xs"
                                    onClick={() =>
                                      handleDurationChange(slot, 2)
                                    }
                                  >
                                    2h
                                  </Button>
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {slot?.isAvailable
                              ? `Available Instructors: ${slot.availableInstructors.length}`
                              : "No instructors available"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="mt-4">
        <Button
          onClick={handleBookSlots}
          disabled={
            selectedSlots.filter((s) => s.selectedDuration > 0).length === 0
          }
          className="w-full"
        >
          Book Selected Slots (
          {selectedSlots.reduce((sum, slot) => sum + slot.selectedDuration, 0)}{" "}
          hours)
        </Button>
      </div>
      {isLoadingSchedules || isLoadingInstructors ? (
        <Alert className="mt-4">
          <AlertTitle>Loading</AlertTitle>
          <AlertDescription>
            Please wait while we fetch the available schedules.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
};

export default LearnerScheduleSelector;
