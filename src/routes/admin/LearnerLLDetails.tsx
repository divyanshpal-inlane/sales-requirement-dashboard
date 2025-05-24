import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  LearnerInfo,
  LearnerInfoDialog,
} from "@/components/admin/LearnerInfoCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

// Animated Search Bar Component
const AnimatedSearchBar = ({ value, onChange, placeholder }) => {
  const searchTerms = [
    "Search by name...",
    "Search by phone...",
    "Search by LL ID...",
  ];
  const [currentTermIndex, setCurrentTermIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const currentTerm = searchTerms[currentTermIndex];

    const timeout = setTimeout(
      () => {
        if (!isDeleting && currentText.length < currentTerm.length) {
          setCurrentText(currentTerm.slice(0, currentText.length + 1));
        } else if (isDeleting && currentText.length > 0) {
          setCurrentText(currentText.slice(0, -1));
        } else if (!isDeleting && currentText.length === currentTerm.length) {
          setTimeout(() => setIsDeleting(true), 2000);
        } else if (isDeleting && currentText.length === 0) {
          setIsDeleting(false);
          setCurrentTermIndex((prev) => (prev + 1) % searchTerms.length);
        }
      },
      isDeleting ? 50 : 100,
    );

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentTermIndex, searchTerms]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
      <Input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={value ? "" : `${currentText}${showCursor ? "|" : ""}`}
        className="rounded-lg border-2 border-gray-200 py-2 pl-10 pr-4 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
};

const LearnerLLDetails = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [appointmentId, setAppointmentId] = useState("");
  const [llApproved, setLlApproved] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLearnerForDialog, setSelectedLearnerForDialog] =
    useState<LearnerInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
        .is("LL_application_approved", false);
      if (error) throw error;
      return data;
    },
  });

  // New query for past LL applications
  const {
    data: pastLLApplications,
    isLoading: isPastLLLoading,
    isError: isPastLLError,
  } = useQuery({
    queryKey: ["learners", "pastLLApplications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Learner")
        .select("*")
        .eq("has_a_DL", false)
        .eq("LL_application_approved", true);
      if (error) throw error;
      return data;
    },
  });

  // Filter past LL applications based on search term
  const filteredPastApplications = pastLLApplications?.filter((learner) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      learner.name?.toLowerCase().includes(searchLower) ||
      learner.phone?.toLowerCase().includes(searchLower) ||
      learner.LL_application_id?.toLowerCase().includes(searchLower)
    );
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
      queryClient.invalidateQueries(["learners", "llDetails"]);
      queryClient.invalidateQueries(["learners", "pastLLApplications"]);
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

  const sendAdminEmail = async (subject: string, message: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-admin-email",
        {
          body: { subject, message },
        },
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error sending admin email:", error);
      throw error;
    }
  };

  const handleSaveLLApproval = () => {
    if (!selectedLearner || !appointmentId) return;
    updateLearnerMutation.mutate(
      {
        learnerId: selectedLearner.id,
        appointmentId,
        llApproved: true,
      },
      {
        onSuccess: async () => {
          await supabase.functions.invoke("send-message", {
            body: {
              message_type: "LL_APPLICATION_UPDATE",
              learner_id: selectedLearner.id,
            },
          });

          await sendAdminEmail(
            "Schedule DL Test Date - LL Approved",
            `Learner's License has been approved for ${selectedLearner.name} (Phone: ${selectedLearner.phone}).Please schedule a driving test date for this learner in the DL Test Dates section.`,
          );

          toast({
            title: "Success",
            description: "LL approval updated and notifications sent.",
          });
        },
      },
    );
  };

  const handleLearnerSelect = (learner) => {
    if (selectedLearner?.id === learner.id) {
      handleOpenLearnerInfo(learner);
    } else {
      setSelectedLearner(learner);
      setAppointmentId(learner.LL_application_id || "");
      setLlApproved(learner.LL_application_approved || false);
    }
  };

  const handleOpenLearnerInfo = (learner) => {
    setSelectedLearnerForDialog({
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
      comments: learner.comments,
    });
    setDialogOpen(true);
  };

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  if (isError)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-red-500">Error loading learners.</div>
      </div>
    );

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
      }}
    >
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
              className="h-10 w-10 hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              LL Application Management
            </h1>
          </div>
        </div>
      </div>

      {/* Main three panels */}
      <div className="flex h-full w-full gap-6 p-6">
        {/* Left Panel - Learner Selection */}
        <Card className="w-1/3 border-0 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-lg font-semibold text-gray-800">
              Select Learner
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {learners?.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <div className="text-lg font-medium">No pending learners</div>
                  <div className="text-sm">
                    All learners have been processed
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {learners?.map((learner) => (
                    <div
                      key={learner.id}
                      className={`cursor-pointer p-4 transition-all duration-200 hover:bg-gray-50 ${
                        selectedLearner?.id === learner.id
                          ? "border-r-4 border-blue-500 bg-blue-50"
                          : ""
                      }`}
                      onClick={() => handleLearnerSelect(learner)}
                    >
                      <div className="font-semibold text-gray-900">
                        {learner.name}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        📱 {learner.phone}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Middle Panel - Application ID Entry */}
        <Card className="w-1/3 border-0 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="text-lg font-semibold text-gray-800">
              LL Application Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {selectedLearner ? (
              <div className="space-y-6">
                <div className="rounded-lg bg-gray-50 p-4">
                  <Label className="text-sm font-medium text-gray-600">
                    Selected Learner
                  </Label>
                  <div className="mt-2 text-lg font-semibold text-gray-900">
                    {selectedLearner.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    📱 {selectedLearner.phone}
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="appointmentId"
                    className="text-sm font-medium text-gray-700"
                  >
                    LL Application ID
                  </Label>
                  <Input
                    id="appointmentId"
                    value={appointmentId}
                    onChange={(e) => setAppointmentId(e.target.value)}
                    className="mt-2 border-2 focus:border-green-500 focus:ring-green-200"
                    placeholder="Enter application ID"
                  />
                </div>
                <Button
                  onClick={handleSaveAppointmentId}
                  disabled={!appointmentId || updateLearnerMutation.isPending}
                  className="w-full bg-green-600 py-2.5 font-medium text-white hover:bg-green-700"
                >
                  {updateLearnerMutation.isPending
                    ? "Saving..."
                    : "Save Application ID"}
                </Button>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500">
                <div className="text-lg font-medium">No learner selected</div>
                <div className="mt-2 text-sm">
                  Choose a learner from the left panel to continue
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel - LL Approval */}
        <Card className="w-1/3 border-0 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-violet-50">
            <CardTitle className="text-lg font-semibold text-gray-800">
              LL Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {selectedLearner?.LL_application_id ? (
              <div className="space-y-6">
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="text-sm font-medium text-gray-600">
                    Application ID
                  </div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    {selectedLearner.LL_application_id}
                  </div>
                </div>
                <div className="flex items-center space-x-3 rounded-lg bg-purple-50 p-4">
                  <Checkbox
                    id="llApproved"
                    checked={llApproved}
                    onCheckedChange={setLlApproved}
                    disabled={selectedLearner?.LL_application_approved}
                    className="data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600"
                  />
                  <Label
                    htmlFor="llApproved"
                    className="text-sm font-medium text-gray-700"
                  >
                    Mark as LL Approved
                  </Label>
                </div>
                <Button
                  onClick={handleSaveLLApproval}
                  disabled={
                    !llApproved ||
                    selectedLearner?.LL_application_approved ||
                    updateLearnerMutation.isPending
                  }
                  className="w-full bg-purple-600 py-2.5 font-medium text-white hover:bg-purple-700"
                >
                  {updateLearnerMutation.isPending
                    ? "Processing..."
                    : "Save Approval Status"}
                </Button>
                {selectedLearner?.LL_application_approved && (
                  <div className="text-center text-sm font-medium text-green-600">
                    ✅ Already approved
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500">
                <div className="text-lg font-medium">
                  Application ID required
                </div>
                <div className="mt-2 text-sm">
                  Enter application ID first to proceed with approval
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Past LL Applications Section */}
      <div className="px-6 pb-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-gray-800">
                Past LL Applications
              </CardTitle>
              <div className="w-80">
                <AnimatedSearchBar
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isPastLLLoading ? (
              <div className="py-12 text-center">
                <div className="text-lg">Loading past applications...</div>
              </div>
            ) : isPastLLError ? (
              <div className="py-12 text-center text-red-500">
                <div className="text-lg">Error loading past applications</div>
              </div>
            ) : filteredPastApplications?.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <div className="text-lg font-medium">
                  {searchTerm
                    ? "No matching applications found"
                    : "No past LL applications found"}
                </div>
                {searchTerm && (
                  <div className="mt-2 text-sm">
                    Try adjusting your search criteria
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-gray-700">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-gray-700">
                        Mobile
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-gray-700">
                        LL Application ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredPastApplications?.map((learner, index) => (
                      <tr
                        key={learner.id}
                        className={`transition-colors duration-150 hover:bg-gray-50 ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-25"
                        }`}
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="font-medium text-gray-900">
                            {learner.name}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-gray-700">{learner.phone}</div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                            {learner.LL_application_id || "N/A"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Learner Info Dialog */}
      {selectedLearnerForDialog && (
        <LearnerInfoDialog
          learner={selectedLearnerForDialog}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
};

export default LearnerLLDetails;
