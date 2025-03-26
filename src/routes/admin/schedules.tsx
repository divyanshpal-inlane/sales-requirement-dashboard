import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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

export type Schedule = {
  date: Date;
  hour: number;
  instructorId: string;
  lessonId: string;
  lessonNumber: number;
  start_time: string;
  end_time: string;
  otp: string;
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
      const { error } = await supabase.from("Schedule").insert(
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
          };
        }),
      );

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

                    start_date: variables.schedules[0].date
                      .toISOString()
                      .split("T")[0],
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

  const handleRequestSelect = (request: SchedulingRequests[number]) => {
    setSelectedRequest(request);
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

      // Then, fetch learner details with their schedules
      const { data: learnersData, error: learnersError } = await supabase
        .from("Learner")
        .select(
          `
          id, 
          name, 
          area, 
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

      return learnersData;
    },
    keepPreviousData: true,
  });

  const handleUpdateSchedule = async (
    scheduleId: string,
    updates: Partial<Schedule>,
  ) => {
    const { error } = await supabase
      .from("Schedule")
      .update(updates)
      .eq("id", scheduleId);

    if (error) {
      throw new Error(error.message); // Throw error to be caught in the "Save" button logic
    }
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
    <div className="flex h-full flex-col">
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

      <Tabs defaultValue="new" className="flex h-[calc(100%-73px)] flex-col">
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
            <div className="grid h-full grid-cols-1 gap-4 p-6 md:grid-cols-3">
              {/* Learners List */}
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Learners Needing Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    {newRequests?.map((request) => (
                      <div key={request.id} className="mb-2">
                        <Button
                          variant={
                            selectedRequest?.id === request.id
                              ? "default"
                              : "outline"
                          }
                          className="w-full justify-start"
                          onClick={() => handleRequestSelect(request)}
                        >
                          <div className="text-left">
                            <div className="font-medium">
                              {request.Learner?.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.Learner?.area}
                            </div>
                          </div>
                        </Button>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Schedule Creation */}
              <Card className="md:col-span-2">
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
            <div className="grid h-full grid-cols-1 gap-4 p-6 md:grid-cols-3">
              {/* Learners List */}
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Reschedule Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    {rescheduleRequests?.map((request) => (
                      <div key={request.id} className="mb-2">
                        <Button
                          variant={
                            selectedRequest?.id === request.id
                              ? "default"
                              : "outline"
                          }
                          className="w-full justify-start"
                          onClick={() => handleRequestSelect(request)}
                        >
                          <div className="text-left">
                            <div className="font-medium">
                              {request.Learner?.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.Learner?.area}
                            </div>
                          </div>
                        </Button>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Schedule Creation */}
              <Card className="md:col-span-2">
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
            <div className="grid h-full grid-cols-1 gap-4 p-6 md:grid-cols-3">
              {/* Learners List */}
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>10th Lesson Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    {tenthLessonRequests?.map((request) => (
                      <div key={request.id} className="mb-2">
                        <Button
                          variant={
                            selectedRequest?.id === request.id
                              ? "default"
                              : "outline"
                          }
                          className="w-full justify-start"
                          onClick={() => handleRequestSelect(request)}
                        >
                          <div className="text-left">
                            <div className="font-medium">
                              {request.Learner?.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.Learner?.area}
                            </div>
                          </div>
                        </Button>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Schedule Creation */}
              <Card className="md:col-span-2">
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
                          <Button
                            variant={
                              selectedRequest?.id === learner.id
                                ? "default"
                                : "outline"
                            }
                            className="w-full justify-start"
                            onClick={() => setSelectedRequest(learner)}
                          >
                            <div className="text-left">
                              <div className="font-medium">{learner.name}</div>
                              <div className="text-sm text-gray-500">
                                {learner.area}
                              </div>
                            </div>
                          </Button>
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
                      {selectedRequest?.schedules?.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="flex items-center justify-between"
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
                                    i.id_instructor === schedule.instructor_id,
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
                    <div>
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 h-10"
                      />
                    </div>

                    {/* Editable Time Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={selectedSchedule.start_time}
                        onChange={(e) =>
                          setSelectedSchedule((prev) => ({
                            ...prev,
                            start_time: e.target.value,
                          }))
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 h-10"
                      />
                      <div className="mt-4" />
                      <label className="block text-sm font-medium text-gray-700">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={selectedSchedule.end_time}
                        onChange={(e) =>
                          setSelectedSchedule((prev) => ({
                            ...prev,
                            end_time: e.target.value,
                          }))
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 h-10"
                      />
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

                            toast({
                              title: "Success",
                              description: "Schedule updated successfully.",
                            });

                            // Close the modal after saving
                            setIsRescheduleModalOpen(false);
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
    </div>
  );
}
