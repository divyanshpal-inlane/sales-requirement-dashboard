import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
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
import { supabase } from "@/lib/supabaseClient";
import { generateRandomOTP } from "@/lib/utils";

interface LearnerScheduleSelectorProps {
  learnerId: string;
  learnerArea: string | null;
  totalTime: number;
  courseId: string;
  lessonIds: string[];
  startFromLessonId?: string;
  isRescheduling?: boolean;
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

const addHours = (timeString: string, hours: number) => {
  const [h, m, s] = timeString.split(":").map(Number);
  const date = new Date(2000, 0, 1, h, m, s);
  date.setHours(date.getHours() + hours);
  return date.toTimeString().slice(0, 8);
};

const LearnerScheduleSelector: React.FC<LearnerScheduleSelectorProps> = ({
  learnerId,
  learnerArea,
  totalTime,
  courseId,
  lessonIds,
  startFromLessonId,
  isRescheduling = false,
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

  // Add query to fetch existing schedules for the learner
  const { data: existingSchedules } = useQuery({
    queryKey: ["existingSchedules", learnerId, courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Schedule")
        .select("*, instructor:instructor_id(*)")
        .eq("learner_id", learnerId)
        .eq("course_id", courseId)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Modify the mutation to handle rescheduling
  const { mutate } = useMutation({
    mutationFn: async (slots: TimeSlot[]) => {
      // If rescheduling, get the existing instructor assignments
      const existingInstructorMap: Record<string, string> = {};
      if (isRescheduling && existingSchedules) {
        existingSchedules.forEach((schedule) => {
          if (schedule.lesson_id && lessonIds.includes(schedule.lesson_id)) {
            existingInstructorMap[schedule.lesson_id] =
              schedule.instructor_id || "";
          }
        });
      }

      // Sort slots by date and time to ensure lessons are assigned in chronological order
      const sortedSlots = [...slots].sort((a, b) => {
        const dateCompare = a.date.getTime() - b.date.getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });

      let lessonIndex = 0;
      const bookings = [];

      // Process each slot in chronological order
      for (const slot of sortedSlots) {
        if (slot.selectedDuration === 0) continue;

        const bookingHours = slot.selectedDuration === 2 ? [0, 1] : [0];
        const instructorId = slot.availableInstructors[0];

        for (const hour of bookingHours) {
          const currentLessonId = lessonIds[lessonIndex];
          if (!currentLessonId) continue; // Skip if we've run out of lessons

          const bookingInstructorId = isRescheduling
            ? existingInstructorMap[currentLessonId] || instructorId
            : instructorId;

          const otp = generateRandomOTP();
          console.log("Generated OTP:", otp);

          bookings.push({
            learner_id: learnerId,
            instructor_id: bookingInstructorId,
            date: slot.date.toISOString().split("T")[0],
            start_time: addHours(slot.startTime, hour),
            end_time: addHours(slot.startTime, hour + 1),
            course_id: courseId,
            lesson_id: currentLessonId,
            status: "booked",
            otp: otp,
          });

          lessonIndex++;
        }
      }

      if (isRescheduling && startFromLessonId) {
        // Delete existing schedules for the lessons being rescheduled
        const { error: deleteError } = await supabase
          .from("Schedule")
          .delete()
          .eq("learner_id", learnerId)
          .eq("course_id", courseId)
          .in("lesson_id", lessonIds);

        if (deleteError) throw deleteError;
      }

      const { data, error } = await supabase.from("Schedule").upsert(bookings);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["schedule"],
      });
      navigate(isRescheduling ? `/lesson/${startFromLessonId}` : "/home");
    },
  });

  const checkSlotAvailability = useCallback(
    (date: Date, startTime: string, endTime: string) => {
      console.log("checkSlotAvail start", date);

      if (!schedules || !instructors)
        return { isAvailable: false, availableInstructors: [] };

      const dateStr = date.toISOString().split("T")[0];

      // Filter schedules for this time slot, excluding the learner's own bookings that are being rescheduled
      const relevantSchedules = schedules.filter((s) => {
        const isInTimeRange =
          s.date === dateStr &&
          s.start_time >= startTime &&
          s.end_time <= endTime &&
          !s.isTentative;

        // If this is a reschedule operation, exclude the learner's own bookings that are being rescheduled
        if (
          isRescheduling &&
          s.learner_id === learnerId &&
          s.lesson_id &&
          lessonIds.includes(s.lesson_id) &&
          !s.isTentative
        ) {
          return false;
        }
        
        return isInTimeRange;
      });
      console.log("Relevant schedules for the current slots", relevantSchedules);

      console.log("Before filtering, available instructors", availableInstructors);

      // Find instructors which do not have any other confirmed booking, on the same slot
      // but include instructors who have tentative schedule
      const availableInstructors = instructors
        .filter((instructor) => {
          const instructorSchedules = relevantSchedules.filter(
            (s) => (s.instructor_id === instructor.id_instructor) && (!s.isTentative),
          );
          return instructorSchedules.length === 0;
        })
        .map((instructor) => instructor.id_instructor);

      console.log("After filtering, available instructors", availableInstructors);
      return {
        isAvailable: availableInstructors.length > 0,
        availableInstructors,
      };
    },
    [schedules, instructors, isRescheduling, learnerId, lessonIds],
  );

  useEffect(() => {
    if (schedules && instructors && existingSchedules) {
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

          const currentDateStr = currentDate.toISOString().split("T")[0];

          // Find all bookings that fall within this time slot's range
          const slotBookings = existingSchedules.filter(
            (s) =>
              s.date === currentDateStr &&
              s.start_time >= slot.start &&
              s.start_time < slot.end,
          );

          // Count how many hours are booked in this slot
          const bookedHours = slotBookings.length;

          // Check if any of the bookings are for the lesson we're rescheduling
          const hasReschedulingLesson = slotBookings.some(
            (booking) =>
              booking.lesson_id && lessonIds.includes(booking.lesson_id),
          );

          // Check if there are any bookings for other lessons
          const hasOtherLessons = slotBookings.some(
            (booking) =>
              booking.lesson_id && !lessonIds.includes(booking.lesson_id),
          );

          newSlots.push({
            date: currentDate,
            startTime: slot.start,
            endTime: slot.end,
            isAvailable: isAvailable && !hasOtherLessons,
            // If this slot has our lesson, show the duration as 1 or 2 based on booked hours
            // If it's not our lesson or no booking, show 0
            selectedDuration: hasReschedulingLesson ? bookedHours : 0,
            availableInstructors,
          });
        });
      }
      setSelectedSlots(newSlots);
    }
  }, [
    schedules,
    instructors,
    existingSchedules,
    startDate,
    checkSlotAvailability,
    lessonIds,
  ]);

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
        navigate("/home");
      },
      onError: (error) => {
        alert("Error booking slots: " + error.message);
      },
    });
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
                                className={`flex-grow text-xs ${!slot?.isAvailable ? "cursor-not-allowed opacity-50" : ""}`}
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
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="ml-1 px-2 py-1 text-xs"
                                    onClick={() =>
                                      handleDurationChange(slot, 0)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
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
