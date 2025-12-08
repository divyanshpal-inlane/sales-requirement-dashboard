import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  LearnerInfo,
  LearnerInfoCard,
  LearnerInfoDialog,
} from "@/components/admin/LearnerInfoCard";
import CreateSchedule from "@/components/lesson/CreateSchedule";
import CreateScheduleWithInstructor from "@/components/lesson/CreateSchedule";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,

} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { sendMultiEventCalendarInvite } from "@/lib/calendarUtils";
import { supabase } from "@/lib/supabaseClient";
import { useMutationCompleteRescheduleRequest } from "@/queries/learner";
import {
  SchedulingRequests,
  useSchedulingRequests,
} from "@/queries/preferences";
import {
  DAYS_OF_WEEK,
  TIME_SLOT_LABELS,
  TIME_SLOTS,
  TimeSlot,
} from "@/types/schedule";

export type Schedule = {
  date: Date;
  hour: number;
  instructorId: string;
  lessonId: string;
  lessonNumber: number;
  start_time: string;
  end_time: string;
  otp: string;
  calendar_uid?: string;
  calendar_sequence?: number;
};

type RequestType = "new" | "reschedule" | "lesson10";

// Extend the SchedulingRequests type to include lesson10
declare module "@/queries/preferences" {
  interface SchedulingRequests {
    type: RequestType;
  }
}

export default function AdminSchedules() {
  const navigate = useNavigate();
  const { data: requests, isLoading, isRefetching } = useSchedulingRequests();
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [isInstructorChangeModalOpen, setIsInstructorChangeModalOpen] =
    useState(false);
  const [selectedRequest, setSelectedRequest] = useState<
    SchedulingRequests[number] | null
  >(null);
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLearnerForDialog, setSelectedLearnerForDialog] =
    useState<LearnerInfo | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  
  useEffect(() => {
    if (!isRefetching) {
      setSelectedRequest(null);
    }
  }, [isRefetching]);

  const completeRescheduleRequestMutation =
    useMutationCompleteRescheduleRequest();

  const createScheduleMutation = useMutation({
    mutationFn: async ({
      learnerId,
      schedules,
      courseId,
    }: {
      learnerId: string;
      schedules: Schedule[];
      courseId: string;
      rescheduleLessonNumber?: number;
    }) => {
      // delete existing lessonId schedule for learner
      const { error: deleteError } = await supabase
        .from("Schedule")
        .delete()
        .eq("learner_id", learnerId)
        .eq("course_id", courseId)
        .in(
          "lesson_id",
          schedules.map((s) => s.lessonId),
        );

      if (deleteError) throw deleteError;

      // Create schedules
      // In the createScheduleMutation function:

      for (const schedule of schedules) {
        if (!schedule?.otp || !schedule.otp_end) {
          console.error("No otp for schedule:", schedule);
        } else {
          console.log("Auth of lesson are generated", schedule.otp, schedule.otp_end);
        }
      }
      // Create schedules
      const { error, data: createdSchedules } = await supabase
        .from("Schedule")
        .insert(
          schedules.map((schedule) => {
            // Parse start time and add 1 hour for end time
            const [hours, minutes] = schedule.start_time.split(":").map(Number);
            const endHours = (hours + 1) % 24;
            const endTime = `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;

            return {
              learner_id: learnerId,
              course_id: courseId,
              lesson_id: schedule.lessonId,
              instructor_id: schedule.instructorId,
              date: schedule.date.toISOString().split("T")[0],
              start_time: schedule.start_time,
              end_time: endTime,
              enabled: true,
              otp: schedule.otp,
              otp_end: schedule.otp_end,
              calendar_uid: schedule.calendar_uid || "", // Include the calendar_uid
              calendar_sequence: schedule.calendar_sequence || 0, // Include the calendar_sequence
            };
          }),
        )
        .select(); // Add .select() to get the created records

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Schedule created",
        description: "The schedule has been created successfully.",
      });
      if (selectedRequest) {
        completeRescheduleRequestMutation.mutate(
          {
            requestId: selectedRequest.id,
          },
          {
            onSuccess: () => {
              const rescheduleLessonNumber =
                selectedRequest.type === "reschedule"
                  ? Math.min(...variables.schedules.map((s) => s.lessonNumber))
                  : 1;
              if (selectedRequest.type === "new") {
                supabase.functions.invoke("send-message", {
                  body: {
                    message_type: "SCHEDULE_PREPARED",
                    learner_id: selectedRequest.learner_id,

                    start_date: format(
                      new Date(variables.schedules[0].date),
                      "dd/MM/yyyy",
                    ),
                    start_time: variables.schedules[0].start_time,
                  },
                });
              }
              if (selectedRequest.type === "reschedule") {
                supabase.functions.invoke("send-message", {
                  body: {
                    message_type: "WEBAPP_RESCHEDULE_DONE_CHECK_NEW_SCHEDULE",
                    learner_id: selectedRequest.learner_id,
                  },
                });
              }
              if (selectedRequest.type === "lesson10") {
                supabase.functions.invoke("send-message", {
                  body: {
                    message_type: "WEBAPP_LESSON_10_SCHEDULED",
                    learner_id: selectedRequest.learner_id,
                  },
                });
              }
              // supabase.functions.invoke("learner-daily-schedule", {
              //   body: {
              //     learner_id: selectedRequest.learner_id,
              //     reschedule_lesson_number: rescheduleLessonNumber,
              //   },
              // });
            },
          },
        );
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  const handleActiveLearnerSelect = (learner: any) => {
    console.log("Selected active Learner:", learner);
    // If this learner is already selected, open the dialog
    if (selectedRequest?.id === learner.id) {
      handleOpenLearnerInfo({
        id: learner.id || "",
        name: learner.name || "",
        phone: learner.phone || "",
        email: learner.email || "",
        area: learner.area || "",
        pick_up_location: learner.pick_up_location,
        pincode: learner.pincode,
        signed_up: learner.signed_up,
        created_at: learner.created_at,
        address_lat: learner.address_lat,
        address_lng: learner.address_lng,
        preferred_start_date: learner.preferred_start_date,
        preferred_completion_days: learner.preferred_completion_days,
        prefers_two_hour_classes: learner.prefers_two_hour_classes,
        preferred_two_hour_days: learner.two_hour_days,
        DL_test_date: learner.DL_test_date,
      });
    } else {
      // Otherwise, just select the learner
      setSelectedRequest(learner);
      // reset instructor selection
      setSelectedInstructorId("");
    }
  };

  const handleRequestSelect = (request: SchedulingRequests[number]) => {
    // If this request is already selected, open the dialog
    if (selectedRequest?.id === request.id) {

      handleOpenLearnerInfo({
        id: request.Learner?.id || "",
        name: request.Learner?.name || "",
        phone: request.Learner?.phone || "",
        email: request.Learner?.email || "",
        area: request.Learner?.area || "",
        pick_up_location: request.Learner?.pick_up_location,
        pincode: request.Learner?.pincode,
        signed_up: request.Learner?.signed_up,
        created_at: request.Learner?.created_at,
        address_lat: request.Learner?.address_lat,
        address_lng: request.Learner?.address_lng,
        preferred_start_date: request.Learner?.preferred_start_date,
        preferred_completion_days: request.Learner?.preferred_completion_days,
        prefers_two_hour_classes: request.Learner?.prefers_two_hour_classes,
        preferred_two_hour_days: request.Learner?.two_hour_days,
        DL_test_date: request.Learner?.DL_test_date,
      });
    } else {
      // Otherwise, just select the request
      setSelectedRequest(request);
    }
  };
  const handleOpenLearnerInfo = (learner: LearnerInfo) => {
    setSelectedLearnerForDialog(learner);
    setDialogOpen(true);
  };

  const handleScheduleCreate = async (
    schedules: Schedule[],
    courseId: string,
  ) => {
    if (!selectedRequest) return;

    // For lesson10 requests, only allow one lesson and ensure it's lesson 10
    if ((selectedRequest.type as string) === "lesson10") {
      if (schedules.length > 1) {
        toast({
          title: "Error",
          description:
            "Only one lesson can be scheduled for 10th lesson requests",
          variant: "destructive",
        });
        return;
      }

      if (schedules[0]?.lessonNumber !== 10) {
        toast({
          title: "Error",
          description: "You can only schedule lesson 10 for this request",
          variant: "destructive",
        });
        return;
      }
    }

    const rescheduleLessonNumber =
      (selectedRequest.type as string) === "reschedule" ||
      (selectedRequest.type as string) === "lesson10"
        ? Math.min(...schedules.map((s) => s.lessonNumber))
        : 1;

    createScheduleMutation.mutate({
      learnerId: selectedRequest.learner_id,
      schedules,
      courseId,
      rescheduleLessonNumber,
    });

  };

  const newRequests = useMemo(
    () => requests?.filter((r) => (r.type as string) === "new"),
    [requests],
  );
  const rescheduleRequests = useMemo(
    () => requests?.filter((r) => (r.type as string) === "reschedule"),
    [requests],
  );

  const tenthLessonRequests = useMemo(
    () => requests?.filter((r) => (r.type as string) === "lesson10"),
    [requests],
  );

  const handleSlotToggle = (dayOfWeek: number, timeSlot: TimeSlot) => {
    const key = `${dayOfWeek}-${timeSlot}`;
    setSelectedSlot((prev) => (prev === key ? null : key));
  };

  const handleSubmit = () => {
    // Handle the submission logic here
    console.log("Selected Slot:", selectedSlot);
  };
  const [instructorData, setInstructorData] = useState<any[]>([]);

  // Fetch learners with active enrollment and their schedules
  // Fetch learners with active enrollment and their schedules
  const {
    data: activeLearners,
    isLoading: isLoadingActiveLearners,
    refetch: refetchActiveLearners,
  } = useQuery({
    queryKey: ["activeLearners"],
    queryFn: async () => {
      // First, get active enrollment learner IDs
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("enrollment")
        .select("learner_id")
        .eq("status", "active");

      if (enrollmentError) throw enrollmentError;

      const { data: fetchInstructorData, error: instructorError } =
        await supabase.from("Instructor").select("*");
      if (instructorError) throw instructorError;
      setInstructorData(fetchInstructorData);

      // Directly fetch learners with their schedules in a single query
      const { data: learnersData, error: learnersError } = await supabase
        .from("Learner")
        .select(
          `
        id, 
        name, 
        area,
        phone,
        email,
        preferred_start_date,
        preferred_completion_days,
        prefers_two_hour_classes,
        two_hour_days,
        DL_test_date,
        pick_up_location,
        created_at,
        address_lat,
        address_lng,
        
        schedules:Schedule(
          id,
          date,
          start_time,
          end_time,
          instructor_id,
          lesson_id,
          course_id,
          learner_id,
          status,
          Lesson!inner(
            id,
            number
          )
        )
      `,
        )
        .in(
          "id",
          enrollmentData.map((e) => e.learner_id),
        )
        .order("created_at", { ascending: false });


      if (learnersError) throw learnersError;

      // Filter out learners who don't have any schedules
      const learnersWithSchedules = learnersData.filter(
        (learner) => learner.schedules && learner.schedules.length > 0,
      );

      return learnersWithSchedules;
    },
    keepPreviousData: true,
  });

  const handleTabChange = (value: string) => {
    // Reset selectedRequest when changing tabs
    setSelectedRequest(null);
  };

  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [processingScheduleId, setProcessingScheduleId] = useState<
    string | null
  >(null);

  const handleUpdateSchedule = async (
    scheduleId: string,
    updates: Partial<Schedule>,
  ) => {
    try {
      // Set loading state
      // setIsSendingInvites(true);
      // setProcessingScheduleId(scheduleId);

      // First, fetch the current schedule to get all its details
      const { data: currentSchedule, error: fetchError } = await supabase
        .from("Schedule")
        .select(
          "*, Learner(id, name, email, pick_up_location, address_lat, address_lng)",
        )
        .eq("id", scheduleId)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Fetch all schedules for the learner with their associated lesson information
      const { data: learnerSchedules, error: fetchError2 } = await supabase
        .from("Schedule")
        .select(
          `
          id, 
          date, 
          start_time, 
          end_time, 
          instructor_id, 
          lesson_id, 
          course_id, 
          learner_id,
          calendar_uid,
          calendar_sequence
        `,
        )
        .eq("learner_id", currentSchedule.Learner.id)
        .eq("course_id", currentSchedule.course_id);

      if (fetchError2) {
        throw new Error(fetchError2.message);
      }

      // Fetch all lessons for this course to get their lesson numbers
      const { data: courseLessons, error: lessonError } = await supabase
        .from("Lesson")
        .select("id, number")
        .eq("course_id", currentSchedule.course_id)
        .order("number", { ascending: true });

      if (lessonError) {
        throw new Error(lessonError.message);
      }

      // Create a mapping of current lesson IDs to their numbers
      const currentLessonMap = new Map();
      learnerSchedules.forEach((schedule) => {
        if (!schedule.lesson_id) return;

        const lesson = courseLessons.find((l) => l.id === schedule.lesson_id);
        if (lesson && lesson.number !== undefined) {
          currentLessonMap.set(schedule.lesson_id, {
            lessonId: schedule.lesson_id,
            currentNumber: lesson.number,
            schedule: schedule,
          });
        }
      });

      // Fetch all instructor details we'll need
      const instructorIds = new Set(
        learnerSchedules.map((s) => s.instructor_id),
      );
      const { data: instructorsData, error: instructorsError } = await supabase
        .from("Instructor")
        .select("id_instructor, name, email, phone")
        .in("id_instructor", Array.from(instructorIds));

      if (instructorsError) {
        throw new Error(
          `Error fetching instructors: ${instructorsError.message}`,
        );
      }

      // Create a map of instructor details for easy lookup
      const instructorsMap = new Map();
      instructorsData?.forEach((instructor) => {
        instructorsMap.set(instructor.id_instructor, instructor);
      });

      // // STEP 1: PREPARE CANCELLATION EVENTS BEFORE UPDATING THE DATABASE
      // // ---------------------------------------------------------------

      // // First, prepare cancellation event for the specific lesson being rescheduled
      const cancellationEvents = [];

      // Create start and end date objects for the current schedule
      const startDate = new Date(currentSchedule.date);
      const [startHour, startMinute] = currentSchedule.start_time
        .split(":")
        .map(Number);
      startDate.setHours(startHour, startMinute, 0);

      const endDate = new Date(currentSchedule.date);
      const [endHour, endMinute] = currentSchedule.end_time
        .split(":")
        .map(Number);
      endDate.setHours(endHour, endMinute, 0);

      // Get instructor details for this lesson
      const instructorId = currentSchedule.instructor_id;
      const instructorDetails = instructorsMap.get(instructorId) || {
        name: "Unknown Instructor",
        phone: "Contact InLane for details",
        email: "",
      };

      // Determine pickup location
      const pickupLocation =
        currentSchedule.Learner.pick_up_location ||
        (currentSchedule.Learner.address_lat &&
        currentSchedule.Learner.address_lng
          ? `${currentSchedule.Learner.address_lat},${currentSchedule.Learner.address_lng}`
          : "To be confirmed");

      // Get lesson number
      const lessonData = courseLessons.find(
        (l) => l.id === currentSchedule.lesson_id,
      );
      const lessonNumber = lessonData?.number || 0;

      // // IMPORTANT FIX: Always add cancellation event for the current schedule regardless of calendar_uid
      // // This ensures the old event is properly cancelled
      cancellationEvents.push({
        startTime: startDate,
        endTime: endDate,
        lessonNumber: lessonNumber,
        pickupLocation: pickupLocation,
        uid: currentSchedule.calendar_uid || `temp-${Date.now()}-${scheduleId}`,
        sequence: (currentSchedule.calendar_sequence || 0) + 1,
        isCancellation: true,
        instructorId: instructorId,
        instructorName: instructorDetails.name,
        instructorPhone: instructorDetails.phone,
        instructorEmail: instructorDetails.email,
      });

      // STEP 2: UPDATE THE DATABASE
      // ---------------------------

      // Update the selected schedule with the new date and time
      const { error: updateError } = await supabase
        .from("Schedule")
        .update({
          ...updates,
          calendar_sequence: (currentSchedule.calendar_sequence || 0) + 1,
          // IMPORTANT FIX: Reset calendar_uid to ensure a new one is generated
          calendar_uid: null,
        })
        .eq("id", scheduleId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Sort schedules chronologically (with the updated schedule)
      const updatedSchedules = [...learnerSchedules];
      const scheduleIndex = updatedSchedules.findIndex(
        (s) => s.id === scheduleId,
      );
      if (scheduleIndex >= 0) {
        updatedSchedules[scheduleIndex] = {
          ...updatedSchedules[scheduleIndex],
          ...updates,
        };
      }

      const sortedSchedules = updatedSchedules.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.start_time}`);
        const dateB = new Date(`${b.date}T${b.start_time}`);
        return dateA.getTime() - dateB.getTime();
      });

      // Create a mapping of lesson numbers to lesson IDs
      const lessonNumberToIdMap = courseLessons.reduce((map, lesson) => {
        map[lesson.number] = lesson.id;
        return map;
      }, {});

      // Track which lessons need to be updated due to reordering
      const lessonIdsWithChanges = new Set();
      const schedulesToUpdate = [];

      // Update lesson IDs in the database based on chronological order
      for (let i = 0; i < sortedSchedules.length; i++) {
        const schedule = sortedSchedules[i];
        const lessonNumber = i + 1;

        // Get the lesson ID that corresponds to this lesson number
        const newLessonId = lessonNumberToIdMap[lessonNumber];

        if (!newLessonId) {
          console.warn(`No lesson found for lesson number ${lessonNumber}`);
          continue;
        }

        // Check if this lesson's number has changed
        const oldLesson = currentLessonMap.get(schedule.lesson_id);
        if (oldLesson && oldLesson.currentNumber !== lessonNumber) {
          lessonIdsWithChanges.add(schedule.lesson_id);

          // IMPORTANT FIX: Always add cancellation event for lessons with changed numbers
          // This ensures all affected events are properly cancelled
          if (schedule.id !== scheduleId) {
            const lessonStartDate = new Date(schedule.date);
            const [lessonStartHour, lessonStartMinute] = schedule.start_time
              .split(":")
              .map(Number);
            lessonStartDate.setHours(lessonStartHour, lessonStartMinute, 0);

            const lessonEndDate = new Date(schedule.date);
            const [lessonEndHour, lessonEndMinute] = schedule.end_time
              .split(":")
              .map(Number);
            lessonEndDate.setHours(lessonEndHour, lessonEndMinute, 0);

            const lessonInstructorDetails = instructorsMap.get(
              schedule.instructor_id,
            ) || {
              name: "Unknown Instructor",
              phone: "Contact InLane for details",
              email: "",
            };

            cancellationEvents.push({
              startTime: lessonStartDate,
              endTime: lessonEndDate,
              lessonNumber: oldLesson.currentNumber,
              pickupLocation: pickupLocation,
              uid: schedule.calendar_uid || `temp-${Date.now()}-${schedule.id}`,
              sequence: (schedule.calendar_sequence || 0) + 1,
              isCancellation: true,
              instructorId: schedule.instructor_id,
              instructorName: lessonInstructorDetails.name,
              instructorPhone: lessonInstructorDetails.phone,
              instructorEmail: lessonInstructorDetails.email,
            });
          }
        }

        // Only update if the lesson ID has changed
        if (schedule.lesson_id !== newLessonId) {
          const { error: lessonUpdateError } = await supabase
            .from("Schedule")
            .update({
              lesson_id: newLessonId,
              calendar_sequence: (schedule.calendar_sequence || 0) + 1,
              // IMPORTANT FIX: Reset calendar_uid for all updated lessons
              calendar_uid: null,
            })
            .eq("id", schedule.id);

          if (lessonUpdateError) {
            throw new Error(
              `Failed to update lesson ID for schedule ${schedule.id}: ${lessonUpdateError.message}`,
            );
          }

          schedulesToUpdate.push({
            ...schedule,
            lesson_id: newLessonId,
            lessonNumber: lessonNumber,
          });
        }
        // If this is the schedule we're explicitly updating or its lesson number changed
        else if (
          schedule.id === scheduleId ||
          lessonIdsWithChanges.has(schedule.lesson_id)
        ) {
          schedulesToUpdate.push({
            ...schedule,
            ...(schedule.id === scheduleId ? updates : {}),
            lessonNumber: lessonNumber,
          });
        }
      }

      // STEP 3: PREPARE NEW EVENTS FOR UPDATED SCHEDULES
      // -----------------------------------------------

      const newEvents = [];

      // Fetch the updated schedules from the database
      const { data: updatedSchedulesData } = await supabase
        .from("Schedule")
        .select("*")
        .in(
          "id",
          schedulesToUpdate.map((s) => s.id),
        );

      // Create new events for updated schedules
      for (const schedule of schedulesToUpdate) {
        // Find the updated schedule in the database
        const updatedSchedule = updatedSchedulesData?.find(
          (s) => s.id === schedule.id,
        );
        if (!updatedSchedule) continue;

        // Create start and end date objects
        const newStartDate = new Date(updatedSchedule.date);
        const [newStartHour, newStartMinute] = updatedSchedule.start_time
          .split(":")
          .map(Number);
        newStartDate.setHours(newStartHour, newStartMinute, 0);

        const newEndDate = new Date(updatedSchedule.date);
        const [newEndHour, newEndMinute] = updatedSchedule.end_time
          .split(":")
          .map(Number);
        newEndDate.setHours(newEndHour, newEndMinute, 0);

        // Get instructor details
        const updatedInstructorId = updatedSchedule.instructor_id;
        const updatedInstructorDetails = instructorsMap.get(
          updatedInstructorId,
        ) || {
          name: "Unknown Instructor",
          phone: "Contact InLane for details",
          email: "",
        };

        // Add new event
        newEvents.push({
          startTime: newStartDate,
          endTime: newEndDate,
          lessonNumber: schedule.lessonNumber,
          pickupLocation: pickupLocation,
          uid: undefined, // Let the calendar function generate a new UID
          sequence: 0, // Reset sequence for new events
          isCancellation: false,
          instructorId: updatedInstructorId,
          instructorName: updatedInstructorDetails.name,
          instructorPhone: updatedInstructorDetails.phone,
          instructorEmail: updatedInstructorDetails.email,
        });
      }

      // In handleInstructorChange function:

      // In handleUpdateSchedule function:

      // STEP 4: SEND CALENDAR INVITATIONS
      // --------------------------------

      // Create a complete list of all events for this learner
      // const allScheduleEvents = sortedSchedules.map((schedule) => {
      //   const scheduleStartDate = new Date(schedule.date);
      //   const [scheduleStartHour, scheduleStartMinute] = schedule.start_time
      //     .split(":")
      //     .map(Number);
      //   scheduleStartDate.setHours(scheduleStartHour, scheduleStartMinute, 0);

      //   const scheduleEndDate = new Date(schedule.date);
      //   const [scheduleEndHour, scheduleEndMinute] = schedule.end_time
      //     .split(":")
      //     .map(Number);
      //   scheduleEndDate.setHours(scheduleEndHour, scheduleEndMinute, 0);

      //   const lessonData = courseLessons.find(
      //     (l) => l.id === schedule.lesson_id,
      //   );
      //   const instructorDetails = instructorsMap.get(
      //     schedule.instructor_id,
      //   ) || {
      //     name: "Unknown Instructor",
      //     phone: "Contact InLane for details",
      //     email: "",
      //   };

      //   return {
      //     startTime: scheduleStartDate,
      //     endTime: scheduleEndDate,
      //     lessonNumber: lessonData?.number || 0,
      //     pickupLocation: pickupLocation,
      //     instructorId: schedule.instructor_id,
      //     instructorName: instructorDetails.name,
      //     instructorPhone: instructorDetails.phone,
      //     instructorEmail: instructorDetails.email,
      //     isCancellation: false,
      //   };
      // });

      // // First, send cancellation events if there are any
      // if (cancellationEvents.length > 0 && currentSchedule.Learner.email) {
      //   // Get primary instructor email
      //   const primaryInstructorId = sortedSchedules[0]?.instructor_id;
      //   const primaryInstructor = instructorsMap.get(primaryInstructorId);
      //   const primaryInstructorEmail = primaryInstructor?.email;

      //   if (primaryInstructorEmail) {
      //     try {
      //       // Send cancellation events in a separate email
      //       await sendMultiEventCalendarInvite(
      //         currentSchedule.Learner.email,
      //         primaryInstructorEmail,
      //         cancellationEvents,
      //         primaryInstructor?.name || "Your Instructor",
      //         currentSchedule.Learner.name || "Student",
      //         currentSchedule.Learner.phone,
      //         {
      //           emailType: "cancellation",
      //           allEvents: allScheduleEvents, // Include all events for complete table
      //         },
      //         currentSchedule.Learner.id,
      //       );

      //       console.log(
      //         `Sent ${cancellationEvents.length} cancellation events successfully`,
      //       );
      //     } catch (error) {
      //       console.error("Error sending cancellation events:", error);
      //     }
      //   }
      // }

      // // Then, send new schedule events in a separate email
      // if (newEvents.length > 0 && currentSchedule.Learner.email) {
      //   // Get primary instructor email
      //   const primaryInstructorId = sortedSchedules[0]?.instructor_id;
      //   const primaryInstructor = instructorsMap.get(primaryInstructorId);
      //   const primaryInstructorEmail = primaryInstructor?.email;

      //   if (primaryInstructorEmail) {
      //     try {
      //       // Send new schedule events in a separate email
      //       const uidMap = await sendMultiEventCalendarInvite(
      //         currentSchedule.Learner.email,
      //         primaryInstructorEmail,
      //         newEvents,
      //         primaryInstructor?.name || "Your Instructor",
      //         currentSchedule.Learner.name || "Student",
      //         currentSchedule.Learner.phone,
      //         {
      //           emailType: "new",
      //           allEvents: allScheduleEvents, // Include all events for complete table
      //         },
      //         currentSchedule.Learner.id,
      //       );

      //       // Update the database with the new UIDs
      //       for (const schedule of schedulesToUpdate) {
      //         if (uidMap && uidMap[schedule.lessonNumber]) {
      //           await supabase
      //             .from("Schedule")
      //             .update({
      //               calendar_uid: uidMap[schedule.lessonNumber],
      //               calendar_sequence: 0, // Reset sequence for new UIDs
      //             })
      //             .eq("id", schedule.id);
      //         }
      //       }

      //       console.log(
      //         `Sent ${newEvents.length} new schedule events successfully`,
      //       );
      //     } catch (error) {
      //       console.error("Error sending new schedule events:", error);
      //     }
      //   }
      // }

      // // Notify the user that the schedule was updated
      // supabase.functions.invoke("send-message", {
      //   body: {
      //     message_type: "WEBAPP_RESCHEDULE_DONE_CHECK_NEW_SCHEDULE",
      //     learner_id: currentSchedule.learner_id,
      //   },
      // });

      // Refetch the active learners to reflect the changes in the UI
      await refetchActiveLearners();
      // window.location.reload();
      return true;
    } catch (error) {
      console.error("Error updating schedule:", error);
      throw error;
    } finally {
      // Reset loading state regardless of success or failure
      setIsSendingInvites(false);
      setProcessingScheduleId(null);
    }
  };

  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

  const [selectedInstructorId, setSelectedInstructorId] = useState<string>("");
  // Add this function to handle instructor changes with proper calendar updates
  // const handleInstructorChange = async (
  //   scheduleId: string,
  //   newInstructorId: string,
  // ) => {
  //   try {
  //     // Set loading state
  //     setIsSendingInvites(true);
  //     setProcessingScheduleId(scheduleId);

  //     // First, fetch the current schedule to get all its details
  //     const { data: currentSchedule, error: fetchError } = await supabase
  //       .from("Schedule")
  //       .select(
  //         "*, Learner(id, name, email, pick_up_location, address_lat, address_lng,phone)",
  //       )
  //       .eq("id", scheduleId)
  //       .single();

  //     if (fetchError) {
  //       throw new Error(fetchError.message);
  //     }

  //     // Fetch instructor details for both old and new instructors
  //     const instructorIds = [currentSchedule.instructor_id, newInstructorId];
  //     const { data: instructorsData, error: instructorsError } = await supabase
  //       .from("Instructor")
  //       .select("id_instructor, name, email, phone")
  //       .in("id_instructor", instructorIds);

  //     if (instructorsError) {
  //       throw new Error(
  //         `Error fetching instructors: ${instructorsError.message}`,
  //       );
  //     }

  //     // Create maps for easy lookup
  //     const instructorsMap = new Map();
  //     instructorsData?.forEach((instructor) => {
  //       instructorsMap.set(instructor.id_instructor, instructor);
  //     });

  //     // Get lesson details
  //     const { data: lessonData, error: lessonError } = await supabase
  //       .from("Lesson")
  //       .select("number, id")
  //       .eq("id", currentSchedule.lesson_id)
  //       .single();

  //     if (lessonError) {
  //       throw new Error(`Error fetching lesson: ${lessonError.message}`);
  //     }

  //     // Determine pickup location
  //     const pickupLocation =
  //       currentSchedule.Learner.pick_up_location ||
  //       (currentSchedule.Learner.address_lat &&
  //       currentSchedule.Learner.address_lng
  //         ? `${currentSchedule.Learner.address_lat},${currentSchedule.Learner.address_lng}`
  //         : "To be confirmed");

  //     // STEP 1: PREPARE CANCELLATION EVENT
  //     // ---------------------------------

  //     // Create start and end date objects for the current schedule
  //     const startDate = new Date(currentSchedule.date);
  //     const [startHour, startMinute] = currentSchedule.start_time
  //       .split(":")
  //       .map(Number);
  //     startDate.setHours(startHour, startMinute, 0);

  //     const endDate = new Date(currentSchedule.date);
  //     const [endHour, endMinute] = currentSchedule.end_time
  //       .split(":")
  //       .map(Number);
  //     endDate.setHours(endHour, endMinute, 0);

  //     // Get old instructor details
  //     const oldInstructorId = currentSchedule.instructor_id;
  //     const oldInstructorDetails = instructorsMap.get(oldInstructorId) || {
  //       name: "Previous Instructor",
  //       phone: "Contact InLane for details",
  //       email: "",
  //     };

  //     // Create cancellation event
  //     const cancellationEvent = {
  //       startTime: startDate,
  //       endTime: endDate,
  //       lessonNumber: lessonData?.number || 0,
  //       pickupLocation: pickupLocation,
  //       uid: currentSchedule.calendar_uid || `temp-${Date.now()}-${scheduleId}`,
  //       sequence: (currentSchedule.calendar_sequence || 0) + 1,
  //       isCancellation: true,
  //       instructorId: oldInstructorId,
  //       instructorName: oldInstructorDetails.name,
  //       instructorPhone: oldInstructorDetails.phone,
  //       instructorEmail: oldInstructorDetails.email,
  //     };

  //     // STEP 2: UPDATE THE DATABASE
  //     // ---------------------------

  //     // Update the schedule with the new instructor ID
  //     const { error: updateError } = await supabase
  //       .from("Schedule")
  //       .update({
  //         instructor_id: newInstructorId,
  //         calendar_sequence: (currentSchedule.calendar_sequence || 0) + 1,
  //         // Reset calendar_uid to ensure a new one is generated
  //         calendar_uid: null,
  //       })
  //       .eq("id", scheduleId);

  //     if (updateError) {
  //       throw new Error(`Error updating schedule: ${updateError.message}`);
  //     }

  //     // STEP 3: PREPARE NEW EVENT
  //     // ------------------------

  //     // Get new instructor details
  //     const newInstructorDetails = instructorsMap.get(newInstructorId) || {
  //       name: "New Instructor",
  //       phone: "Contact InLane for details",
  //       email: "",
  //     };

  //     // Create new event with the new instructor
  //     const newEvent = {
  //       startTime: startDate,
  //       endTime: endDate,
  //       lessonNumber: lessonData?.number || 0,
  //       pickupLocation: pickupLocation,
  //       uid: undefined, // Let the calendar function generate a new UID
  //       sequence: 0, // Reset sequence for new event
  //       isCancellation: false,
  //       instructorId: newInstructorId,
  //       instructorName: newInstructorDetails.name,
  //       instructorPhone: newInstructorDetails.phone,
  //       instructorEmail: newInstructorDetails.email,
  //     };

  //     // In handleInstructorChange function:

  //     // STEP 4: SEND CALENDAR INVITATIONS
  //     // --------------------------------

  //     // Create a complete list of all events for this learner
  //     const { data: allLearnerSchedules } = await supabase
  //       .from("Schedule")
  //       .select("*, Lesson(id, number)")
  //       .eq("learner_id", currentSchedule.learner_id)
  //       .eq("course_id", currentSchedule.course_id);

  //     // Format all schedules as events for display in emails
  //     const allScheduleEvents = allLearnerSchedules
  //       ?.map((schedule) => {
  //         // Skip the current schedule as it's being updated
  //         if (schedule.id === scheduleId) return null;

  //         const scheduleStartDate = new Date(schedule.date);
  //         const [scheduleStartHour, scheduleStartMinute] = schedule.start_time
  //           .split(":")
  //           .map(Number);
  //         scheduleStartDate.setHours(scheduleStartHour, scheduleStartMinute, 0);

  //         const scheduleEndDate = new Date(schedule.date);
  //         const [scheduleEndHour, scheduleEndMinute] = schedule.end_time
  //           .split(":")
  //           .map(Number);
  //         scheduleEndDate.setHours(scheduleEndHour, scheduleEndMinute, 0);

  //         const instructorDetails = instructorsMap.get(
  //           schedule.instructor_id,
  //         ) || {
  //           name: "Unknown Instructor",
  //           phone: "Contact InLane for details",
  //           email: "",
  //         };

  //         return {
  //           startTime: scheduleStartDate,
  //           endTime: scheduleEndDate,
  //           lessonNumber: schedule.Lesson?.number || 0,
  //           pickupLocation: pickupLocation,
  //           instructorId: schedule.instructor_id,
  //           instructorName: instructorDetails.name,
  //           instructorPhone: instructorDetails.phone,
  //           instructorEmail: instructorDetails.email,
  //           isCancellation: false,
  //         };
  //       })
  //       .filter(Boolean);

  //     // Add the new event to the complete list
  //     const completeEventsList = [...allScheduleEvents, newEvent];

  //     // First, send cancellation event
  //     if (currentSchedule.Learner.email && oldInstructorDetails.email) {
  //       try {
  //         // Send cancellation event with complete list of all events
  //         await sendMultiEventCalendarInvite(
  //           currentSchedule.Learner.email,
  //           oldInstructorDetails.email,
  //           [cancellationEvent], // Only send the cancellation event
  //           oldInstructorDetails.name,
  //           currentSchedule.Learner.name || "Student",
  //           currentSchedule.Learner.phone,
  //           {
  //             emailType: "cancellation",
  //             batchInfo: " - Instructor Change",
  //             allEvents: completeEventsList, // Include all events for complete table
  //           },
  //           currentSchedule.Learner.id,
  //         );

  //         console.log("Sent cancellation event for instructor change");
  //       } catch (error) {
  //         console.error("Error sending cancellation event:", error);
  //       }
  //     }

  //     // Then, send new event with the new instructor
  //     if (currentSchedule.Learner.email && newInstructorDetails.email) {
  //       try {
  //         // Send new event with complete list of all events
  //         const uidMap = await sendMultiEventCalendarInvite(
  //           currentSchedule.Learner.email,
  //           newInstructorDetails.email,
  //           [newEvent], // Only send the new event
  //           newInstructorDetails.name,
  //           currentSchedule.Learner.name || "Student",
  //           currentSchedule.Learner.phone,
  //           {
  //             emailType: "new",
  //             batchInfo: " - New Instructor",
  //             allEvents: completeEventsList, // Include all events for complete table
  //           },
  //           currentSchedule.Learner.id,
  //         );

  //         // Update the database with the new UID
  //         if (uidMap && uidMap[lessonData?.number]) {
  //           await supabase
  //             .from("Schedule")
  //             .update({
  //               calendar_uid: uidMap[lessonData?.number],
  //               calendar_sequence: 0, // Reset sequence for new UID
  //             })
  //             .eq("id", scheduleId);
  //         }

  //         console.log("Sent new event for instructor change");
  //       } catch (error) {
  //         console.error("Error sending new event:", error);
  //       }
  //     }

  //     // Refetch the active learners to reflect the changes in the UI
  //     await refetchActiveLearners();

  //     return true;
  //   } catch (error) {
  //     console.error("Error changing instructor:", error);
  //     throw error;
  //   } finally {
  //     // Reset loading state regardless of success or failure
  //     setIsSendingInvites(false);
  //     setProcessingScheduleId(null);
  //   }
  // };

  // Function to handle opening the "Change Instructor" dialog
  // const handleOpenInstructorChange = (schedule: any) => {
  //   setSelectedSchedule(schedule);
  //   setSelectedInstructorId(schedule.instructor_id); // Pre-select the current instructor
  //   setIsInstructorChangeModalOpen(true);
  // };

  // Function to handle opening the "Reschedule" dialog
  const handleOpenReschedule = async (schedule: any) => {
    setSelectedSchedule(schedule);
    setIsRescheduleModalOpen(true);
    return;


    // different path - make reschedule request to use calender views nad checks
    try {
      // setIsLoading(true);
      console.log("Rescheduling", schedule);
      // Create empty payment record (from admin side)
      const totalFee = 0;
      const learnerId = schedule?.learner_id;
      const { data: payment, error: paymentError } = await supabase
        .from("payment")
        .insert([
          {
            learner_id: learnerId,
            amount: totalFee,
            payment_type: "reschedule",
            status: "completed",
          },
        ])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create reschedule request
      const { data: rescheduleRequest, error: rescheduleError } = await supabase
        .from("reschedule_requests")
        .insert({
          amount: totalFee,
          status: totalFee > 0 ? "pending_payment" : "pending",
          learner_id: learnerId,
          lesson_ids: [schedule.lesson_id],
          payment_id: payment?.id,
        })
        .select()
        .single();

      if (rescheduleError) throw rescheduleError;

      toast({
        "title": "Reschedule requested",
        "description": `Reschedule request has been added for schedule at ${schedule.date})} ${schedule.start_time}`,
        "type": "destructive",
      });
      // If payment is required, initiate payment
      // not required on admin side
    } catch (error) {
      console.error("Error creating reschedule request from Admin:", error);
      alert("Failed to create reschedule request from Admin. Please try again.");
    } finally {
      // setIsLoading(false);
    }
    // if (isLoading) {
    //   return (
    //     <div className="flex h-full items-center justify-center">
    //       <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    //     </div>
    //   );
    // }
  };

  const handleChangeLessonStatus = async (schedule: any) => {
    setSelectedSchedule(schedule);
    // setIsRescheduleModalOpen(true);


    // different path - make reschedule request to use calender views nad checks
    try {
      // setIsLoading(true);
      console.log("Marking lesson complete", schedule);
      // Create empty payment record (from admin side)
      const totalFee = 0;
      const learnerId = schedule?.learner_id;

      // Create reschedule request
      const { data: updatedSchedule, error: updateScheduleError } = await supabase
        .from("Schedule")
        .update({
          status: schedule?.status === "completed" ? "booked" : "completed",
        })
        .eq("id", schedule?.id);

      if (updateScheduleError) throw updateScheduleError;

      toast({
        "title": "Lesson status updated",
        "description": `Lesson status updated for schedule at ${schedule.date})} ${schedule.start_time}`,
        "type": "destructive",
      });
      // If payment is required, initiate payment
      // not required on admin side

      refetchActiveLearners();
      window.location.reload();
    } catch (error) {
      console.error("Error updating lesson from Admin:", error);
      alert("Failed to update lesson from Admin. Please try again.");
    } finally {
      // setIsLoading(false);
    }
    // if (isLoading) {
    //   return (
    //     <div className="flex h-full items-center justify-center">
    //       <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    //     </div>
    //   );
    // }
  };

    

  function isOldestIncompleteSchedule(schedules: any, schedule: any): import("react").ReactNode {
    if (!schedules || !schedule) return false;
    // check that the passed scheduleId matches the oldest schedule from schedules array
    // by schedule.date and start_time
    if (schedule.status === "completed") return false;

    try {
      const sorted = schedules;
      // const sorted = [...schedules]
      // .filter(Boolean)
      // .sort((a, b) => {
      //   const dateA = new Date(`${a.date}T${a.start_time}`);
      //   const dateB = new Date(`${b.date}T${b.start_time}`);
      //   return dateA.getTime() - dateB.getTime();
      // });

      const firstIncomplete = sorted.find((s) => s.status !== "completed");
      // console.log("schedules, schedule, firstIncomplete ", schedules, schedule, firstIncomplete);
      return firstIncomplete?.id === schedule.id;
    } catch (e) {
      // on any parsing/sorting error, be conservative and disallow marking
      console.error("isOldestIncompleteSchedule error:", e);
      return false;
    }
  }

  return (
    <div
      className="h-flex flex min-h-screen flex-col bg-white p-8"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Schedule Management</h1>
          </div>
        </div>
      </div>

      <Tabs
        defaultValue="new"
        className="flex h-[calc(100%-73px)] flex-col"
        onValueChange={handleTabChange}
      >
        <div className="border-b px-6">
          <TabsList>
            <TabsTrigger value="new">
              New Schedules {newRequests?.length || 0}
            </TabsTrigger>
            <TabsTrigger value="reschedule">
              Reschedule Requests {rescheduleRequests?.length || 0}
            </TabsTrigger>
            <TabsTrigger value="lesson10">
              10th Lesson Requests {tenthLessonRequests?.length || 0}
            </TabsTrigger>
            <TabsTrigger value="active">
              Active Learners {activeLearners?.length || 0}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="new" className="h-full">
            <div className="grid h-full grid-cols-12 gap-4 p-6">
              {/* Learners List */}
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Learners Needing Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    {newRequests?.map((request) => (
                      <div key={request.id} className="mb-2">
                        <LearnerInfoCard
                          learner={{
                            id: request.Learner?.id || "",
                            name: request.Learner?.name || "",
                            phone: request.Learner?.phone || "",
                            email: request.Learner?.email || "",
                            area: request.Learner?.area || "",
                            pick_up_location: request.Learner?.pick_up_location,
                            pincode: request.Learner?.pincode,
                            signed_up: request.Learner?.signed_up,
                            created_at: request.Learner?.created_at,
                            address_lat: request.Learner?.address_lat,
                            address_lng: request.Learner?.address_lng,
                            preferred_start_date:
                              request.Learner?.preferred_start_date,
                            preferred_completion_days:
                              request.Learner?.preferred_completion_days,
                            prefers_two_hour_classes:
                              request.Learner?.prefers_two_hour_classes,
                            preferred_two_hour_days:
                              request.Learner?.two_hour_days,
                            DL_test_date: request.Learner?.DL_test_date,
                          }}
                          compact={true}
                          onClick={(learner) => {
                            handleRequestSelect(request);
                          }}
                        />
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Schedule Creation */}
              <Card className="col-span-10">
                <CardHeader>
                  <CardTitle>
                    {selectedRequest
                      ? `${selectedRequest.Learner?.name}'s Schedule`
                      : "Select a Learner"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedRequest 
                  ? (<p className="mb-4 mt-4 text-sm text-gray-500">
                      Distance measured from Instructor's base location to the selected learner location
                      <br />
                      Click on a slot to measure distances from previous booking of Instructor to learner
                    </p>)
                  :""}
                  
                  {selectedRequest ? (
                    <CreateScheduleWithInstructor
                      learnerId={selectedRequest.Learner?.id || ""}
                      learnerArea={
                        selectedRequest.Learner?.area || "Indiranagar"
                      }
                      request={selectedRequest}
                      onScheduleCreate={handleScheduleCreate}
                    />
                  ) : (
                    <div className="flex h-[calc(100vh-280px)] items-center justify-center text-gray-500">
                      Select a learner to create their schedule
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reschedule" className="h-full">
            <div className="grid h-full grid-cols-12 gap-4 p-6">
              {/* Learners List */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Reschedule Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    {rescheduleRequests?.map((request) => (
                      <div key={request.id} className="mb-2">
                        <LearnerInfoCard
                          learner={{
                            id: request.Learner?.id || "",
                            name: request.Learner?.name || "",
                            phone: request.Learner?.phone || "",
                            email: request.Learner?.email || "",
                            area: request.Learner?.area || "",
                            pick_up_location: request.Learner?.pick_up_location,
                            pincode: request.Learner?.pincode,
                            signed_up: request.Learner?.signed_up,
                            created_at: request.Learner?.created_at,
                            address_lat: request.Learner?.address_lat,
                            address_lng: request.Learner?.address_lng,
                            preferred_start_date:
                              request.Learner?.preferred_start_date,
                            preferred_completion_days:
                              request.Learner?.preferred_completion_days,
                            prefers_two_hour_classes:
                              request.Learner?.prefers_two_hour_classes,
                            preferred_two_hour_days:
                              request?.Learner?.two_hour_days,
                            DL_test_date: request.Learner?.DL_test_date,
                          }}
                          compact={true}
                          onClick={(learner) => {
                            handleRequestSelect(request);
                          }}
                        />
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Schedule Creation */}
              <Card className="md:col-span-10">
                <CardHeader>
                  <CardTitle>
                    {selectedRequest
                      ? `${selectedRequest.Learner?.name}'s Schedule`
                      : "Select a Learner"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedRequest ? (
                    <CreateSchedule
                      request={selectedRequest}
                      learnerId={selectedRequest.Learner?.id || ""}
                      learnerArea={
                        selectedRequest.Learner?.area || "Indiranagar"
                      }
                      onScheduleCreate={handleScheduleCreate}
                    />
                  ) : (
                    <div className="flex h-[calc(100vh-280px)] items-center justify-center text-gray-500">
                      Select a learner to create their schedule
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="lesson10" className="h-full">
            <div className="grid h-full grid-cols-12 gap-4 p-6">
              {/* Learners List */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>10th Lesson Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    {tenthLessonRequests?.map((request) => (
                      <div key={request.id} className="mb-2">
                        <LearnerInfoCard
                          learner={{
                            id: request.Learner?.id || "",
                            name: request.Learner?.name || "",
                            phone: request.Learner?.phone || "",
                            email: request.Learner?.email || "",
                            area: request.Learner?.area || "",
                            pick_up_location: request.Learner?.pick_up_location,
                            pincode: request.Learner?.pincode,
                            signed_up: request.Learner?.signed_up,
                            created_at: request.Learner?.created_at,
                            address_lat: request.Learner?.address_lat,
                            address_lng: request.Learner?.address_lng,
                            preferred_start_date:
                              request.Learner?.preferred_start_date,
                            preferred_completion_days:
                              request.Learner?.preferred_completion_days,
                            prefers_two_hour_classes:
                              request.Learner?.prefers_two_hour_classes,
                            preferred_two_hour_days:
                              request.Learner?.two_hour_days,
                            DL_test_date: request.Learner?.DL_test_date,
                          }}
                          compact={true}
                          onClick={(learner) => {
                            handleRequestSelect(request);
                          }}
                        />
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Schedule Creation */}
              <Card className="md:col-span-10">
                <CardHeader>
                  <CardTitle>
                    {selectedRequest
                      ? `${selectedRequest.Learner?.name}'s Schedule`
                      : "Select a Learner"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedRequest ? (
                    <CreateSchedule
                      request={selectedRequest}
                      learnerId={selectedRequest.Learner?.id || ""}
                      learnerArea={
                        selectedRequest.Learner?.area || "Indiranagar"
                      }
                      onScheduleCreate={handleScheduleCreate}
                    />
                  ) : (
                    <div className="flex h-[calc(100vh-280px)] items-center justify-center text-gray-500">
                      Select a learner to create their schedule
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="active" className="h-full">
            <div className="grid h-full grid-cols-1 gap-4 p-6 md:grid-cols-3">
              {/* Learners List */}
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Active Learners</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    {isLoadingActiveLearners ? (
                      <div className="flex items-center justify-center text-gray-500">
                        Loading...
                      </div>
                    ) : (
                      activeLearners?.map((learner) => (
                        <div key={learner.id} className="mb-2">
                          <LearnerInfoCard
                            learner={{
                              id: learner.id || "",
                              name: learner.name || "",
                              phone: learner.phone || "",
                              email: learner.email || "",
                              area: learner.area || "",
                              pick_up_location: learner.pick_up_location,
                              pincode: learner.pincode,
                              signed_up: learner.signed_up,
                              created_at: learner.created_at,
                              address_lat: learner.address_lat,
                              address_lng: learner.address_lng,
                              preferred_start_date:
                                learner.preferred_start_date,
                              preferred_completion_days:
                                learner.preferred_completion_days,
                              prefers_two_hour_classes:
                                learner.prefers_two_hour_classes,
                              preferred_two_hour_days: learner.two_hour_days,
                              DL_test_date: learner.DL_test_date,
                            }}
                            compact={true}
                            onClick={(learnerInfo) => {
                              handleActiveLearnerSelect(learner);
                            }}
                          />
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Schedule Management */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>
                    {selectedRequest
                      ? `${selectedRequest.name}'s Schedule`
                      : "Select a Learner"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedRequest ? (
                    <div className="space-y-4">
                      {selectedRequest?.schedules
                        ?.sort((a, b) => {
                          // Sort chronologically by date and time
                          const dateTimeA = new Date(
                            `${a.date}T${a.start_time}`,
                          );
                          const dateTimeB = new Date(
                            `${b.date}T${b.start_time}`,
                          );
                          return dateTimeA.getTime() - dateTimeB.getTime();
                        })
                        .map((schedule) => (
                          <div
                            key={schedule.id}
                            className="flex items-center justify-between rounded-md border p-3 hover:bg-gray-50"
                          >
                            <div>
                              <div className="font-medium">
                                Lesson {schedule.Lesson.number} - {schedule.date} - {schedule.start_time} to{" "}
                                {schedule.end_time}
                              </div>
                              <div className="text-sm text-gray-500">
                                Instructor:{" "}
                                {
                                  instructorData.find(
                                    (i) =>
                                      i.id_instructor ===
                                      schedule.instructor_id,
                                  )?.name
                                }
                              </div>
                              <div className="text-sm text-gray-500">
                                Status:{" "}
                                {
                                  schedule
                                  ? schedule.status
                                    ? schedule.status
                                    : "N/A"
                                  : "N/A"
                                }
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  Actions
                                </Button>
                              </DropdownMenuTrigger>
                              {/* Instructor should not be changed
                              abruptly without checking the availability calender.
                              Change of Instructor instructor can be done by raising a reschedule request
                              */ }
                              <DropdownMenuContent>
                                 {/* <DropdownMenuItem
                                  onClick={() =>
                                    handleOpenInstructorChange(schedule)
                                  }
                                >
                                  Change Instructor
                                </DropdownMenuItem> */}
                                <DropdownMenuItem
                                  onClick={() => handleOpenReschedule(schedule)}
                                >
                                  Reschedule
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleChangeLessonStatus(schedule)}
                                  // disabled={schedule.status === 'completed' || 
                                  //   !isOldestIncompleteSchedule(selectedRequest?.schedules, schedule)}
                                  >
                                  {/* {schedule.status === 'completed'
                                    ?'Mark Lesson as Completed (Lesson Completed)' 
                                    : isOldestIncompleteSchedule(selectedRequest?.schedules, schedule)
                                    ? 'Mark Lesson as Completed'
                                    : "Mark previous lessons complete"
                                  } */}
                                  Change lesson status
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="flex h-[calc(100vh-280px)] items-center justify-center text-gray-500">
                      Select a learner to manage their schedule
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Instructor Change Dialog */}
            {selectedSchedule && (
              <Dialog
                open={isInstructorChangeModalOpen}
                onOpenChange={(open) => {
                  // Only allow closing if not processing
                  if (!isSendingInvites) {
                    setIsInstructorChangeModalOpen(open);
                  }
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Instructor</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm">Warning: Change only if you know next instructor is available. 
                    If not sure, put a reschedule request and confirm using calender view.
                  </p>
                  <div className="space-y-4">
                    {/* Dropdown to Select Instructor */}
                    <Select
                      value={selectedInstructorId}
                      onValueChange={(value) => {
                        console.log("Selected Instructor ID:", value);
                        setSelectedInstructorId(value);
                      }}
                      disabled={isSendingInvites}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an instructor" />
                      </SelectTrigger>
                      <SelectContent>
                        {instructorData?.map((instructor) => (
                          <SelectItem
                            key={instructor.id_instructor}
                            value={instructor.id_instructor}
                          >
                            {instructor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsInstructorChangeModalOpen(false)}
                        disabled={isSendingInvites}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          if (!selectedInstructorId) {
                            toast({
                              title: "Error",
                              description:
                                "Please select an instructor before saving.",
                              variant: "destructive",
                            });
                            return;
                          }

                          try {
                            await handleInstructorChange(
                              selectedSchedule.id,
                              selectedInstructorId,
                            );
                            toast({
                              title: "Success",
                              description: "Instructor updated successfully.",
                            });

                            // Close the modal after saving
                            setIsInstructorChangeModalOpen(false);
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to update the instructor.",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={isSendingInvites}
                      >
                        {isSendingInvites ? (
                          <span className="flex items-center">
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                            Sending Invites...
                          </span>
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Reschedule Dialog */}
            {selectedSchedule && (
              <Dialog
                open={isRescheduleModalOpen}
                onOpenChange={(open) => {
                  // Only allow closing if not processing
                  if (!isSendingInvites) {
                    setIsRescheduleModalOpen(open);
                  }
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reschedule Lesson</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Editable Date Field */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Date
                        </label>
                        <input
                          type="date"
                          value={selectedSchedule.date}
                          onChange={(e) =>
                            setSelectedSchedule((prev) => ({
                              ...prev,
                              date: e.target.value,
                            }))
                          }
                          className="mt-1 block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Editable Time Field */}
                      <div className="flex items-center gap-8">
                        <label className="block text-sm font-medium text-gray-700">
                          Time
                        </label>
                        <div className="flex flex-col">
                          <Select
                            value={selectedSchedule.start_time}
                            onValueChange={(value) => {
                              const startTime = value;
                              // Calculate end time (1 hour after start time)
                              const [hours, minutes] = startTime
                                .split(":")
                                .map(Number);
                              const endHours = (hours + 1) % 24;
                              const endTime = `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;

                              setSelectedSchedule((prev) => ({
                                ...prev,
                                start_time: startTime,
                                end_time: endTime,
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a time" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }).map((_, hour) =>
                                [0, 30].map((minute) => (
                                  <SelectItem
                                    key={`${hour}-${minute}`}
                                    value={`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`}
                                  >
                                    {`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`}
                                  </SelectItem>
                                )),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <span className="text-gray-500">to</span>
                        <div className="flex flex-col">
                          <Select
                            value={selectedSchedule.end_time}
                            onValueChange={(value) =>
                              setSelectedSchedule((prev) => ({
                                ...prev,
                                end_time: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a time" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }).map((_, hour) =>
                                [0, 30].map((minute) => (
                                  <SelectItem
                                    key={`${hour}-${minute}`}
                                    value={`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`}
                                  >
                                    {`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`}
                                  </SelectItem>
                                )),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsRescheduleModalOpen(false)} // Close modal without saving
                        disabled={isSendingInvites}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          try {
                            // Save the updated schedule to Supabase
                            await handleUpdateSchedule(selectedSchedule.id, {
                              date: selectedSchedule.date,
                              start_time: selectedSchedule.start_time,
                              end_time: selectedSchedule.end_time,
                            });

                            // Update the selected request's schedules to ensure the UI reflects the changes
                            if (selectedRequest) {
                              // Fetch the updated schedules for this learner
                              const { data: updatedSchedules, error } =
                                await supabase
                                  .from("Schedule")
                                  .select(
                                    `
                                    id, 
                                    date, 
                                    start_time, 
                                    end_time, 
                                    instructor_id, 
                                    lesson_id, 
                                    course_id, 
                                    learner_id
                                  `,
                                                          )
                                  .eq("learner_id", selectedSchedule.learner_id)
                                  .eq("course_id", selectedSchedule.course_id);

                              if (!error && updatedSchedules) {
                                // Sort the schedules chronologically
                                const sortedSchedules = updatedSchedules.sort(
                                  (a, b) => {
                                    const dateA = new Date(
                                      `${a.date}T${a.start_time}`,
                                    );
                                    const dateB = new Date(
                                      `${b.date}T${b.start_time}`,
                                    );
                                    return dateA.getTime() - dateB.getTime();
                                  },
                                );

                                // Update the selected request with the sorted schedules
                                setSelectedRequest((prev) => ({
                                  ...prev,
                                  schedules: sortedSchedules,
                                }));
                              }
                            }

                            toast({
                              title: "Success",
                              description: "Schedule updated successfully.",
                            });

                            // Close the modal after saving
                            setIsRescheduleModalOpen(false);

                            // Refetch active learners to update the view
                            await refetchActiveLearners();
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to update the schedule.",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={isSendingInvites}
                      >
                        {isSendingInvites ? (
                          <span className="flex items-center">
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                            Sending Invites...
                          </span>
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>
        </div>
      </Tabs>
      {selectedLearnerForDialog && (
        <LearnerInfoDialog
          learner={selectedLearnerForDialog}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
