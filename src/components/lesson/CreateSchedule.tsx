import { useQuery } from "@tanstack/react-query";
import { addDays, format, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface TimeSlotSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  slot: HourlySlot | null;
  date: Date | null;
  instructors: any[] | null;
  onConfirm: (instructorId: string) => void;
}

export default function CreateScheduleWithInstructor({
  learnerId,
  learnerArea,
  request,
  onScheduleCreate,
}: CreateScheduleProps) {
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date()));

  // Fetch instructors for the learner's area
  const { data: instructors } = useQuery({
    queryKey: ["instructors", learnerArea],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Instructor")
        .select("*");
        
      if (error) throw error;
      return data;
    },
  });

  // Fetch the selected instructor's schedule
  const { data: instructorSchedule } = useQuery({
    queryKey: ["instructorSchedule", selectedInstructorId, currentWeekStart],
    queryFn: async () => {
      if (!selectedInstructorId) return [];
      const start = format(currentWeekStart, "yyyy-MM-dd");
      const end = format(endOfWeek(currentWeekStart), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("Schedule")
        .select("*")
        .eq("instructor_id", selectedInstructorId)
        .gte("date", start)
        .lte("date", end);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedInstructorId,
  });

  // Separate instructors into two groups
  const [matchingInstructors, otherInstructors] = useMemo(() => {
    if (!instructors) return [[], []];
    console.log(instructors);
  
    return instructors.reduce(
      ([matching, others], instructor) => {
        console.log(instructor.areas, instructor.name);
        if (instructor.areas.includes(learnerArea)) {
          matching.push(instructor);
        } else {
          others.push(instructor);
        }
        console.log(matching, others);
        return [matching, others];
      },
      [[], []]
    );
  }, [instructors, learnerArea]);
  

  const handleWeekChange = (direction: "prev" | "next") => {
    setCurrentWeekStart((prev) =>
      direction === "next" ? addDays(prev, 7) : addDays(prev, -7)
    );
  };

  return (
    <div className="flex space-x-4">
      {/* Left Panel: Instructor's Schedule */}
      <div className="w-1/2">
        <Card>
          <CardContent>
            <h3 className="font-medium mb-4 mt-4">Select Instructor</h3>
            <Select
              value={selectedInstructorId || ""}
              onValueChange={(value) => setSelectedInstructorId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an instructor" />
              </SelectTrigger>
              <SelectContent>
                {matchingInstructors.map((instructor) => (
                  <SelectItem key={instructor.id_instructor} value={instructor.id_instructor}>
                    {instructor.name} (Matching Area)
                  </SelectItem>
                ))}
                {otherInstructors.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-sm text-gray-500">Other Instructors</div>
                    {otherInstructors.map((instructor) => (
                      <SelectItem key={instructor.id_instructor} value={instructor.id_instructor}>
                        {instructor.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <div className="flex justify-between mb-6"></div>
        <Card>
          <CardContent>
            <h3 className="font-medium mb-4 mt-4">Instructor's Weekly Schedule</h3>
            <div className="mb-4">
              <h4 className="font-medium">Instructor Details:</h4>
              {selectedInstructorId && (
                <>
                  <p className="text-sm">
                    Address: {
                      instructors.find(instructor => instructor.id_instructor === selectedInstructorId)?.address
                    }
                  </p>
                  <p className="text-sm">
                    Radius: {
                      instructors.find(instructor => instructor.id_instructor === selectedInstructorId)?.radius
                    } km
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleWeekChange("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="font-medium">
                {format(currentWeekStart, "MMM d")} -{" "}
                {format(endOfWeek(currentWeekStart), "MMM d, yyyy")}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleWeekChange("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr>
                    <th className="border border-gray-200 p-2">Time</th>
                    {Array.from({ length: 7 }).map((_, index) => {
                      const day = addDays(currentWeekStart, index);
                      return (
                        <th key={index} className="border border-gray-200 p-2">
                          {format(day, "EEE")}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
  {Array.from({ length: 32 }).map((_, timeIndex) => {
    const hour = Math.floor(timeIndex / 2) + 6; // Start from 6 AM
    const minute = timeIndex % 2 === 0 ? 0 : 30; // Alternate between 0 and 30 minutes
    return (
      <tr key={timeIndex}>
        <td className="border border-gray-200 p-2 text-center">
          {format(new Date().setHours(hour, minute), "h:mm a")}
        </td>
        {Array.from({ length: 7 }).map((_, dayIndex) => {
          const day = addDays(currentWeekStart, dayIndex);

          // Find the schedule for the current day and time
          const schedule = instructorSchedule?.find((s) => {
            const scheduleStart = new Date(`${s.date}T${s.start_time}`);
            const scheduleEnd = new Date(`${s.date}T${s.end_time}`);
            const currentTime = new Date(day);
            currentTime.setHours(hour, minute);

            return (
              isSameDay(scheduleStart, day) &&
              currentTime >= scheduleStart &&
              currentTime < scheduleEnd
            );
          });

          // Determine if this cell is the start of a schedule
          const isScheduleStart =
            schedule &&
            parseInt(schedule.start_time.split(":")[0]) === hour &&
            parseInt(schedule.start_time.split(":")[1]) === minute;

          return (
            <td
              key={dayIndex}
              className={`border border-gray-200 p-2 text-center ${
                schedule ? "bg-primary text-white" : ""
              }`}
            >
              {isScheduleStart ? `${schedule.start_time} - ${schedule.end_time}` : ""}
            </td>
          );
        })}
      </tr>
    );
  })}
</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: Learner's Schedule Selection */}
      <div className="w-1/2">

        {/* Original Calendar for Learner's Schedule */}
        <div className="mt-4">
          <CreateSchedule
            learnerId={learnerId}
            learnerArea={learnerArea}
            request={request}
            onScheduleCreate={onScheduleCreate}
          />
        </div>
      </div>
    </div>
  );
}

function CreateSchedule({
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

  // Dialog state for instructor selection
  const [selectionDialogOpen, setSelectionDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<HourlySlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>("");

  // Fetch instructors for the learner's area
  const { data: instructors } = useQuery({
    queryKey: ["instructors", learnerArea],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Instructor")
        .select("*");

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
            s.date === dateStr && 
            parseInt(s.start_time.split(":")[0]) === hour &&
            parseInt(s.start_time.split(":")[1] || "0") === minute,
        );

        // Check if this slot has other schedules for the same learner
        const isLearnerSchedule = existingSchedules?.some(
          (s) =>
            s.date === dateStr &&
            parseInt(s.start_time.split(":")[0]) === hour &&
            parseInt(s.start_time.split(":")[1] || "0") === minute &&
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
                format(s.date, "yyyy-MM-dd") === dateStr && 
                s.hour === hour &&
                s.minutes === minute,
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

  // Instructor selection dialog component
  const InstructorSelectionDialog = ({
    open,
    onClose,
    slot,
    date,
    instructors,
    onConfirm,
  }: TimeSlotSelectionDialogProps) => {
    const [instructorId, setInstructorId] = useState<string>(
      slot?.state.availableInstructors[0] || ""
    );

    const availableInstructorIds = slot?.state.availableInstructors || [];
    
    const availableInstructors = instructors?.filter(
      (instructor) => availableInstructorIds.includes(instructor.id_instructor)
    ) || [];

    const handleConfirm = () => {
      onConfirm(instructorId);
      onClose();
    };

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Instructor</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              {date && slot
                ? `${format(date, "MMM d, yyyy")} at ${format(
                    slot.timestamp,
                    "h:mm a"
                  )}`
                : ""}
            </p>
            <Select value={instructorId} onValueChange={setInstructorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an instructor" />
              </SelectTrigger>
              <SelectContent>
                {availableInstructors.map((instructor) => (
                  <SelectItem
                    key={instructor.id_instructor}
                    value={instructor.id_instructor}
                  >
                    {instructor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const handleSlotClick = (date: Date, slot: HourlySlot) => {
    if (!slot.state.isAvailable || slot.state.isSelected) {
      // If slot is selected, unselect it and its paired slot
      if (slot.state.isSelected) {
        setSelectedSlots((prev) => {
          const hour = slot.timestamp.getHours();
          const minute = slot.timestamp.getMinutes();
          const dateStr = format(date, "yyyy-MM-dd");
          
          // Get the slotGroupId that this slot is part of
          const groupId = prev.find(
            (s) => 
              format(s.date, "yyyy-MM-dd") === dateStr && 
              s.hour === hour && 
              s.minutes === minute
          )?.slotGroupId;
          
          // Remove all slots that have the same slotGroupId
          return prev.filter((s) => s.slotGroupId !== groupId);
        });
      }
      return;
    }

    // Check how many unique hourly slots are already selected
    const currentUniqueSlots = countUniqueHourlySlots(selectedSlots);
    const hour = slot.timestamp.getHours();
    const minute = slot.timestamp.getMinutes();
    const isStartSlot = minute === 0;

    if (currentUniqueSlots >= request.lesson_ids.length) {
      alert("Cannot select more slots than required.");
      return;
    }

    // Open instructor selection dialog
    setSelectedSlot(slot);
    setSelectedDate(date);
    setSelectionDialogOpen(true);
  };

  // Handle instructor selection from dialog
  const handleInstructorSelect = (instructorId: string) => {
    if (!selectedSlot || !selectedDate) return;
    
    const hour = selectedSlot.timestamp.getHours();
    const minute = selectedSlot.timestamp.getMinutes();
    const isStartSlot = minute === 0;
    
    setSelectedSlots((prev) => {
      // When selecting, add both slots that make up the full hour
      if (isStartSlot) {
        // If selecting a XX:00 slot, also select the XX:30 slot
        // Mark them as the same slot group
        const slotGroupId = Date.now().toString(); // Unique ID for this hour selection
        return [
          ...prev,
          {
            date: selectedDate,
            hour,
            minutes: 0,
            instructorId,
            slotGroupId, // Add this to group related 30-min slots
          },
          {
            date: selectedDate,
            hour,
            minutes: 30,
            instructorId,
            slotGroupId, // Same group ID for the second 30 min slot
          },
        ];
      } else {
        // If selecting a XX:30 slot, also select the (XX+1):00 slot
        const slotGroupId = Date.now().toString();
        return [
          ...prev,
          {
            date: selectedDate,
            hour,
            minutes: 30,
            instructorId,
            slotGroupId,
          },
          {
            date: selectedDate,
            hour: hour + 1,
            minutes: 0,
            instructorId,
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
        const endHour = schedule.minutes === 30 ? schedule.hour + 1 : schedule.hour;
        const endMinutes = schedule.minutes === 30 ? "00" : "30";

        return {
          date: schedule.date,
          hour: schedule.hour,
          instructorId: schedule.instructorId,
          lessonId: schedule.lessonId,
          lessonNumber: schedule.lessonNumber,
          start_time: `${formattedHour}:${formattedMinutes}:00`,
          end_time: `${String(endHour).padStart(2, "0")}:${endMinutes}:00`,
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
    if (slot.state.isPreferred) return "bg-primary/30";
    return "bg-white";
  };

  // Format the time for display
  const formatTimeDisplay = (timestamp: Date) => {
    return format(timestamp, "h:mm a");
  };

  return (
    <div className="w-full space-y-4">
      {lessons && lessons.length > 0 && !request.type === "new" && (
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
                            ? `${formatTimeDisplay(slot.timestamp)} ${
                                slot.state.existingSchedule
                                  ? `- Scheduled for ${slot.state.existingSchedule.learner_name}`
                                  : ""
                              }`
                            : undefined
                        }
                      >
                        {formatTimeDisplay(slot.timestamp)}
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
            <div className="h-3 w-3 rounded bg-primary/30" />
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
            disabled={selectedSlots.length/2 !== request.lesson_ids.length}
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

      {/* Render the instructor selection dialog */}
      <InstructorSelectionDialog
        open={selectionDialogOpen}
        onClose={() => setSelectionDialogOpen(false)}
        slot={selectedSlot}
        date={selectedDate}
        instructors={instructors}
        onConfirm={handleInstructorSelect}
      />
    </div>
  );
}
