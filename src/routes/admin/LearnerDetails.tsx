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
import { differenceInDays, addDays, format, subDays, isBefore } from "date-fns";

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

const LearnerDetails = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  

  // Query for past LL approved applications
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
        .is("LL_result", true)
        .is("LL_application_approved", true)
        .is("LL_received", true);
      if (error) throw error;
      return data;
    },
  });

  // Filter past LL approved applications based on search term
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
    mutationFn: async ({
      learnerId,
      updates,
    }: {
      learnerId: string;
      updates: Partial<any>;
    }) => {
      const { error } = await supabase
        .from("Learner")
        .update(updates)
        .eq("id", learnerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Learner details updated successfully.",
      });
      // TODO: seperate query keys to be added and called
      queryClient.invalidateQueries(["learners", "llDetails"]);
      queryClient.invalidateQueries(["learners", "pastLLApplications"]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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


  const calculateLesson10Start = (learner) => {
    if (!learner.DL_test_date) {
      return null;
    }
    return format(subDays(new Date(learner.DL_test_date), 7), "yyyy-MM-dd");
  };
  
  const isLesson10ButtonDisabled = (learner): boolean => {
      const calculatedStartDate = calculateLesson10Start (learner);
      
      if (!calculatedStartDate) {
        return true;
      }

      // Disabled if the current date is before the calculated start date
      return isBefore(new Date(), calculatedStartDate);
  };

  const handleLesson10Click = (learner) => {
    if (!learner) return;
      supabase.functions.invoke("send-message", {
        body: {
          message_type: "WEBAPP_SCHEDULE_LESSON_10",
          learner_id: learner.id,
        },
      });
      toast({
        title: "Success",
          description: "Lesson 10 booking notification sent.",
      });
  }


  const handleTestPass = (learner, isPass) => {
    if (!learner) return;
    // console.log("handleTestPass called with learner:", learner);
    
    updateLearnerMutation.mutate(
    {
      learnerId: learner.id,
      updates: {
        DL_result: isPass,
      },
    },
    {
      onSuccess: async () => {
        toast({
          title: "Success",
            description: "Test information updated.",
        });
      },
    },
  );
  };

  const handleProcessFinish = (learner) => {
  if (!learner) return;
  updateLearnerMutation.mutate(
    {
      learnerId: learner.id,
      updates: {
        // TODO: set licenceid to argument appointmentId2,
        has_a_DL: true,
        DL_received_date: new Date().toISOString(),
      },
    },
    {
      onSuccess: async () => {
        // await supabase.functions.invoke("send-message", {
        //   body: {
        //     // message_type: "LL_APPLICATION_UPDATE",
        //     learner_id: learner.id,
        //   },
        // });
        // Todo send final message
        // await sendAdminEmail(
        //   "Schedule DL Test Date - LL Approved",
        //   `Learner's License has been approved for ${selectedLearner.name} (Phone: ${selectedLearner.phone}).Please schedule a driving test date for this learner in the DL Test Dates section.`,
        // );
        toast({
          title: "Success",
            // TODO
            // description: "Learner record closed and notifications sent.",
            description: "Learner record closed.",
        });
      },
    },
  );
  };
    
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
              Post-LL Application Management
            </h1>
          </div>
        </div>
      </div>

      {/* Post LL applications */}
      <div className="px-6 pb-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-gray-800">
                Pending Applications
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
                      <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-gray-700">
                        LL licence number
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-gray-700">
                        Date of LL issued    
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-gray-700">
                        Start day of DL test (after 30 days from LL)
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-gray-700">
                        10th lesson booking start (before 7 days of test)
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-gray-700">
                        10th lesson booked ?
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-gray-700">
                        DL test Pass/Fail
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-gray-700">
                        DL Issued ?
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
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            learner.LL_id ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {learner.LL_id || "N/A"}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            learner.LL_received_date ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {learner.LL_received_date || "N/A"}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            learner.LL_received_date ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {learner.LL_received_date
                              ? format(addDays(new Date(learner.LL_received_date), 30), 'yyyy-MM-dd')
                              : "N/A"
                            }
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            calculateLesson10Start(learner) ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {calculateLesson10Start(learner) || "N/A" }
                          </div>

                          {!isLesson10ButtonDisabled(learner) && (
                            <button
                            onClick={() => { handleLesson10Click(learner);
                                           } 
                                    }
                            className="inline-flex items-center rounded-full bg-blue-500 px-3 py-1 text-sm font-medium text-white shadow hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                          >
                            Send notification
                          </button>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            learner.has_lesson10_booked === true
                              ? "bg-green-100 text-green-800"
                              : learner.has_lesson10_booked === false
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {learner.has_lesson10_booked === true
                              ? "Yes"
                              : learner.has_lesson10_booked === false
                              ? "No"
                              : "N/A"
                            }
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            learner.DL_result === true
                              ? "bg-green-100 text-green-800"
                              : learner.DL_result === false
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {learner.DL_result === true
                              ? "PASS"
                              : learner.DL_result === false
                              ? "FAIL"
                              : "N/A"
                            }
                          </div>
                            {
                              !learner.DL_result && (
                                <button
                                 onClick={() => { handleTestPass(learner, true);} }

                                 className="inline-flex items-center rounded-full bg-blue-500 px-3 py-1 text-sm font-medium text-white shadow hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                >
                                  Yes
                                </button>
                              )
                            }
                           {
                              (!(learner.DL_result && learner.DL_result===false)) && (
                                <button
                                 onClick={() => { handleTestPass(learner, false);} }

                                 className="inline-flex items-center rounded-full bg-blue-500 px-3 py-1 text-sm font-medium text-white shadow hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                >
                                  No
                                </button>
                              )
                            }
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <button
                            onClick={() => { handleProcessFinish(learner);
                                            // resetSelectedLearnerState();
                                           } 
                                    }
                            className="inline-flex items-center rounded-full bg-blue-500 px-3 py-1 text-sm font-medium text-white shadow hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                          >
                            Yes (Click here)
                          </button>
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
    </div>
  );
};

export default LearnerDetails;
