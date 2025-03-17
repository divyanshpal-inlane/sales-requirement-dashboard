import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

const DLTestDates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const {
    data: learners,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["learners", "dlTestDates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Learner")
        .select("*")
        .eq("has_a_DL", false)
        .is("DL_test_date", null)
        .eq("LL_application_approved", true); // Only fetch approved LL learners without a DL test date
      if (error) throw error;
      return data;
    },
  });

  const updateTestDateMutation = useMutation({
    mutationFn: async ({ learnerId, testDate }) => {
      const { error } = await supabase
        .from("Learner")
        .update({
          DL_test_date: testDate,
        })
        .eq("id", learnerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Driving test date scheduled successfully.",
      });
      // Invalidate and refetch to update the list
      queryClient.invalidateQueries(["learners", "dlTestDates"]);
      setSelectedLearner(null);
      setSelectedDate(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveTestDate = () => {
    if (!selectedLearner || !selectedDate) return;
    updateTestDateMutation.mutate({
      learnerId: selectedLearner.id,
      testDate: selectedDate,
    });
    supabase.functions.invoke("send-message", {
      body: {
        message_type: "WEBAPP_SCHEDULE_LESSON_10",
        learner_id: selectedLearner.id,
      },
    });
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading learners.</div>;

  return (
    <>
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
            <h1 className="text-2xl font-bold">Driving Test Dates</h1>
          </div>
        </div>
      </div>

      <div className="flex h-full w-full gap-4 p-4">
        {/* Left Panel - Learner Selection */}
        <Card className="w-1/2">
          <CardHeader>
            <CardTitle>Select Learner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] space-y-2 overflow-y-auto">
              {learners?.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  No learners ready for driving test
                </div>
              ) : (
                learners?.map((learner) => (
                  <div
                    key={learner.id}
                    className={`cursor-pointer rounded-lg p-3 transition-colors ${
                      selectedLearner?.id === learner.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => {
                      setSelectedLearner(learner);
                    }}
                  >
                    <div className="font-medium">{learner.name}</div>
                    <div className="text-sm opacity-75">ID: {learner.id}</div>
                    <div className="text-sm opacity-75">
                      LL ID: {learner.LL_application_id || "N/A"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Date Selection */}
        <Card className="w-1/2">
          <CardHeader>
            <CardTitle>Schedule Driving Test</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedLearner ? (
              <div className="space-y-4">
                <div>
                  <Label>Selected Learner</Label>
                  <div className="mt-1 font-medium">{selectedLearner.name}</div>
                </div>

                <div className="space-y-2">
                  <Label>Test Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground",
                        )}
                      >
                        {selectedDate ? (
                          format(selectedDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button
                  onClick={handleSaveTestDate}
                  disabled={!selectedDate}
                  className="w-full"
                >
                  Schedule Test
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                Select a learner to schedule a driving test
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default DLTestDates;
