import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft,
    Search, 
    X, 
    RefreshCcw, 
    Loader2, 
    Users,
    MoreHorizontal,
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
import { Input } from "@/components/ui/input";

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

  const [selectedInstructorId, setSelectedInstructorId] = useState<string>("");


  console.log(activeLearners);
  const filteredLearners = activeLearners?.filter((learner) => {
  const search = searchTerm.toLowerCase();

  // 1. Check Learner's own details
  const learnerMatches = 
    learner.name?.toLowerCase().includes(search) ||
    learner.email?.toLowerCase().includes(search) ||
    learner.phone?.includes(searchTerm);

  // 2. Check ALL instructors linked to this learner's schedules
  const instructorMatches = learner.schedules?.some((schedule) => 
    schedule.Instructor?.name?.toLowerCase().includes(search)
  );

  return learnerMatches || instructorMatches;
}
);

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
        defaultValue="active"
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
      <CardHeader className="pb-3">
        <CardTitle>Active Learners</CardTitle>
        <div className="mt-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by name, email or phone..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-340px)]">
          {isLoadingActiveLearners ? (
            <div className="flex items-center justify-center text-gray-500">
              Loading...
            </div>
          ) : filteredLearners?.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-gray-500">
              No learners found matching "{searchTerm}"
            </div>
          ) : (
            filteredLearners?.map((learner) => (
              <div key={learner.id} className="mb-2">
                <LearnerInfoCard
                  learner={{
                    id: learner.id || "",
                    name: learner.name || "",
                  }}
                  compact={true}
                  onClick={() => handleActiveLearnerSelect(learner)}
                />
              </div>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>

    {/* Schedule Management - INTEGRATED COMPONENT */}
    {selectedRequest ? (
      <LearnerSchedulesManager 
        learnerId={selectedRequest.id} 
        instructorData={instructorData} // Pass this if the manager needs the list for dropdowns
      />
    ) : (
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Select a Learner</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[calc(100vh-280px)] items-center justify-center text-gray-500">
            Select a learner from the list to manage their schedule
          </div>
        </CardContent>
      </Card>
    )}
  </div>
  
  {/* NOTE: The Instructor Change Dialog and Reschedule Dialog logic 
      should now live inside <LearnerSchedulesManager />. 
      They have been removed from here to prevent duplicate IDs and state conflicts.
  */}
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


interface LearnerSchedulesManagerProps {
  learnerId: string;
  instructorData: any[];
}

export const LearnerSchedulesManager = ({ 
  learnerId, 
  instructorData 
}: LearnerSchedulesManagerProps) => {
  const [learner, setLearner] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Modal States
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [isInstructorChangeModalOpen, setIsInstructorChangeModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedInstructorId, setSelectedInstructorId] = useState("");

  // 1. Data Fetching
  const syncData = useCallback(async () => {
    if (!learnerId) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("Learner")
        .select(`
          id, name, area, phone, email,
          schedules:Schedule(
            id, date, start_time, end_time, instructor_id,
            status,
            Lesson!inner(id, number),
            Instructor(name)
          )
        `)
        .eq("id", learnerId)
        .single();

      if (error) throw error;
      setLearner(data);
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const onUpdateStatus = async (scheduleId: string, newStatus: string) => {
    try {
      setIsProcessing(true);
      const { error } = await supabase
        .from("Schedule")
        .update({ status: newStatus })
        .eq("id", scheduleId);

      if (error) throw error;
      await syncData();
      toast({ title: "Status Updated", description: `Lesson marked as ${newStatus}.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedSchedule) return;
    try {
      setIsProcessing(true);
      const { error } = await supabase
        .from("Schedule")
        .update({
          date: selectedSchedule.date,
          start_time: selectedSchedule.start_time,
          end_time: selectedSchedule.end_time
        })
        .eq("id", selectedSchedule.id);

      if (error) throw error;
      setIsRescheduleModalOpen(false);
      await syncData();
      toast({ title: "Rescheduled", description: "Lesson updated successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 md:col-span-2">
      <Card>
        <CardHeader>
          <CardTitle>
            {isLoading ? "Updating..." : `${learner?.name ?? "Learner"}'s Schedule`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {learner?.schedules?.length > 0 ? (
              [...learner.schedules]
                .sort((a, b) => new Date(`${a.date}T${a.start_time ?? "00:00"}`).getTime() - new Date(`${b.date}T${b.start_time ?? "00:00"}`).getTime())
                .map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between rounded-md border p-3 hover:bg-gray-50">
                    <div className="space-y-1">
                      <div className="font-medium text-sm md:text-base">
                        Lesson {schedule.Lesson?.number ?? "N/A"} — {schedule.date ?? "N/A"}
                      </div>
                      <div className="text-xs md:text-sm text-gray-500">
                        {schedule.start_time?.substring(0, 5) ?? "N/A"} - {schedule.end_time?.substring(0, 5) ?? "N/A"}
                        <span className="mx-2">|</span>
                        Instructor: {schedule.Instructor?.name ?? "Unassigned"}
                      </div>
                      <div className="text-xs font-medium uppercase text-gray-600">
                        Status: {schedule.status ?? "N/A"}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isProcessing}>Actions</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onUpdateStatus(schedule.id, "completed")}>
                          Mark as Completed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedSchedule(schedule);
                          setSelectedInstructorId(schedule.instructor_id);
                          setIsInstructorChangeModalOpen(true);
                        }}>
                          Change Instructor
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedSchedule({ ...schedule });
                          setIsRescheduleModalOpen(true);
                        }}>
                          Reschedule
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUpdateStatus(schedule.id, schedule.status === "paused" ? "booked" : "paused")}>
                          {schedule.status === "paused" ? "Resume Lesson" : "Pause Lesson"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
            ) : (
              <div className="text-center py-10 text-gray-500">
                {isLoading ? "Fetching data..." : "No records found."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructor Dialog */}
      <Dialog open={isInstructorChangeModalOpen} onOpenChange={setIsInstructorChangeModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Instructor</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <Select value={selectedInstructorId} onValueChange={setSelectedInstructorId}>
              <SelectTrigger><SelectValue placeholder="Select Instructor" /></SelectTrigger>
              <SelectContent>
                {instructorData?.map((ins) => (
                  <SelectItem key={ins.id_instructor} value={ins.id_instructor}>{ins.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsInstructorChangeModalOpen(false)}>Cancel</Button>
              <Button onClick={onSaveInstructor} disabled={isProcessing}>Confirm</Button>
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
            <DialogDescription>
              Set reschedule date and time
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedSchedule && (
              <div className="space-y-4">
                {/* Date Field */}
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-medium text-gray-700">Date</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <Select
                      value={selectedSchedule.start_time || ""}
                      onValueChange={(value) => {
                        const startTime = value;
                        const [hours, minutes] = startTime.split(":").map(Number);
                        
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
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <span className="text-gray-500 mt-6">to</span>
                  
                  {/* End Time Field (Filtered) */}
                  <div className="flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
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
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsRescheduleModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleRescheduleSubmit} disabled={isProcessing}>
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