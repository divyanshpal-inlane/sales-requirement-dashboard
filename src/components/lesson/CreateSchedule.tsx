import { useQuery } from "@tanstack/react-query";
import { addDays, format, isBefore } from "date-fns";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabaseClient";
import { generateRandomOTP } from "@/lib/utils";
import { SchedulingRequests, usePreferences } from "@/queries/preferences";
import { Schedule } from "@/routes/admin/schedules";
import { TIME_SLOTS, TimeSlot } from "@/types/schedule";

interface CreateScheduleProps {
  learnerId: string;
  learnerArea: string;
  request: SchedulingRequests[number];
  onScheduleCreate: (schedules: Schedule[], courseId: string) => void;
}

interface TimeSlotState {
  isAvailable: boolean;
  isSelected: boolean;
  isPreferred: boolean;
  isCurrentSchedule: boolean;
  isLearnerSchedule: boolean;
  existingSchedule?: {
    slot_start_time: string;
    learner_name: string | null;
    learner_area: string | null;
    pickup_address: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  availableInstructors: string[];
}

interface HourlySlot {
  timestamp: Date;
  timeSlot: TimeSlot | null;
  state: TimeSlotState;
}

type DaySchedule = HourlySlot[];

export default function CreateSchedule({
  learnerId,
  learnerArea,
  request,
  onScheduleCreate,
}: CreateScheduleProps) {
  const { data: preferences } = usePreferences(learnerId);
  const [startDate, setStartDate] = useState(addDays(new Date(), 1));
  const [selectedSlots, setSelectedSlots] = useState<
    Array<Omit<Schedule, "lessonId"> & { minutes: number; slotGroupId: string }>
  >([]);
  // const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [scheduleDetails, setScheduleDetails] = useState<
    TimeSlotState["existingSchedule"] | null
  >(null);

  // Fetch instructors for the learner's area
  const { data: instructors } = useQuery({
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

  // Fetch lessons for the selected course
  const { data: allLessons } = useQuery({
    queryKey: ["lessons", request.lesson_ids],
    queryFn: async () => {
      const { data: lesson1, error: lesson1Error } = await supabase
        .from("Lesson")
        .select("*")
        .eq("id", request.lesson_ids[0])
        .single();
      if (lesson1Error) throw lesson1Error;
      const courseId = lesson1.course_id;
      if (!courseId) throw new Error("Course ID not found");
      const { data, error } = await supabase
        .from("Lesson")
        .select("*")
        .eq("course_id", courseId)
        .order("number", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const lessons = allLessons?.filter((l) => request.lesson_ids.includes(l.id));

  const minLessonNumber =
    lessons && lessons.length > 0
      ? lessons.reduce(
          (min, lesson) => Math.min(min, lesson.number ?? 0),
          Infinity,
        )
      : 0;

  // Fetch existing schedules for the date range
  const { data: existingSchedules } = useQuery({
    queryKey: ["schedules", startDate],
    queryFn: async () => {
      const endDate = addDays(startDate, 9);
      const { data, error } = await supabase
        .from("Schedule")
        .select(
          "*, Learner(name, area, pick_up_location, address_lat, address_lng)",
        )
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0]);

      if (error) throw error;
      return data;
    },
  });

  const [schedulesToChange, laterScheduleOfLearnerToChange, otherSchedules] =
    useMemo(() => {
      if (!existingSchedules) return [[], [], []];

      const toChange = existingSchedules.filter(
        (s) =>
          request.lesson_ids.includes(s.lesson_id ?? "") &&
          s.learner_id === learnerId,
      );

      const laterScheduleOfLearnerToChange = existingSchedules.filter(
        (s) =>
          s.learner_id === learnerId &&
          s.lesson_id &&
          !request.lesson_ids.includes(s.lesson_id ?? "") &&
          allLessons?.find((l) => l.id === s.lesson_id)?.number >
            minLessonNumber,
      );

      const others = existingSchedules.filter(
        (s) => s.learner_id !== learnerId,
      );

      return [toChange, laterScheduleOfLearnerToChange, others];
    }, [
      existingSchedules,
      request.lesson_ids,
      learnerId,
      allLessons,
      minLessonNumber,
    ]);

  // Calculate hourly slots for each day
  const calculateDaySchedule = (date: Date): DaySchedule => {
    const daySchedule: DaySchedule = [];
    const dateStr = format(date, "yyyy-MM-dd");
    const isDayBlocked = schedulesToChange.some(
      (s) => format(new Date(s.date), "yyyy-MM-dd") === dateStr,
    );
    for (let hour = 6; hour < 21; hour++) {
      for (const minute of [0, 30]) {
        const timestamp = new Date(date);
        timestamp.setHours(hour, minute);

        // Find which time slot this time belongs to
        const timeSlot = TIME_SLOTS.find((slot) => {
          const [start, end] = slot.split("-");
          return parseInt(start) <= hour && parseInt(end) > hour;
        });

        if (!timeSlot) continue;

        // Get schedules for this time slot
        const slotSchedules =
          otherSchedules?.filter(
            (s) =>
              s.date === dateStr &&
              parseInt(s.start_time.split(":")[0]) === hour &&
              parseInt(s.start_time.split(":")[1] || "0") === minute,
          ) ?? [];

        // Get learner preferences for this slot
        const isPreferred = preferences?.some(
          (p) => p.day_of_week === date.getDay() && p.time_slot === timeSlot,
        );

        // Check if this slot is currently scheduled for rescheduling
        const isCurrentSchedule = schedulesToChange?.some(
          (s) =>
            s.date === dateStr && parseInt(s.start_time.split(":")[0]) === hour,
        );

        // Check if this slot has other schedules for the same learner
        const isLearnerSchedule = existingSchedules?.some(
          (s) =>
            s.date === dateStr &&
            parseInt(s.start_time.split(":")[0]) === hour &&
            s.learner_id === learnerId &&
            !request.lesson_ids.includes(s.lesson_id ?? ""),
        );

        // Get available instructors for this slot
        const availableInstructors =
          instructors
            ?.filter((instructor) => {
              return !slotSchedules.some(
                (s) => s.instructor_id === instructor.id_instructor,
              );
            })
            .map((i) => i.id_instructor) ?? [];

        const existingSchedule =
          !isLearnerSchedule &&
          !isCurrentSchedule &&
          availableInstructors.length === 0 &&
          slotSchedules.length > 0 &&
          slotSchedules[0].Learner
            ? {
                slot_start_time: slotSchedules[0].start_time,
                learner_name: slotSchedules[0].Learner.name,
                learner_area: slotSchedules[0].Learner.area,
                pickup_address: slotSchedules[0].Learner.pick_up_location,
                latitude: slotSchedules[0].Learner.address_lat,
                longitude: slotSchedules[0].Learner.address_lng,
              }
            : undefined;

        daySchedule.push({
          timestamp,
          timeSlot: timeSlot as TimeSlot | null,
          state: {
            isAvailable:
              availableInstructors.length > 0 &&
              !isLearnerSchedule &&
              !isDayBlocked,
            isSelected: selectedSlots.some(
              (s) =>
                format(s.date, "yyyy-MM-dd") === dateStr && s.hour === hour,
            ),
            isPreferred: !!isPreferred,
            isCurrentSchedule,
            isLearnerSchedule,
            existingSchedule,
            availableInstructors,
          },
        });
      }
    }

    return daySchedule;
  };

  const handleSlotClick = (date: Date, slot: HourlySlot) => {
    if (!slot.timeSlot || !slot.state.isAvailable) {
      if (slot.state.existingSchedule) {
        setScheduleDetails(slot.state.existingSchedule);
      }
      return;
    }

    const slotTimestamp = slot.timestamp;
    const hour = slotTimestamp.getHours();
    const minutes = slotTimestamp.getMinutes();

    // Determine if this is a start slot (XX:00) or end slot (XX:30)
    const isStartSlot = minutes === 0;
    const isEndSlot = minutes === 30;

    setSelectedSlots((prev) => {
      // Check if either this slot or its pair is already selected
      const dateStr = format(date, "yyyy-MM-dd");

      // For start slots (XX:00), check if this slot or XX:30 is selected
      // For end slots (XX:30), check if this slot or (XX+1):00 is selected
      const thisPairIsSelected = isStartSlot
        ? prev.some(
            (s) =>
              format(s.date, "yyyy-MM-dd") === dateStr &&
              s.hour === hour &&
              (s.minutes === 0 || s.minutes === 30),
          )
        : prev.some(
            (s) =>
              format(s.date, "yyyy-MM-dd") === dateStr &&
              ((s.hour === hour && s.minutes === 30) ||
                (s.hour === hour + 1 && s.minutes === 0)),
          );

      if (thisPairIsSelected) {
        // If the pair is selected, deselect both slots that make up the hour
        return prev.filter((s) => {
          if (format(s.date, "yyyy-MM-dd") !== dateStr) return true;

          if (isStartSlot) {
            // Deselect XX:00 and XX:30
            return !(s.hour === hour && (s.minutes === 0 || s.minutes === 30));
          } else {
            // Deselect XX:30 and (XX+1):00
            return !(
              (s.hour === hour && s.minutes === 30) ||
              (s.hour === hour + 1 && s.minutes === 0)
            );
          }
        });
      }

      // Check if adding another slot would exceed the limit
      const currentUniqueSlots = countUniqueHourlySlots(prev);
      if (currentUniqueSlots >= request.lesson_ids.length) {
        alert("Cannot select more slots than required.");
        return prev;
      }

      // When selecting, add both slots that make up the full hour
      if (isStartSlot) {
        // If selecting a XX:00 slot, also select the XX:30 slot
        // Mark them as the same slot group
        const slotGroupId = Date.now().toString(); // Unique ID for this hour selection
        return [
          ...prev,
          {
            date,
            hour,
            minutes: 0,
            instructorId: slot.state.availableInstructors[0],
            slotGroupId, // Add this to group related 30-min slots
          },
          {
            date,
            hour,
            minutes: 30,
            instructorId: slot.state.availableInstructors[0],
            slotGroupId, // Same group ID for the second 30 min slot
          },
        ];
      } else {
        // If selecting a XX:30 slot, also select the (XX+1):00 slot
        const slotGroupId = Date.now().toString();
        return [
          ...prev,
          {
            date,
            hour,
            minutes: 30,
            instructorId: slot.state.availableInstructors[0],
            slotGroupId,
          },
          {
            date,
            hour: hour + 1,
            minutes: 0,
            instructorId: slot.state.availableInstructors[0],
            slotGroupId,
          },
        ];
      }
    });
  };

  // Helper function to count unique hourly slots (treating pairs as one)
  const countUniqueHourlySlots = (
    slots: Array<
      Omit<Schedule, "lessonId"> & { minutes: number; slotGroupId?: string }
    >,
  ) => {
    // Count by unique slotGroupIds
    const uniqueGroups = new Set(
      slots.map((s) => s.slotGroupId).filter(Boolean),
    );
    return uniqueGroups.size;
  };

  const handleDateChange = (direction: "prev" | "next") => {
    if (direction === "prev" && isBefore(addDays(startDate, -10), new Date())) {
      return;
    }
    setStartDate((prev) => addDays(prev, direction === "next" ? 10 : -10));
  };

  // ... (previous imports and interface definitions remain the same)

  const handleCreateSchedule = () => {
    if (selectedSlots.length === 0) {
      alert("Please select at least one time slot");
      return;
    }

    if (!lessons || lessons.length < countUniqueHourlySlots(selectedSlots)) {
      alert("Not enough lessons available for the course");
      return;
    }

    if (!instructors || instructors.length === 0) {
      alert("No instructors available for this area");
      return;
    }

    // Get all existing schedules for the course (excluding ones being rescheduled)
    const existingCourseSchedules =
      existingSchedules?.filter(
        (s) =>
          s.learner_id === learnerId &&
          !request.lesson_ids.includes(s.lesson_id ?? "") &&
          allLessons?.some((l) => l.id === s.lesson_id),
      ) ?? [];

    // Get completed lessons to maintain their numbers
    const completedLessons = existingCourseSchedules.filter(
      (s) => new Date(s.date).setHours(s.hour) < new Date().getTime(),
    );

    // Group selected slots by their slotGroupId
    const selectedSlotGroups = groupBy(
      selectedSlots,
      (slot) => slot.slotGroupId || "",
    );

    // Convert each pair of 30-minute slots into a single hour entry
    // We'll use the first slot in each group as the starting point
    const newSlots = Object.values(selectedSlotGroups).map((group) => {
      // Sort the slots to ensure the earlier one comes first
      const sortedGroup = [...group].sort((a, b) => {
        const timeA = new Date(a.date).setHours(a.hour, a.minutes);
        const timeB = new Date(b.date).setHours(b.hour, b.minutes);
        return timeA - timeB;
      });

      // Use the first slot as the start time
      const firstSlot = sortedGroup[0];
      return {
        date: firstSlot.date,
        hour: firstSlot.hour,
        minutes: firstSlot.minutes,
        instructorId: firstSlot.instructorId,
        isNew: true as const,
      };
    });

    // Get upcoming slots
    const upcomingSlots = [
      // New selected slots (only one entry per hour)
      ...newSlots,

      // Existing upcoming schedules that aren't being changed
      ...existingCourseSchedules
        .filter(
          (s) =>
            new Date(s.date).setHours(parseInt(s.start_time.split(":")[0])) >=
            new Date().getTime(),
        )
        .map((schedule) => ({
          date: new Date(schedule.date),
          hour: parseInt(schedule.start_time.split(":")[0]),
          minutes: parseInt(schedule.start_time.split(":")[1] || "0"),
          instructorId: schedule.instructor_id ?? "",
          lessonId: schedule.lesson_id ?? "",
          isNew: false as const,
        })),
    ];

    // Sort upcoming slots chronologically
    const chronologicallySortedUpcomingSlots = upcomingSlots.sort((a, b) => {
      const timeA = new Date(a.date).setHours(a.hour, a.minutes);
      const timeB = new Date(b.date).setHours(b.hour, b.minutes);
      return timeA - timeB;
    });

    // Get all lessons for the course
    const courseLessons = allLessons
      ? [...allLessons].sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
      : [];

    // Find the next lesson number after completed lessons
    const maxCompletedLessonNumber = Math.max(
      ...completedLessons.map(
        (s) => courseLessons.find((l) => l.id === s.lesson_id)?.number ?? 0,
      ),
      0,
    );

    // Get available lessons for upcoming slots (lessons after the completed ones)
    const availableLessons = courseLessons.filter(
      (l) => (l.number ?? 0) > maxCompletedLessonNumber,
    );

    // Create new schedule array with correctly assigned lesson numbers
    const schedulesWithIds = chronologicallySortedUpcomingSlots.map(
      (slot, index) => {
        if (!slot.isNew) {
          // This is an existing schedule that's not being changed
          return {
            date: slot.date,
            hour: slot.hour,
            minutes: slot.minutes,
            instructorId: slot.instructorId,
            lessonId: slot.lessonId,
            lessonNumber:
              courseLessons.find((l) => l.id === slot.lessonId)?.number ?? 0,
          };
        } else {
          // Check if this slot is meant for lesson 10
          const isLesson10Slot = request.lesson_ids.some(
            (id) => courseLessons.find((l) => l.id === id)?.number === 10,
          );

          if (isLesson10Slot) {
            // If this is lesson 10, find and use lesson 10
            const lesson10 = availableLessons.find((l) => l.number === 10);
            return {
              date: slot.date,
              hour: slot.hour,
              minutes: slot.minutes,
              instructorId: slot.instructorId,
              lessonId: lesson10?.id ?? "",
              lessonNumber: 10,
            };
          } else {
            // For lessons 1-9, use sequential numbering starting after maxCompletedLessonNumber
            const lesson = availableLessons[index];
            return {
              date: slot.date,
              hour: slot.hour,
              minutes: slot.minutes,
              instructorId: slot.instructorId,
              lessonId: lesson?.id ?? "",
              lessonNumber: lesson?.number ?? 0,
            };
          }
        }
      },
    );

    // Filter out only the schedules that need to be created/updated
    const schedulesToUpdate = schedulesWithIds.filter((schedule, index) => {
      const originalSlot = chronologicallySortedUpcomingSlots[index];
      // Include if it's a new slot or if the lesson number has changed
      return originalSlot.isNew || schedule.lessonId !== originalSlot.lessonId;
    });

    // Create final schedules array, ensuring lesson 10 is handled correctly
    const finalSchedules = schedulesToUpdate
      .filter(
        (schedule) =>
          schedule.lessonNumber <= 9 || schedule.lessonNumber === 10,
      )
      .map((schedule) => {
        // Format the start_time correctly with hours and minutes
        const formattedHour = String(schedule.hour).padStart(2, "0");
        const formattedMinutes = String(schedule.minutes || 0).padStart(2, "0");

        return {
          date: schedule.date,
          hour: schedule.hour,
          instructorId: schedule.instructorId,
          lessonId: schedule.lessonId,
          lessonNumber: schedule.lessonNumber,
          start_time: `${formattedHour}:${formattedMinutes}`, // Add formatted start time
          status: "booked",
          otp: generateRandomOTP(),
        };
      });

    onScheduleCreate(finalSchedules, courseLessons[0]?.course_id ?? "");
  };

  // Utility function to group array items by a key
  function groupBy<T>(array: T[], keyFn: (item: T) => string) {
    return array.reduce((result: Record<string, T[]>, item) => {
      const key = keyFn(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
      return result;
    }, {});
  }

  const getSlotColor = (slot: HourlySlot) => {
    if (!slot.timeSlot) return "bg-gray-50";

    const dateStr = format(slot.timestamp, "yyyy-MM-dd");
    const hour = slot.timestamp.getHours();
    const minutes = slot.timestamp.getMinutes();

    // Check if this slot is part of a selected pair
    const isSelected =
      minutes === 0
        ? selectedSlots.some(
            (s) =>
              format(s.date, "yyyy-MM-dd") === dateStr &&
              s.hour === hour &&
              s.minutes === 0,
          )
        : selectedSlots.some(
            (s) =>
              format(s.date, "yyyy-MM-dd") === dateStr &&
              s.hour === hour &&
              s.minutes === 30,
          );

    if (isSelected) return "bg-primary";
    if (slot.state.isLearnerSchedule) return "bg-blue-200";
    if (slot.state.existingSchedule) return "bg-gray-100";
    if (slot.state.isCurrentSchedule) return "bg-yellow-200";
    if (slot.state.isPreferred) return "bg-primary/10";
    return "bg-white";
  };

  return (
    <div className="w-full space-y-4">
      {lessons && lessons.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 font-medium">Lessons to Reschedule</h3>
            <div className="grid grid-cols-3 gap-4">
              {lessons
                .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
                .map((lesson) => (
                  <div key={lesson.id} className="rounded-lg border p-3">
                    <div className="font-medium">Lesson {lesson.number}</div>
                    {schedulesToChange?.find(
                      (s) => s.lesson_id === lesson.id,
                    ) && (
                      <div className="mt-1 text-xs text-yellow-600">
                        Currently scheduled for:{" "}
                        {format(
                          new Date(
                            schedulesToChange.find(
                              (s) => s.lesson_id === lesson.id,
                            )?.date ?? "",
                          ).setHours(
                            parseInt(
                              schedulesToChange
                                .find((s) => s.lesson_id === lesson.id)
                                ?.start_time.split(":")[0] ?? "0",
                            ),
                            0,
                          ),
                          "MMM d, h:mm a",
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleDateChange("prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium">
            {format(startDate, "MMM d")} -{" "}
            {format(addDays(startDate, 9), "MMM d, yyyy")}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleDateChange("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="relative">
        <div className="flex space-x-4">
          {Array.from({ length: 10 }).map((_, index) => {
            const date = addDays(startDate, index);
            const daySchedule = calculateDaySchedule(date);
            return (
              <Card key={index} className="w-[120px] flex-shrink-0">
                <CardContent className="p-4">
                  <div className="mb-3 text-sm font-medium">
                    {format(date, "EEE, MMM d")}
                  </div>
                  <div className="space-y-2">
                    {daySchedule.map((slot, idx) => (
                      <button
                        key={idx}
                        className={`h-10 w-full rounded ${getSlotColor(slot)} hover:opacity-80 ${
                          !slot.timeSlot ? "cursor-default" : "cursor-pointer"
                        }`}
                        onClick={() => handleSlotClick(date, slot)}
                        title={
                          slot.timestamp
                            ? `${format(slot.timestamp, "h:mm a")} ${
                                slot.state.existingSchedule
                                  ? `- Scheduled for ${slot.state.existingSchedule.learner_name}`
                                  : ""
                              }`
                            : undefined
                        }
                      >
                        {format(slot.timestamp, "h:mm a")}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-primary/10" />
            <span>Preferred</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-primary" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-yellow-200" />
            <span>Current Schedule</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-blue-200" />
            <span>Other Lessons</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-gray-100" />
            <span>Unavailable</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            Selected: {selectedSlots.length/2} of {request.lesson_ids.length}{" "}
            hours
          </div>

          <Button
            onClick={handleCreateSchedule}
            disabled={selectedSlots.length === 0}
          >
            Create Schedule
          </Button>
        </div>
      </div>

      <Dialog
        open={!!scheduleDetails}
        onOpenChange={() => setScheduleDetails(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Details</DialogTitle>
          </DialogHeader>
          {scheduleDetails && (
            <div className="space-y-4">
              <div>
                <div className="font-medium">
                  {scheduleDetails.learner_name}
                </div>
                <div className="text-sm text-gray-500">
                  {scheduleDetails.learner_area}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-1 h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-sm">
                    {scheduleDetails.pickup_address}
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${scheduleDetails.latitude},${scheduleDetails.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View on Google Maps
                  </a>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
