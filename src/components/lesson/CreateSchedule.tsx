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
  hour: number;
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
    Array<Omit<Schedule, "lessonId">>
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

    // Create 24 hourly slots
    for (let hour = 6; hour < 21; hour++) {
      // Find which time slot this hour belongs to
      const timeSlot = TIME_SLOTS.find((slot) => {
        const [start, end] = slot.split("-");
        return parseInt(start) <= hour && parseInt(end) > hour;
      });

      if (!timeSlot) continue;

      // Get schedules for this time slot
      const slotSchedules =
        otherSchedules?.filter(
          (s) =>
            s.date === dateStr && parseInt(s.start_time.split(":")[0]) === hour,
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
      const isLearnerSchedule = laterScheduleOfLearnerToChange?.some(
        (s) =>
          s.date === dateStr &&
          parseInt(s.start_time.split(":")[0]) === hour &&
          s.learner_id === learnerId,
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
        hour,
        timeSlot: timeSlot as TimeSlot | null,
        state: {
          isAvailable: availableInstructors.length > 0 && !isLearnerSchedule,
          isSelected: selectedSlots.some(
            (s) => format(s.date, "yyyy-MM-dd") === dateStr && s.hour === hour,
          ),
          isPreferred: !!isPreferred,
          isCurrentSchedule,
          isLearnerSchedule,
          existingSchedule,
          availableInstructors,
        },
      });
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

    const slotHour = slot.hour;

    setSelectedSlots((prev) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const isSelected = prev.some(
        (s) => format(s.date, "yyyy-MM-dd") === dateStr && s.hour === slotHour,
      );

      if (isSelected) {
        return prev.filter(
          (s) =>
            !(format(s.date, "yyyy-MM-dd") === dateStr && s.hour === slotHour),
        );
      }

      // const enrollment = enrollments?.find(
      //   (e) => e.course_id === selectedCourse,
      // );
      // if (!enrollment) return prev;
      // const course = enrollment.Courses;
      // if (!course || !course.duration) return prev;
      // if (prev.length >= course.duration) {
      //   alert(`You can only select up to ${course.duration} hours`);
      //   return prev;
      // }

      return [
        ...prev,
        {
          date,
          hour: slotHour,
          instructorId: slot.state.availableInstructors[0],
        },
      ];
    });
  };

  const handleDateChange = (direction: "prev" | "next") => {
    setStartDate((prev) => addDays(prev, direction === "next" ? 10 : -10));
  };

  const handleCreateSchedule = () => {
    if (selectedSlots.length === 0) {
      alert("Please select at least one time slot");
      return;
    }

    if (!lessons || lessons.length < selectedSlots.length) {
      alert("Not enough lessons available for the course");
      return;
    }

    if (!instructors || instructors.length === 0) {
      alert("No instructors available for this area");
      return;
    }

    // Sort lessons by lesson number
    const sortedLessons = allLessons
      ? [...allLessons]
          .filter((l) => l.number && l.number >= minLessonNumber)
          .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
      : [];

    const allSlots: Omit<Schedule, "lessonId">[] = [
      ...selectedSlots,
      ...laterScheduleOfLearnerToChange.map((s) => ({
        date: new Date(s.date),
        hour: parseInt(s.start_time.split(":")[0]),
        instructorId: s.instructor_id ?? "",
      })),
    ];

    // Create schedules with lesson IDs and instructor ID
    const schedulesWithIds = allSlots
      .sort((a, b) => {
        if (a.date === b.date) {
          return a.hour - b.hour;
        }
        return isBefore(a.date, b.date) ? -1 : 1;
      })
      .map((slot, index) => ({
        ...slot,
        lessonId: sortedLessons[index].id ?? "",
      }));

    onScheduleCreate(schedulesWithIds, sortedLessons[0].course_id ?? "");
  };

  const getSlotColor = (slot: HourlySlot) => {
    if (!slot.timeSlot) return "bg-gray-50";
    if (slot.state.isSelected) return "bg-primary";
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
                        className={`h-10 w-full rounded ${getSlotColor(
                          slot,
                        )} hover:opacity-80 ${
                          !slot.timeSlot ? "cursor-default" : "cursor-pointer"
                        }`}
                        onClick={() => handleSlotClick(date, slot)}
                        title={
                          slot.hour
                            ? `${format(new Date().setHours(slot.hour, 0), "h:mm a")} ${
                                slot.state.existingSchedule
                                  ? `- Scheduled for ${slot.state.existingSchedule.learner_name}`
                                  : ""
                              }`
                            : undefined
                        }
                      >
                        {format(new Date().setHours(slot.hour, 0), "h:mm a")}
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
            Selected: {selectedSlots.length} of {request.lesson_ids.length}{" "}
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
