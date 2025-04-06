import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

const LearnerLLDetails = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [appointmentId, setAppointmentId] = useState("");
  const [llApproved, setLlApproved] = useState(false);

  const {
    data: learners,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["learners", "llDetails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Learner")
        .select("*")
        .eq("has_a_DL", false)
        .is("LL_result", null)
        .is("LL_application_approved", false); // Only fetch non-approved learners
      if (error) throw error;
      return data;
    },
  });

  const updateLearnerMutation = useMutation({
    mutationFn: async ({ learnerId, appointmentId, llApproved }) => {
      const { error } = await supabase
        .from("Learner")
        .update({
          LL_application_id: appointmentId,
          LL_application_approved: llApproved,
        })
        .eq("id", learnerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Learner LL details updated successfully.",
      });
      // Invalidate and refetch to update the list
      queryClient.invalidateQueries(["learners", "llDetails"]);
      setSelectedLearner(null);
      setAppointmentId("");
      setLlApproved(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveAppointmentId = () => {
    if (!selectedLearner || !appointmentId) return;
    
    updateLearnerMutation.mutate({
      learnerId: selectedLearner.id,
      appointmentId,
      llApproved: false,
    });
    console.log(`Submitting LL application...:${appointmentId}`);
    supabase.functions.invoke("send-message", {
      body: {
        message_type: "LL_APPLICATION_SUBMITTED",
        learner_id: selectedLearner.id,
        appointment_number: appointmentId,
      },
    });
  };

  const handleSaveLLApproval = () => {
    if (!selectedLearner || !appointmentId) return;
    updateLearnerMutation.mutate({
      learnerId: selectedLearner.id,
      appointmentId,
      llApproved: true,
    });
    supabase.functions.invoke("send-message", {
      body: {
        message_type: "LL_APPLICATION_UPDATE",
        learner_id: selectedLearner.id,
      },
    });
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading learners.</div>;

  return (
    <div className="min-h-screen bg-white p-8" style={{ backgroundImage: 'url("/assets/bg_pattern.svg")', backgroundRepeat: 'repeat', backgroundSize: 'cover' }}>
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
            <h1 className="text-2xl font-bold">LL Application</h1>
          </div>
        </div>
      </div>
      {/* Left Panel - Learner Selection */}
      <div className="flex h-full w-full gap-4 p-4">
        <Card className="w-1/3">
          <CardHeader>
            <CardTitle>Select Learner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] space-y-2 overflow-y-auto">
              {learners?.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  No pending learners to process
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
                      setAppointmentId(learner.LL_application_id || "");
                      setLlApproved(learner.LL_application_approved || false);
                    }}
                  >
                    <div className="font-medium">{learner.name}</div>
                    <div className="text-sm opacity-75">ID: {learner.id}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Middle Panel - Application ID Entry */}
        <Card className="w-1/3">
          <CardHeader>
            <CardTitle>LL Application Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedLearner ? (
              <div className="space-y-4">
                <div>
                  <Label>Selected Learner</Label>
                  <div className="mt-1 font-medium">{selectedLearner.name}</div>
                </div>
                <div>
                  <Label htmlFor="appointmentId">Application ID</Label>
                  <Input
                    id="appointmentId"
                    value={appointmentId}
                    onChange={(e) => setAppointmentId(e.target.value)}
                    
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleSaveAppointmentId}
                  disabled={
                    !appointmentId 
                  }
                  className="w-full"
                >
                  Save Application ID
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                Select a learner to enter application details
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel - LL Approval */}
        <Card className="w-1/3">
          <CardHeader>
            <CardTitle>LL Approval</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedLearner?.LL_application_id ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="llApproved"
                    checked={llApproved}
                    onCheckedChange={setLlApproved}
                    disabled={selectedLearner?.LL_application_approved}
                  />
                  <Label htmlFor="llApproved">LL Approved</Label>
                </div>
                <Button
                  onClick={handleSaveLLApproval}
                  disabled={
                    !llApproved || selectedLearner?.LL_application_approved
                  }
                  className="w-full"
                >
                  Save Approval Status
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                Enter application ID first
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LearnerLLDetails;
