import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  Loader2,
  MoreHorizontal,
  RefreshCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
      rescheduleLessonNumber,
    }: {
      learnerId: string;
      schedules: Schedule[];
      courseId: string;
      rescheduleLessonNumber?: number;
    }) => {
      console.log("=== CREATE SCHEDULE MUTATION ===");
      console.log("learnerId:", learnerId);
      console.log("schedules:", schedules);
      console.log("courseId:", courseId);
      console.log("schedules.length:", schedules.length);

      if (schedules.length === 0) {
        console.warn("WARNING: No schedules to create/update!");
      }

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

      // VALIDATION: Check for conflicts before creating schedules
      const conflicts: string[] = [];

      for (const schedule of schedules) {
        const dateStr = schedule.date.toISOString().split("T")[0];
        const [hours, minutes] = schedule.start_time.split(":").map(Number);
        const endHours = (hours + 1) % 24;
        const endTime = `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;

        // Check if instructor already has a booking at this time
        const { data: existingInstructorSchedules, error: checkError } =
          await supabase
            .from("Schedule")
            .select("id, date, start_time, end_time, Learner(name)")
            .eq("instructor_id", schedule.instructorId)
            .eq("date", dateStr)
            .neq("status", "paused")
            .not("isTentative", "eq", true);

        if (!checkError && existingInstructorSchedules) {
          for (const existing of existingInstructorSchedules) {
            // Check for time overlap
            const existingStart = existing.start_time;
            const existingEnd = existing.end_time;

            // Check if times overlap
            if (
              (schedule.start_time >= existingStart &&
                schedule.start_time < existingEnd) ||
              (endTime > existingStart && endTime <= existingEnd) ||
              (schedule.start_time <= existingStart && endTime >= existingEnd)
            ) {
              const learnerName = (existing.Learner as any)?.name || "Unknown";
              conflicts.push(
                `Instructor already booked on ${dateStr} at ${existingStart} for ${learnerName}`,
              );
            }
          }
        }
      }

      // If there are conflicts, throw an error
      if (conflicts.length > 0) {
        throw new Error(
          `Scheduling conflicts detected:\n${conflicts.join("\n")}`,
        );
      }

      // Create schedules
      // In the createScheduleMutation function:

      for (const schedule of schedules) {
        if (!schedule?.otp || !schedule.otp_end) {
          console.error("No otp for schedule:", schedule);
        } else {
          console.log(
            "Auth of lesson are generated",
            schedule.otp,
            schedule.otp_end,
          );
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

      // Only renumber lessons for NEW schedule creation, NOT for reschedules
      // During reschedule, lessons should keep their original numbers
      if (!rescheduleLessonNumber) {
        // Renumber lessons based on chronological order after schedule creation
        // Fetch all schedules for this learner+course with Lesson data
        const { data: allSchedules, error: fetchError } = await supabase
          .from("Schedule")
          .select("id, date, start_time, Lesson!inner(id, number)")
          .eq("learner_id", learnerId)
          .eq("course_id", courseId)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true });

        if (fetchError) {
          console.error(
            "Error fetching schedules for renumbering:",
            fetchError,
          );
        } else if (allSchedules && allSchedules.length > 0) {
          // Sort schedules by date and time
          const sortedSchedules = [...allSchedules].sort((a, b) => {
            const dateTimeA = new Date(`${a.date}T${a.start_time}`).getTime();
            const dateTimeB = new Date(`${b.date}T${b.start_time}`).getTime();
            return dateTimeA - dateTimeB;
          });

          // Update lesson numbers based on chronological order
          for (let i = 0; i < sortedSchedules.length; i++) {
            const schedule = sortedSchedules[i];
            if (schedule.Lesson?.id) {
              const { error: lessonError } = await supabase
                .from("Lesson")
                .update({ number: i + 1 })
                .eq("id", schedule.Lesson.id);

              if (lessonError) {
                console.error("Error updating lesson number:", lessonError);
              }
            }
          }
        }
      }
    },
  });

  const handleActiveLearnerSelect = (learner: any) => {
    console.log("Selected active Learner:", learner);
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

    // Capture the request at mutation time to avoid race conditions
    // (selectedRequest can be cleared by useEffect before onSuccess runs)
    const currentRequest = selectedRequest;

    createScheduleMutation.mutate(
      {
        learnerId: selectedRequest.learner_id,
        schedules,
        courseId,
        rescheduleLessonNumber,
      },
      {
        onSuccess: (_, variables) => {
          toast({
            title: "Schedule created",
            description: "The schedule has been created successfully.",
          });
          console.log(
            "Schedule mutation succeeded, completing reschedule request:",
            currentRequest?.id,
          );
          if (currentRequest) {
            completeRescheduleRequestMutation.mutate(
              {
                requestId: currentRequest.id,
              },
              {
                onSuccess: () => {
                  console.log("Reschedule request marked as completed");
                  const lessonNumber =
                    currentRequest.type === "reschedule"
                      ? Math.min(
                          ...variables.schedules.map((s) => s.lessonNumber),
                        )
                      : 1;
                  if (currentRequest.type === "new") {
                    supabase.functions.invoke("send-message", {
                      body: {
                        message_type: "SCHEDULE_PREPARED",
                        learner_id: currentRequest.learner_id,
                        start_date: format(
                          new Date(variables.schedules[0].date),
                          "dd/MM/yyyy",
                        ),
                        start_time: variables.schedules[0].start_time,
                      },
                    });
                  }
                  if (currentRequest.type === "reschedule") {
                    supabase.functions.invoke("send-message", {
                      body: {
                        message_type:
                          "WEBAPP_RESCHEDULE_DONE_CHECK_NEW_SCHEDULE",
                        learner_id: currentRequest.learner_id,
                      },
                    });
                  }
                  if (currentRequest.type === "lesson10") {
                    supabase.functions.invoke("send-message", {
                      body: {
                        message_type: "WEBAPP_LESSON_10_SCHEDULED",
                        learner_id: currentRequest.learner_id,
                      },
                    });
                  }
                },
                onError: (error) => {
                  console.error("Error completing reschedule request:", error);
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
      },
    );
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
          ),
          Instructor(
            name
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

  //useEffect(() => {
  //console.log('Active Learners updated:', activeLearners);
  //}, [activeLearners]);

  const handleTabChange = (value: string) => {
    // Reset selectedRequest when changing tabs
    setSelectedRequest(null);
  };

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedInstructorId, setSelectedInstructorId] = useState<
    string | null
  >(null);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(
    null,
  );

  // Inside your main Dashboard/Tabs component
  const [selectedFilterInstructorId, setSelectedFilterInstructorId] =
    useState<string>("");

  // This handles the "Clearing" logic
  const handleInstructorChange = (id: string) => {
    setSelectedInstructorId(id);
    setSelectedLearnerId(null); // Clear the right bar (Schedules)
    // The left bar (Learner List) will automatically filter based on this ID
  };
  console.log(activeLearners);
  const filteredLearners = activeLearners?.filter((learner) => {
    const search = searchTerm.toLowerCase();

    // 1. Check Learner's own details
    const learnerMatches =
      learner.name?.toLowerCase().includes(search) ||
      learner.email?.toLowerCase().includes(search) ||
      learner.phone?.includes(searchTerm);

    // 2. Check ALL instructors linked to this learner's schedules
    // const instructorMatches = learner.schedules?.some((schedule) =>
    //   schedule.Instructor?.name?.toLowerCase().includes(search)
    // );

    return learnerMatches; // || instructorMatches;
  });

  return (
    <div
      className="h-flex flex min-h-screen flex-col bg-white p-4"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="border-b bg-white px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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
        defaultValue="active"
        className="flex h-[calc(100%-73px)] flex-col"
        onValueChange={handleTabChange}
      >
        <div className="border-b px-4">
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
            <div className="grid h-full grid-cols-12 gap-2 p-4">
              {/* Learners List */}
              <Card className="col-span-2">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">
                    Learners Needing Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <ScrollArea className="h-[calc(100vh-240px)]">
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
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">
                    {selectedRequest
                      ? `${selectedRequest.Learner?.name}'s Schedule`
                      : "Select a Learner"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {selectedRequest ? (
                    <p className="mb-2 text-sm text-gray-500">
                      Distance measured from Instructor's base location to the
                      selected learner location
                      <br />
                      Click on a slot to measure distances from previous booking
                      of Instructor to learner
                    </p>
                  ) : (
                    ""
                  )}

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
            <div className="grid h-full grid-cols-12 gap-2 p-4">
              {/* Learners List */}
              <Card className="md:col-span-2">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">Reschedule Requests</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <ScrollArea className="h-[calc(100vh-240px)]">
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
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">
                    {selectedRequest
                      ? `${selectedRequest.Learner?.name}'s Schedule`
                      : "Select a Learner"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
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
                    <div className="flex h-[calc(100vh-240px)] items-center justify-center text-gray-500">
                      Select a learner to create their schedule
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="lesson10" className="h-full">
            <div className="grid h-full grid-cols-12 gap-2 p-4">
              {/* Learners List */}
              <Card className="md:col-span-2">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">
                    10th Lesson Requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <ScrollArea className="h-[calc(100vh-240px)]">
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
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">
                    {selectedRequest
                      ? `${selectedRequest.Learner?.name}'s Schedule`
                      : "Select a Learner"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
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
                    <div className="flex h-[calc(100vh-240px)] items-center justify-center text-gray-500">
                      Select a learner to create their schedule
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="active" className="h-full space-y-2">
            {/* TOP BAR: Instructor Filter */}
            <div className="px-4 pt-2">
              <div className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Users size={18} className="text-indigo-600" />
                  <span>Filter by Instructor:</span>
                </div>
                <Select
                  value={selectedFilterInstructorId || "all"}
                  onValueChange={(val) => {
                    setSelectedFilterInstructorId(val === "all" ? "" : val);
                    setSelectedRequest(null); // Clear right bar when instructor changes
                  }}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="All Instructors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Instructors</SelectItem>
                    {instructorData?.map((ins) => (
                      <SelectItem
                        key={ins.id_instructor}
                        value={ins.id_instructor}
                      >
                        {ins.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* MAIN CONTENT: Left and Right Bars */}
            <div className="grid h-full grid-cols-1 gap-2 p-4 pt-0 md:grid-cols-3">
              {/* LEFT BAR: Learners List */}
              <Card className="md:col-span-1">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm">Active Learners</CardTitle>
                  <div className="mt-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search..."
                        className="h-8 pl-8 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    {isLoadingActiveLearners ? (
                      <div className="flex items-center justify-center py-10 text-gray-500">
                        <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </div>
                    ) : filteredLearners?.length === 0 ? (
                      <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                        No learners found matching "{searchTerm}"
                      </div>
                    ) : (
                      filteredLearners
                        // Filter learners locally if an instructor is selected
                        ?.filter((learner) => {
                          if (!selectedFilterInstructorId) return true;
                          // Assumes learner object has a schedule join or instructor_id reference
                          return learner.schedules?.some(
                            (s) =>
                              s.instructor_id === selectedFilterInstructorId,
                          );
                        })
                        .map((learner) => (
                          <div key={learner.id} className="mb-2">
                            <LearnerInfoCard
                              learner={{
                                id: learner.id || "",
                                name: learner.name || "",
                              }}
                              // Highlight the selected learner
                              className={
                                selectedRequest?.id === learner.id
                                  ? "border-indigo-500 bg-indigo-50"
                                  : ""
                              }
                              compact={true}
                              onClick={() => handleActiveLearnerSelect(learner)}
                            />
                          </div>
                        ))
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* RIGHT BAR: Schedule Management Integrated Component */}
              <div className="md:col-span-2">
                {selectedRequest ? (
                  <LearnerSchedulesManager
                    key={selectedRequest.id} // Key ensures component re-mounts/refreshes for new learner
                    learnerId={selectedRequest.id}
                    instructorData={instructorData}
                  />
                ) : (
                  <Card className="h-full border-dashed">
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm text-gray-400">
                        Schedule Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="flex h-[calc(100vh-280px)] flex-col items-center justify-center text-center text-gray-400">
                        <div className="mb-3 rounded-full bg-gray-50 p-4">
                          <Users size={36} className="text-gray-200" />
                        </div>
                        <p className="max-w-[250px] text-sm">
                          Select a learner from the list to manage their
                          schedule and instructor assignments.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
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

interface InstructorFilterProps {
  instructors: any[];
  selectedInstructorId: string | null;
  onInstructorChange: (id: string) => void;
}

export const InstructorFilter = ({
  instructors,
  selectedInstructorId,
  onInstructorChange,
}: InstructorFilterProps) => {
  return (
    <div className="mb-6 flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Users size={18} className="text-indigo-600" />
        <span>Filter by Instructor:</span>
      </div>
      <Select
        value={selectedInstructorId || "all"}
        onValueChange={(val) => onInstructorChange(val === "all" ? "" : val)}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="All Instructors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Instructors</SelectItem>
          {instructors.map((ins) => (
            <SelectItem key={ins.id_instructor} value={ins.id_instructor}>
              {ins.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedInstructorId && (
        <span className="text-xs text-gray-400 animate-in fade-in">
          Showing learners assigned to this instructor
        </span>
      )}
    </div>
  );
};

interface LearnerSchedulesManagerProps {
  learnerId: string;
  instructorData: any[];
}

export const LearnerSchedulesManager = ({
  learnerId,
  instructorData,
}: LearnerSchedulesManagerProps) => {
  const [learner, setLearner] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Modal States
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [isInstructorChangeModalOpen, setIsInstructorChangeModalOpen] =
    useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedInstructorId, setSelectedInstructorId] = useState("");

  // 1. Data Fetching
  const syncData = useCallback(async () => {
    if (!learnerId) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("Learner")
        .select(
          `
          id, name, area, phone, email, pick_up_location, address_lat, address_lng,
          schedules:Schedule(
            id, date, start_time, end_time, instructor_id,
            status,
            Lesson!inner(id, number),
            Instructor(name)
          )
        `,
        )
        .eq("id", learnerId)
        .single();

      if (error) throw error;

      // Sort schedules by date and time, then assign lesson numbers based on chronological order
      if (data && data.schedules) {
        const sortedSchedules = [...data.schedules].sort((a, b) => {
          const dateTimeA = new Date(
            `${a.date}T${a.start_time || "00:00:00"}`,
          ).getTime();
          const dateTimeB = new Date(
            `${b.date}T${b.start_time || "00:00:00"}`,
          ).getTime();
          return dateTimeA - dateTimeB;
        });

        // Assign lesson numbers based on chronological position
        const schedulesWithCorrectNumbers = sortedSchedules.map(
          (schedule, index) => ({
            ...schedule,
            Lesson: schedule.Lesson
              ? {
                  ...schedule.Lesson,
                  number: index + 1, // Use chronological position as lesson number
                }
              : null,
          }),
        );

        setLearner({ ...data, schedules: schedulesWithCorrectNumbers });
      } else {
        setLearner(data);
      }
    } catch (error: any) {
      console.error("Data fetch error:", error.message);
    } finally {
      setIsLoading(false);
    }
  }, [learnerId]);

  useEffect(() => {
    syncData();
  }, [syncData]);

  // 2. Action Handlers
  const onSaveInstructor = async () => {
    if (!selectedInstructorId || !selectedSchedule) return;
    try {
      setIsProcessing(true);
      const { error } = await supabase
        .from("Schedule")
        .update({ instructor_id: selectedInstructorId })
        .eq("id", selectedSchedule.id);

      if (error) throw error;
      setIsInstructorChangeModalOpen(false);
      await syncData();
      toast({ title: "Updated", description: "Instructor changed." });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const onUpdateStatus = async (
    scheduleId: string | number,
    newStatus: string,
  ) => {
    try {
      setIsProcessing(true);
      // Convert to number if it's a string, as the database expects an integer ID
      const numericId =
        typeof scheduleId === "string" ? Number(scheduleId) : scheduleId;

      const { error } = await supabase
        .from("Schedule")
        .update({ status: newStatus })
        .eq("id", numericId);

      if (error) throw error;
      await syncData();
      toast({
        title: "Status Updated",
        description: `Lesson marked as ${newStatus}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedSchedule || !learner) return;
    try {
      setIsProcessing(true);

      // 0. First fetch the OLD schedule data before updating (for calendar cancellation)
      const { data: oldScheduleData, error: oldScheduleError } = await supabase
        .from("Schedule")
        .select(
          "*, Lesson(id, number), Instructor(id_instructor, name, email, phone)",
        )
        .eq("id", selectedSchedule.id)
        .single();

      if (oldScheduleError) throw oldScheduleError;

      const oldDate = oldScheduleData.date;
      const oldStartTime = oldScheduleData.start_time;
      const oldEndTime = oldScheduleData.end_time;
      const calendarUid = oldScheduleData.calendar_uid;
      const calendarSequence = oldScheduleData.calendar_sequence || 0;
      const lessonNumber = oldScheduleData.Lesson?.number || 1;
      const instructorName = oldScheduleData.Instructor?.name || "Instructor";
      const instructorEmail = oldScheduleData.Instructor?.email || "";
      const instructorPhone = oldScheduleData.Instructor?.phone || "";
      const instructorId = oldScheduleData.Instructor?.id_instructor || "";

      // 1. Update the specific schedule with new date/time and increment calendar_sequence
      const newSequence = calendarSequence + 1;
      const { error: updateError } = await supabase
        .from("Schedule")
        .update({
          date: selectedSchedule.date,
          start_time: selectedSchedule.start_time,
          end_time: selectedSchedule.end_time,
          calendar_sequence: newSequence,
        })
        .eq("id", selectedSchedule.id);

      if (updateError) throw updateError;

      // 2. Get course_id from the already-fetched oldScheduleData (no extra query needed)
      const courseId = oldScheduleData?.course_id;

      if (courseId) {
        // 3. Fetch all schedules for this learner+course with Lesson data
        const { data: allSchedules, error: fetchError } = await supabase
          .from("Schedule")
          .select("id, date, start_time, Lesson!inner(id, number)")
          .eq("learner_id", learner.id)
          .eq("course_id", courseId)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true });

        if (fetchError) throw fetchError;

        // 4. Sort schedules by date and time (already sorted by query, but ensure consistency)
        const sortedSchedules = [...(allSchedules || [])].sort((a, b) => {
          const dateTimeA = new Date(`${a.date}T${a.start_time}`).getTime();
          const dateTimeB = new Date(`${b.date}T${b.start_time}`).getTime();
          return dateTimeA - dateTimeB;
        });

        // 5. Prepare lesson updates with new numbering based on chronological order
        const lessonUpdates = sortedSchedules
          .filter((schedule) => schedule.Lesson?.id)
          .map((schedule, index) => ({
            id: schedule.Lesson.id,
            number: index + 1,
          }));

        // 6. Bulk update lessons with new numbers (parallelized for performance)
        if (lessonUpdates.length > 0) {
          const updatePromises = lessonUpdates.map((update) =>
            supabase
              .from("Lesson")
              .update({ number: update.number })
              .eq("id", update.id),
          );
          const results = await Promise.all(updatePromises);
          results.forEach((result, index) => {
            if (result.error) {
              console.error(
                `Error updating lesson ${lessonUpdates[index].id} number:`,
                result.error,
              );
            }
          });
        }
      }

      // 7. Send calendar invites and notification in parallel for performance
      const calendarInvitePromise = (async () => {
        if (learner.email && instructorEmail) {
          try {
            const pickupLocation =
              learner.pick_up_location ||
              (learner.address_lat && learner.address_lng
                ? `${learner.address_lat},${learner.address_lng}`
                : "To be confirmed");

            const events = [];

            // Create cancellation event for old schedule (if we have a calendar_uid)
            if (calendarUid) {
              const oldStartDate = new Date(oldDate);
              const [oldStartHour, oldStartMin] = oldStartTime
                .split(":")
                .map(Number);
              oldStartDate.setHours(oldStartHour, oldStartMin, 0);

              const oldEndDate = new Date(oldDate);
              const [oldEndHour, oldEndMin] = oldEndTime.split(":").map(Number);
              oldEndDate.setHours(oldEndHour, oldEndMin, 0);

              events.push({
                startTime: oldStartDate,
                endTime: oldEndDate,
                lessonNumber: lessonNumber,
                pickupLocation: pickupLocation,
                uid: calendarUid,
                sequence: newSequence,
                isCancellation: true,
                instructorName: instructorName,
                instructorPhone: instructorPhone,
                instructorEmail: instructorEmail,
                instructorId: instructorId,
              });
            }

            // Create new event for the updated schedule
            const newStartDate = new Date(selectedSchedule.date);
            const [newStartHour, newStartMin] = selectedSchedule.start_time
              .split(":")
              .map(Number);
            newStartDate.setHours(newStartHour, newStartMin, 0);

            const newEndDate = new Date(selectedSchedule.date);
            const [newEndHour, newEndMin] = selectedSchedule.end_time
              .split(":")
              .map(Number);
            newEndDate.setHours(newEndHour, newEndMin, 0);

            events.push({
              startTime: newStartDate,
              endTime: newEndDate,
              lessonNumber: lessonNumber,
              pickupLocation: pickupLocation,
              uid: calendarUid || undefined, // Reuse UID if exists, otherwise generate new
              sequence: newSequence,
              isCancellation: false,
              instructorName: instructorName,
              instructorPhone: instructorPhone,
              instructorEmail: instructorEmail,
              instructorId: instructorId,
            });

            // Send calendar invites
            const uidMap = await sendMultiEventCalendarInvite(
              learner.email,
              instructorEmail,
              events,
              instructorName,
              learner.name || "Student",
              learner.phone || "",
              "reschedule",
              learner.id,
            );

            // Update the schedule with the new calendar_uid if one was generated
            if (uidMap && uidMap[lessonNumber] && !calendarUid) {
              await supabase
                .from("Schedule")
                .update({ calendar_uid: uidMap[lessonNumber] })
                .eq("id", selectedSchedule.id);
            }

            console.log("Calendar invites sent successfully for reschedule");
          } catch (calendarError) {
            console.error("Error sending calendar invites:", calendarError);
            // Don't fail the entire operation if calendar invites fail
          }
        } else {
          console.warn("Missing email addresses, skipping calendar invites");
        }
      })();

      // 8. Send notification to customer about reschedule
      const notificationPromise = supabase.functions.invoke("send-message", {
        body: {
          message_type: "WEBAPP_RESCHEDULE_DONE_CHECK_NEW_SCHEDULE",
          learner_id: learner.id,
        },
      });

      // Wait for both calendar and notification to complete
      await Promise.all([calendarInvitePromise, notificationPromise]);

      setIsRescheduleModalOpen(false);
      await syncData();
      toast({
        title: "Rescheduled",
        description:
          "Lesson rescheduled, calendar updated, and customer notified.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2 md:col-span-2">
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-sm">
            {isLoading
              ? "Updating..."
              : `${learner?.name ?? "Learner"}'s Schedule`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="space-y-2">
            {learner?.schedules?.length > 0 ? (
              [...learner.schedules]
                .sort(
                  (a, b) =>
                    new Date(`${a.date}T${a.start_time ?? "00:00"}`).getTime() -
                    new Date(`${b.date}T${b.start_time ?? "00:00"}`).getTime(),
                )
                .map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between rounded-md border p-2 hover:bg-gray-50"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium md:text-sm">
                        Lesson {schedule.Lesson?.number ?? "N/A"} —{" "}
                        {schedule.date ?? "N/A"}
                      </div>
                      <div className="text-xs text-gray-500 md:text-sm">
                        {schedule.start_time?.substring(0, 5) ?? "N/A"} -{" "}
                        {schedule.end_time?.substring(0, 5) ?? "N/A"}
                        <span className="mx-2">|</span>
                        Instructor: {schedule.Instructor?.name ?? "Unassigned"}
                      </div>
                      <div className="text-xs font-medium uppercase text-gray-600">
                        Status: {schedule.status ?? "N/A"}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isProcessing}
                        >
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            onUpdateStatus(schedule.id, "completed")
                          }
                        >
                          Mark as Completed
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedSchedule(schedule);
                            setSelectedInstructorId(schedule.instructor_id);
                            setIsInstructorChangeModalOpen(true);
                          }}
                        >
                          Change Instructor
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedSchedule({ ...schedule });
                            setIsRescheduleModalOpen(true);
                          }}
                        >
                          Reschedule
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            onUpdateStatus(
                              schedule.id,
                              schedule.status === "paused"
                                ? "booked"
                                : "paused",
                            )
                          }
                        >
                          {schedule.status === "paused"
                            ? "Resume Lesson"
                            : "Pause Lesson"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
            ) : (
              <div className="py-10 text-center text-gray-500">
                {isLoading ? "Fetching data..." : "No records found."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructor Dialog */}
      <Dialog
        open={isInstructorChangeModalOpen}
        onOpenChange={setIsInstructorChangeModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Instructor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select
              value={selectedInstructorId}
              onValueChange={setSelectedInstructorId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Instructor" />
              </SelectTrigger>
              <SelectContent>
                {instructorData?.map((ins) => (
                  <SelectItem key={ins.id_instructor} value={ins.id_instructor}>
                    {ins.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsInstructorChangeModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={onSaveInstructor} disabled={isProcessing}>
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog - EXACT structure provided */}
      <Dialog
        open={isRescheduleModalOpen}
        onOpenChange={(open) => {
          if (!isProcessing) {
            setIsRescheduleModalOpen(open);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Lesson</DialogTitle>
            <DialogDescription>Set reschedule date and time</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedSchedule && (
              <div className="space-y-4">
                {/* Date Field */}
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedSchedule.date || ""}
                    onChange={(e) =>
                      setSelectedSchedule((prev: any) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    className="mt-1 block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-8">
                  {/* Start Time Field */}
                  <div className="flex flex-col">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Start Time
                    </label>
                    <Select
                      value={selectedSchedule.start_time || ""}
                      onValueChange={(value) => {
                        const startTime = value;
                        const [hours, minutes] = startTime
                          .split(":")
                          .map(Number);

                        // Default end time to 1 hour later
                        const endHours = (hours + 1) % 24;
                        const endTime = `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;

                        setSelectedSchedule((prev: any) => ({
                          ...prev,
                          start_time: startTime,
                          end_time: endTime,
                        }));
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Start" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }).map((_, hour) =>
                          [0, 30].map((minute) => {
                            const val = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;
                            return (
                              <SelectItem key={`start-${val}`} value={val}>
                                {val.substring(0, 5)}
                              </SelectItem>
                            );
                          }),
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <span className="mt-6 text-gray-500">to</span>

                  {/* End Time Field (Filtered) */}
                  <div className="flex flex-col">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      End Time
                    </label>
                    <Select
                      value={selectedSchedule.end_time || ""}
                      onValueChange={(value) =>
                        setSelectedSchedule((prev: any) => ({
                          ...prev,
                          end_time: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="End" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }).map((_, hour) =>
                          [0, 30].map((minute) => {
                            const val = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;

                            const isPastStart = selectedSchedule.start_time
                              ? val > selectedSchedule.start_time
                              : true;

                            if (!isPastStart) return null;

                            return (
                              <SelectItem key={`end-${val}`} value={val}>
                                {val.substring(0, 5)}
                              </SelectItem>
                            );
                          }),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsRescheduleModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRescheduleSubmit}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
