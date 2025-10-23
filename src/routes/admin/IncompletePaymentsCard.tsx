import { RefreshCcw, Send, Delete, ArrowBigLeft } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useMutation } from "@tanstack/react-query";

export function IncompletePaymentsCard() {
  const [incompletePayments, setIncompletePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingPaymentLink, setSendingPaymentLink] = useState({});
  const [deleteLearnerRequests, setDeleteLearnerRequests] = useState({});
  const [deleteLearnerConfirmedList, setDeleteLearnerConfirmedList] = useState({});
  const [deleteLearnerProcessingList, setDeleteLearnerProcessingList] = useState({});
  const { toast } = useToast();

  const fetchIncompletePayments = async () => {
    setLoading(true);
    try {
      // Query to get enrollments with incomplete payments
      const { data, error } = await supabase
        .from("enrollment")
        .select(
          `
          id,
          installment_mode,
          amount,
          installment1_amount,
          installment2_amount,
          payment_status,
          created_at,
          payment_id,
          learner_id,
          course_id,
          Learner (
            id,
            name,
            phone,
            email
          ),
          Courses (
            id,
            name,
            duration
          ),
          payment (
            id,
            installment_type,
            total_amount,
            status,
            updated_at,
            created_at
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter for enrollments with incomplete payments
      let incomplete = data.filter((enrollment) => {
        // Skip if enrollment already has a successful payment
        if (enrollment.payment && enrollment.payment.status === "completed") {
          return false;
        }

        // Show if payment_id is null (pending) or payment status is not success (failed)
        return (
          enrollment.payment_id === null ||
          (enrollment.payment && enrollment.payment.status !== "completed")
        );
      });

      // For second_half installments, find the date of first_half payment completion
      const secondHalfEnrollments = incomplete.filter(
        (e) => e.installment_mode === "second_half",
      );

      // Get the first_half payment dates for learners with second_half installments
      if (secondHalfEnrollments.length > 0) {
        const learnerIds = secondHalfEnrollments.map((e) => e.learner_id);
        const courseIds = secondHalfEnrollments.map((e) => e.course_id);

        const { data: firstHalfPayments, error: firstHalfError } =
          await supabase
            .from("payment")
            .select(
              `
            id,
            learner_id,
            installment_type,
            status,
            created_at,
            updated_at
          `,
            )
            .in("learner_id", learnerIds)
            .eq("installment_type", "first_half")
            .eq("status", "completed");

        if (!firstHalfError && firstHalfPayments) {
          // Map the first_half payment dates to the corresponding second_half enrollments
          incomplete = incomplete.map((enrollment) => {
            if (enrollment.installment_mode === "second_half") {
              const firstHalfPayment = firstHalfPayments.find(
                (p) => p.learner_id === enrollment.learner_id,
              );

              if (firstHalfPayment) {
                return {
                  ...enrollment,
                  first_half_payment_date: firstHalfPayment.created_at,
                };
              }
            }
            return enrollment;
          });
        }
      }

      setIncompletePayments(incomplete);
    } catch (err) {
      console.error("Error fetching incomplete payments:", err);
      toast({
        title: "Error",
        description: "Failed to fetch incomplete payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncompletePayments();
  }, []);

  // Helper function to determine payment status
  const getPaymentStatus = (enrollment) => {
    if (enrollment.payment_id === null) {
      return "Payment pending";
    } else if (
      enrollment.payment &&
      enrollment.payment.status !== "completed"
    ) {
      return "Payment failed";
    }
    return enrollment.payment_status || "Unknown";
  };

  // Helper function to determine payable amount
  const getPayableAmount = (enrollment) => {
    // console.log(
    //   "Calculating Payable amount for enrollment ",
    //   enrollment.installment_mode,
    //   enrollment.amount,
    //   enrollment.installment1_amount,
    //   enrollment.installment2_amount,
    // );
    if (enrollment.installment_mode === "full") {
      // when enrolment mode is full, installment1 and installment2 field might be 0
      // return amount directly
      // return enrollment.installment1_amount + enrollment.installment2_amount;
      return enrollment.amount;
    } else if (
      enrollment.installment_mode === "first_half" ||
      enrollment.installment_mode === "installment"
    ) {
      return enrollment.installment1_amount;
    } else if (enrollment.installment_mode === "second_half") {
      return enrollment.installment2_amount;
    } else {
      console.error("Invalid installment mode");
    }
    return 0;
  };

  // Helper function to get the appropriate date based on installment type
  const getRelevantDate = (enrollment) => {
    if (
      enrollment.installment_mode === "second_half" &&
      enrollment.first_half_payment_date
    ) {
      return new Date(enrollment.first_half_payment_date);
    }
    return new Date(enrollment.created_at);
  };

  // Function to send payment link - based on LearnerManagement.tsx implementation
  const sendPaymentLink = async (enrollment) => {
    setSendingPaymentLink((prev) => ({ ...prev, [enrollment.id]: true }));
console.log("Called send email");
    
    try {
      // Get the payment amount based on installment mode
      const paymentAmount = getPayableAmount(enrollment);

      // Get the installment mode (convert 'installment' to 'first_half' if needed)
      const installmentMode =
        enrollment.installment_mode === "installment"
          ? "first_half"
          : enrollment.installment_mode;

      // Create the payment link
      const paymentLink = `https://inlane-web-app.vercel.app/payment?phone=${enrollment.Learner.phone}`;

      // Define the request body for email trigger.
      const bodyData = {
          "learnerEmail": enrollment.Learner.email,
          "learnerName": enrollment.Learner.name, 
          "course": enrollment.Courses.name,
          "amount": paymentAmount,
          "paymentLink": paymentLink
      };

      const { error: invokeError } = await supabase.functions.invoke("send-payment-link-email", {
          body: bodyData,
      });

      
      const { error: invokeError2 } = await supabase.functions.invoke("send-message", {
        body: {
          message_type: "PAYMENT_LINK",
          learner_id: enrollment.Learner.id,
          enrollment_id: enrollment.id,
          course_name: enrollment.Courses.name,
          payment_amount: paymentAmount,
          duration: enrollment.Courses.duration,
          payment_link: paymentLink,
        },
      });

      if (invokeError) {
        console.error(invokeError);
        toast({
          title: "Failed to send email",
          description: `Failed to send link sent to ${enrollment.Learner.email}`,
        });
      } else {
        toast({
          title: "Success",
          description: `Payment link sent to ${enrollment.Learner.email} successfully!`,
        });
      }
      if (invokeError2) {
        console.error(invokeError2);
        toast({
          title: "Failed to send email",
          description: `Failed to send link sent to ${enrollment.Learner.phone}`,
        });
        throw invokeError2;
      } else {
        toast({
          title: "Success",
          description: `Payment link sent to ${enrollment.Learner.name} successfully!`,
        });
      }


      // Refresh the list after sending
      fetchIncompletePayments();
    } catch (err) {
      console.error("Error sending payment link:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to send payment link",
        variant: "destructive",
      });
    } finally {
      setSendingPaymentLink((prev) => ({ ...prev, [enrollment.id]: false }));
    }
  };

  // Delete button 
  // Defined at top, here for ref
  // const [deleteLearnerRequests, setDeleteLearnerRequests] = useState({});
  // const [deleteLearnerConfirmedList, setDeleteLearnerConfirmedList] = useState({});
  // const [deleteLearnerProcessingList, setDeleteLearnerProcessingList] = useState({});
  
  
  // type DeleteRequestIdToFlagsMap = Record<string, boolean>;
  // const [isDeleteRequestedList, setIsDeleteRequestedList] = useState<DeleteRequestIdToFlagsMap>({});
  // const [isDeleteRequestedList, setIsDeleteRequestedList] = useState({});


    // UseMutation hook for the delete operation
  const deleteLearnerMutation = useMutation({
    mutationFn: async (learner_id) => {
      // remove from auth before regular tables
      // call edge function as auth cannot be accessed from frontend

      // auth requires phone , but only learner_id available 
      
      // remove from dependent tables
      // remove from enrollment
      const { error: enrollmentDeleteerror } = await supabase
      .from('enrollment') 
      .delete()
      .eq('learner_id', learner_id);
      
      if (enrollmentDeleteerror) {
        throw new Error('Failed to delete the enrollment record.');
      }
      console.log("Deleted enrollment records for learner ", learner_id);
      // remove from learner
      // remove from payment
      const { error: paymentDeleteerror } = await supabase
      .from('payment') 
      .delete()
      .eq('learner_id', learner_id);
      
      if (paymentDeleteerror) {
        throw new Error('Failed to delete the payment record.');
      }
      console.log("Deleted payment records for learner ", learner_id);
      const { error: learnerDeleteError } = await supabase
        .from('Learner') 
        .delete()
        .eq('id', learner_id);

      if (learnerDeleteError) {
        throw new Error('Failed to delete the learner record.');
      }
      console.log("Deleted learner records for learner ", learner_id);
    },
    onSuccess: () => {
      toast ({
        'title': "Success",
        'description': "Deleted learner. Hit refresh ↻ to delete the learner",
      });
      // setItems(prevItems => prevItems.filter(item => item.id !== variables));
      // queryClient.invalidateQueries({ queryKey: ['items'] });
    },
    onSettled: () => {
      // Remove the ID from the set when the mutation is complete
      setDeleteLearnerProcessingList({ ...deleteLearnerProcessingList, [learner_id]: false });
      setDeleteLearnerRequests({ ...deleteLearnerRequests, [learner_id]: false });
    }
  });

  const handleDeleteLearnerRequest = (learner_id: string) => {
    setDeleteLearnerRequests({ ...deleteLearnerRequests, [learner_id]: true });
    console.log("Request", learner_id, deleteLearnerRequests[learner_id] );
    
  };
  
  const handleDeleteLearnerConfirm = async (learner_id: string) => {
    console.log("Removing learner", learner_id);
    
    if (!learner_id) {
      console.error("Learner ID cannot be empty.");
      return;
    }

    if (!deleteLearnerRequests[learner_id]) {
      console.error(learner_id + "not requested for delete but it's confirmed");
      return;
    }
    console.log("Confirm", learner_id, deleteLearnerRequests[learner_id] );
    setDeleteLearnerProcessingList({...deleteLearnerProcessingList, [learner_id]: true});
    
    await deleteLearnerMutation.mutate(learner_id);

    setDeleteLearnerProcessingList({...deleteLearnerProcessingList, [learner_id]: false});
    setDeleteLearnerRequests({ ...deleteLearnerRequests, [learner_id]: false });
    return ;
  };
  
  const handleDeleteLearnerCancel = (learner_id: string) => {
    setDeleteLearnerRequests({ ...deleteLearnerRequests, [learner_id]: false });
    console.log("Cancel", learner_id, deleteLearnerRequests[learner_id] );
  };

  return (
    <Card className="mt-6 transition-all hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">Incomplete Payments</CardTitle>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchIncompletePayments}
          disabled={loading}
        >
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
        </Button>
      </CardHeader>
      <CardContent>
        {incompletePayments.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            {loading ? "Loading payments..." : "No incomplete payments found"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left">Learner</th>
                  <th className="px-2 py-2 text-left">Course</th>
                  <th className="px-2 py-2 text-left">Payment Type</th>
                  <th className="px-2 py-2 text-right">Payable Amount</th>
                  <th className="px-2 py-2 text-center">Status</th>
                  <th className="px-2 py-2 text-right">
                    {/* Column header that explains the date meaning */}
                    Created Date
                  </th>
                  <th className="px-2 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {incompletePayments
                  .sort((a, b) => {
                    // Use the existing getRelevantDate function
                    const dateA = getRelevantDate(a);
                    const dateB = getRelevantDate(b);

                    // Sort in descending order (newest first)
                    return dateB - dateA;
                  })
                  .map((enrollment) => (
                    <tr
                      key={enrollment.id}
                      className="border-b hover:bg-muted/50"
                    >
                      <td className="px-2 py-2">
                        <div className="font-medium">
                          {enrollment.Learner?.name || "Unknown"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {enrollment.Learner?.phone}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        {enrollment.Courses?.name || "Unknown"}
                      </td>
                      <td className="px-2 py-2">
                        {enrollment.installment_mode === "installment"
                          ? "first_half"
                          : enrollment.installment_mode}
                      </td>
                      <td className="px-2 py-2 text-right">
                        ₹{getPayableAmount(enrollment).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium`}
                        >
                          {getPaymentStatus(enrollment)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right">
                        {/* Show date with tooltip explaining what it represents */}
                        <div className="group relative">
                          <span>
                            {new Intl.DateTimeFormat("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }).format(getRelevantDate(enrollment))}
                          </span>
                          <span className="invisible absolute -top-8 left-0 z-10 w-48 whitespace-normal rounded bg-black p-1 text-xs text-white group-hover:visible">
                            {enrollment.installment_mode === "second_half"
                              ? "Date when first installment was completed"
                              : "Enrollment creation date"}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendPaymentLink(enrollment)}
                          disabled={sendingPaymentLink[enrollment.id]}
                          className="whitespace-nowrap"
                        >
                          {sendingPaymentLink[enrollment.id] ? (
                            <RefreshCcw
                              size={14}
                              className="mr-1 animate-spin"
                            />
                          ) : (
                            <Send size={14} className="mr-1" />
                          )}
                          Send Payment Link 
                        </Button>
                        {
                          deleteLearnerRequests[enrollment.learner_id] 
                          ? (  
                          <>
                          {/* Request phase confirmation pending */}
                          <Button
                            variant="outline"
                            size="sm"
                            // onClick={() => setShowDeleteDialog(true); enrollment.learner_id)}
                            onClick= {() => handleDeleteLearnerConfirm(enrollment.learner_id)}
                            disabled={deleteLearnerProcessingList[enrollment.learner_id]}
                            className="whitespace-nowrap"
                          >
                            {deleteLearnerProcessingList[enrollment.learner_id] ? (
                              <RefreshCcw
                                size={14}
                                className="mr-1 animate-spin"
                              />
                            ) : (
                              <Delete size={14} className="mr-1" />
                            )}
                            Confirm
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick= {() => handleDeleteLearnerCancel(enrollment.learner_id)}
                            disabled={deleteLearnerProcessingList[enrollment.learner_id]}
                            className="whitespace-nowrap"
                          >
                            {deleteLearnerProcessingList[enrollment.learner_id] ? (
                              <RefreshCcw
                                size={14}
                                className="mr-1 animate-spin"
                              />
                            ) : (
                              <ArrowBigLeft size={14} className="mr-1" />
                            )}
                            Cancel
                          </Button>
                          
                          </>
                          )
                          :(
                          <Button
                            variant="outline"
                            size="sm"
                            onClick= {() => handleDeleteLearnerRequest(enrollment.learner_id)}
                            disabled={deleteLearnerProcessingList[enrollment.learner_id]}
                            className="whitespace-nowrap"
                          >
                            {deleteLearnerProcessingList[enrollment.learner_id] ? (
                              <RefreshCcw
                                size={14}
                                className="mr-1 animate-spin"
                              />
                            ) : (
                              <Delete size={14} className="mr-1" />
                            )}
                            Delete
                          </Button>
                          )
                        }
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
