import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
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
import { format } from "date-fns";

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
              calendar_uid: schedule.calendar_uid || "", // Include the calendar_uid
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
      });
    } else {
      // Otherwise, just select the learner
      setSelectedRequest(learner);
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
          learner_id
        )
      `,
        )
        .in(
          "id",
          enrollmentData.map((e) => e.learner_id),
        );

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

  const handleUpdateSchedule = async (
    scheduleId: string,
    updates: Partial<Schedule>,
  ) => {
    // Update the selected schedule with the new date and time
    const { error: updateError } = await supabase
      .from("Schedule")
      .update(updates)
      .eq("id", scheduleId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Fetch all schedules for the learner with their associated lesson information
    const { data: learnerSchedules, error: fetchError } = await supabase
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

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    // Fetch all lessons for this course to get their lesson numbers
    const { data: courseLessons, error: lessonError } = await supabase
      .from("Lesson")
      .select("id, number")
      .eq("course_id", selectedSchedule.course_id)
      .order("number", { ascending: true });

    if (lessonError) {
      throw new Error(lessonError.message);
    }

    // Sort schedules chronologically
    const sortedSchedules = learnerSchedules.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.start_time}`);
      const dateB = new Date(`${b.date}T${b.start_time}`);
      return dateA.getTime() - dateB.getTime();
    });

    // Create a mapping of lesson numbers to lesson IDs
    const lessonNumberToIdMap = courseLessons.reduce((map, lesson) => {
      map[lesson.number] = lesson.id;
      return map;
    }, {});

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

      // Only update if the lesson ID has changed
      if (schedule.lesson_id !== newLessonId) {
        const { error: lessonUpdateError } = await supabase
          .from("Schedule")
          .update({ lesson_id: newLessonId })
          .eq("id", schedule.id);

        if (lessonUpdateError) {
          throw new Error(
            `Failed to update lesson ID for schedule ${schedule.id}: ${lessonUpdateError.message}`,
          );
        }
      }
    }

    // Refetch the active learners to reflect the changes in the UI
    await refetchActiveLearners();
  };

  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

  const [selectedInstructorId, setSelectedInstructorId] = useState<string>("");

  // Function to handle opening the "Change Instructor" dialog
  const handleOpenInstructorChange = (schedule: any) => {
    setSelectedSchedule(schedule);
    setSelectedInstructorId(schedule.instructor_id); // Pre-select the current instructor
    setIsInstructorChangeModalOpen(true);
  };

  // Function to handle opening the "Reschedule" dialog
  const handleOpenReschedule = (schedule: any) => {
    setSelectedSchedule(schedule);
    setIsRescheduleModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
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
            <TabsTrigger value="active">Active Learners</TabsTrigger>
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
                                {schedule.date} - {schedule.start_time} to{" "}
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
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  Actions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleOpenInstructorChange(schedule)
                                  }
                                >
                                  Change Instructor
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenReschedule(schedule)}
                                >
                                  Reschedule
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
                onOpenChange={setIsInstructorChangeModalOpen}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Instructor</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Dropdown to Select Instructor */}
                    <Select
                      value={selectedInstructorId} // Bind the selected instructor ID
                      onValueChange={(value) => {
                        console.log("Selected Instructor ID:", value);
                        setSelectedInstructorId(value);
                      }} // Update state on selection
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
                        onClick={() => setIsInstructorChangeModalOpen(false)} // Close modal without saving
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
                            // Save the selected instructor to Supabase
                            await handleUpdateSchedule(selectedSchedule.id, {
                              instructor_id: selectedInstructorId,
                            });

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
                      >
                        Save
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
                onOpenChange={setIsRescheduleModalOpen}
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
                                [0, 15, 30, 45].map((minute) => (
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
                                [0, 15, 30, 45].map((minute) => (
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
                      >
                        Save
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
