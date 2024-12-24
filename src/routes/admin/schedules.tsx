import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import CreateSchedule from "@/components/lesson/CreateSchedule";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useMutationCompleteRescheduleRequest } from "@/queries/learner";
import {
  SchedulingRequests,
  useSchedulingRequests,
} from "@/queries/preferences";

export type Schedule = {
  date: Date;
  hour: number;
  instructorId: string;
  lessonId: string;
};

export default function AdminSchedules() {
  const { data: requests, isLoading, isRefetching } = useSchedulingRequests();
  const [selectedRequest, setSelectedRequest] = useState<
    SchedulingRequests[number] | null
  >(null);
  const { toast } = useToast();

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
        schedules.map((schedule) => ({
          learner_id: learnerId,
          course_id: courseId,
          lesson_id: schedule.lessonId,
          instructor_id: schedule.instructorId,
          date: schedule.date.toISOString().split("T")[0],
          start_time: `${schedule.hour}:00:00`,
          end_time: `${schedule.hour + 1}:00:00`,
          enabled: true,
        })),
      );

      if (error) throw error;

      // Update needs_scheduling flag
      const { error: updateError } = await supabase
        .from("Learner")
        .update({ needs_scheduling: false })
        .eq("id", learnerId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({
        title: "Schedule created",
        description: "The schedule has been created successfully.",
      });
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

    await createScheduleMutation.mutateAsync({
      learnerId: selectedRequest.learner_id,
      schedules,
      courseId,
    });
    await completeRescheduleRequestMutation.mutateAsync({
      requestId: selectedRequest.id,
    });
  };

  const [newRequests, rescheduleRequests] = useMemo(() => {
    return [
      requests?.filter((r) => r.type === "new"),
      requests?.filter((r) => r.type === "reschedule"),
    ];
  }, [requests]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Schedule Management</h1>
      </div>

      <Tabs defaultValue="new" className="flex h-[calc(100%-73px)] flex-col">
        <div className="border-b px-6">
          <TabsList>
            <TabsTrigger value="new">New Schedules</TabsTrigger>
            <TabsTrigger value="reschedule">Reschedule Requests</TabsTrigger>
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
                    <CreateSchedule
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
        </div>
      </Tabs>
    </div>
  );
}
