import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowBigLeft, Delete, RefreshCcw, Send } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

export function IncompletePaymentsCard() {
  const [incompletePayments, setIncompletePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingPaymentLink, setSendingPaymentLink] = useState({});
  const [deleteLearnerRequests, setDeleteLearnerRequests] = useState({});
  const [deleteLearnerConfirmedList, setDeleteLearnerConfirmedList] = useState(
    {},
  );
  const [deleteLearnerProcessingList, setDeleteLearnerProcessingList] =
    useState({});
  const [updatingPaidInfo, setUpdatingPaidInfo] = useState({});
  const [addingPaidInfo, setAddingPaidInfo] = useState({});
  const [paidInfoDialogOpen, setPaidInfoDialogOpen] = useState(false);
  const [paidInfoDialogData, setPaidInfoDialogData] = useState(null);
  const [manualAmount, setManualAmount] = useState<number>(0);
  const [manualInstallment1, setManualInstallment1] = useState<number | null>(
    null,
  );
  const [manualInstallment2, setManualInstallment2] = useState<number | null>(
    null,
  );
  // const installmentType = manualInstallment1 && manualInstallment2 ? "full"
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
            amount,
            installment_type,
            total_amount,
            status,
            updated_at,
            created_at,
            payment_type
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

  // Helper function to get course name - handles demo/custom enrollments
  const getCourseName = (enrollment) => {
    if (enrollment.Courses?.name) {
      return enrollment.Courses.name;
    }
    // Check payment_type for demo/custom enrollments
    const paymentType = enrollment.payment?.payment_type;
    if (paymentType === "demo") {
      return "Demo Class";
    }
    if (paymentType === "custom") {
      return "Custom Course";
    }
    return "Unknown";
  };

  // Helper function to determine payment status
  const getPaymentStatus = (enrollment) => {
    // console.log("Determining payment status for enrollment:", enrollment);
    if (
      enrollment.payment_id === null ||
      enrollment.payment === null ||
      enrollment.payment.status === null ||
      enrollment.payment.status.toLowerCase().includes("pending")
    ) {
      return "Payment pending";
    } else if (enrollment.payment_status === null) {
      return "Payment pending";
    } else if (
      enrollment.payment &&
      !["full_paid", "half_paid", "completed"].includes(
        enrollment.payment.status,
      )
    ) {
      return "Payment failed";
    }

    // the enrollment.payment_status contains full_paid, half_paid, etc.
    // payment.status = "completed" for successful payments
    return enrollment.payment_status;
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

    // For demo/custom enrollments, amount may not be in enrollment record
    // Fall back to payment record amount
    const paymentAmount =
      enrollment.payment?.total_amount || enrollment.payment?.amount;

    if (enrollment.installment_mode === "full") {
      // when enrolment mode is full, installment1 and installment2 field might be 0
      // return amount directly, or fall back to payment amount
      return enrollment.amount || paymentAmount || 0;
    } else if (
      enrollment.installment_mode === "first_half" ||
      enrollment.installment_mode === "installment"
    ) {
      return enrollment.installment1_amount || paymentAmount || 0;
    } else if (enrollment.installment_mode === "second_half") {
      return enrollment.installment2_amount || paymentAmount || 0;
    } else {
      // For enrollments without installment_mode (e.g., demo), use payment amount
      return paymentAmount || enrollment.amount || 0;
    }
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

      // Create the payment link. For demo/topup enrollments (course_id null),
      // append the right type so PaymentPage prefills the demo/topup flow even
      // on deployments without the enrollment-based auto-detect fallback.
      const paymentType = enrollment.payment?.payment_type;
      let typeParam = "";
      if (paymentType === "demo") {
        typeParam = "&type=demo";
      } else if (paymentType === "topup") {
        const topupHours = Math.max(
          1,
          Math.round((enrollment.payment?.amount || 1) / 1),
        );
        typeParam = `&type=topup&hours=${topupHours}`;
      }
      const paymentLink = `https://inlane-web-app.vercel.app/payment?phone=${enrollment.Learner.phone}${typeParam}`;

      // Define the request body for email trigger.
      const courseName = getCourseName(enrollment);
      const bodyData = {
        learnerEmail: enrollment.Learner.email,
        learnerName: enrollment.Learner.name,
        course: courseName,
        amount: paymentAmount,
        paymentLink: paymentLink,
      };

      const { error: invokeError } = await supabase.functions.invoke(
        "send-payment-link-email",
        {
          body: bodyData,
        },
      );

      const { error: invokeError2 } = await supabase.functions.invoke(
        "send-message",
        {
          body: {
            message_type: "PAYMENT_LINK",
            learner_id: enrollment.Learner.id,
            enrollment_id: enrollment.id,
            course_name: courseName,
            payment_amount: paymentAmount,
            duration: enrollment.Courses?.duration || 1,
            payment_link: paymentLink,
          },
        },
      );

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

  // const updatePaidInfo = async () => {
  //   if (!paidInfoDialogData) {
  //     console.log("No enrollment data available");
  //     return;
  //   }
  //   setUpdatingPaidInfo((prev) => ({ ...prev, [paidInfoDialogData.id]: true }));

  //   setManualAmount(0);
  //   setPaidInfoDialogOpen(true);
  // };

  const handleUpdatePaidInfoClose = () => {
    if (!paidInfoDialogData) {
      console.log("No enrollment data available");
      return;
    }
    console.log("Closing paid info dialog for enrollment:", paidInfoDialogData);
    setUpdatingPaidInfo((prev) => ({
      ...prev,
      [paidInfoDialogData?.id]: false,
    }));
    setPaidInfoDialogOpen(false);
    // setPaidInfoDialogData(null);
    // setManualAmount(0);
    console.log("updatingPaidInfo", updatingPaidInfo);
  };

  const useUpdateEnrollmentMutation = useMutation({
    mutationFn: async ({
      enrollmentId,
      updates,
    }: {
      enrollmentId: string;
      updates: Partial<any>;
    }) => {
      const { data, error } = await supabase
        .from("enrollment")
        .update(updates)
        .eq("id", enrollmentId);
      if (error) throw error;
      console.log("Updated installment info");
    },

    // Invalidate relevant queries upon successful completion
    onSuccess: (data, variables) => {
      // Invalidate the specific enrollment query to force a fresh fetch
      queryClient.invalidateQueries({
        queryKey: ["enrollment", variables.enrollmentId],
      });

      // Invalidate the generic list of enrollments if necessary
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });

      // Note: The original send-message and toast logic is triggered
      // via the onSuccess callback passed when calling .mutate()
      // in the component's handleUpdatePaidInfoSave function.
    },

    onError: (error) => {
      // Optional: Log or handle global mutation errors here
      console.error("Mutation failed:", error);
    },
  });
  const handleUpdatePaidInfoSave = async () => {
    // The steps should be same as process-payment
    // learner and enrollment are added,
    // payment to be added and enrollment to be updated
    if (!paidInfoDialogData) {
      toast({
        title: "Error",
        description: "No enrollment data available",
        variant: "destructive",
      });
      return;
    }
    try {
      console.log(
        `Saving amount for learner: ${paidInfoDialogData?.Learner?.name}`,
      );

      // Determine payment status based on which installments are paid
      // If both installments paid OR if it's full payment mode -> full_paid
      // If only first installment paid -> half_paid
      const isFullPayment = paidInfoDialogData?.installment_mode === "full";
      const bothInstallmentsPaid = manualInstallment1 && manualInstallment2;
      const paymentStatus =
        isFullPayment || bothInstallmentsPaid ? "full_paid" : "half_paid";

      // Calculate the amount being paid
      const paidAmount = (manualInstallment1 || 0) + (manualInstallment2 || 0);

      // Determine installment_type for payment record
      let installmentType = "full";
      if (!isFullPayment) {
        if (manualInstallment1 && !manualInstallment2) {
          installmentType = "first_half";
        } else if (manualInstallment1 && manualInstallment2) {
          installmentType = "full";
        }
      }

      // 1. Make payment record with "completed" status to match automatic payment flow
      // The enrollment.payment_status tracks full_paid vs half_paid for installments
      const { data: paymentRecord, error: dbError } = await supabase
        .from("payment")
        .insert([
          {
            learner_id: paidInfoDialogData?.Learner?.id,
            amount: paidAmount,
            total_amount: paidInfoDialogData?.amount || paidAmount,
            email: paidInfoDialogData?.Learner?.email,
            phone: paidInfoDialogData?.Learner?.phone,
            payment_type: "course",
            status: "completed",
            name: paidInfoDialogData?.Learner?.name,
            installment_type: installmentType,
            installment1_amount: paidInfoDialogData?.installment1_amount,
            installment2_amount: paidInfoDialogData?.installment2_amount,
          },
        ])
        .select()
        .single();

      if (dbError) throw new Error("Failed to record payment.");

      // 2. Update Enrollment status - IMPORTANT: Also update payment_status
      await useUpdateEnrollmentMutation.mutateAsync({
        enrollmentId: paidInfoDialogData.id,
        updates: {
          amount: paidInfoDialogData?.amount || paidAmount,
          payment_id: paymentRecord.id,
          status: "active",
          payment_status: paymentStatus, // This was missing!
          installment_mode:
            paymentStatus === "full_paid" ? "full" : "first_half",
          installment1_amount: paidInfoDialogData?.installment1_amount,
          installment2_amount: paidInfoDialogData?.installment2_amount,
        },
      });

      // 3. Send message
      await supabase.functions.invoke("send-message", {
        body: {
          message_type: "LL_APPLICATION_UPDATE",
          learner_id: paidInfoDialogData?.Learner?.id,
        },
      });

      // Todo: send different email for LL received
      // await sendAdminEmail(...)

      // 4. Show success toast
      toast({
        title: "Success",
        description: `Payment marked as ${paymentStatus}. Enrollment updated.`,
      });

      // 5. Close dialog and refresh list
      handleUpdatePaidInfoClose();
      setManualInstallment1(null);
      setManualInstallment2(null);
      fetchIncompletePayments();
    } catch (error) {
      console.error("Payment and Enrollment Save Error:", error);
      toast({
        title: "Error Saving Data",
        description:
          error.message ||
          "An unexpected error occurred during the save process.",
        variant: "destructive",
      });
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
    mutationFn: async ({ learner_id, phone }) => {
      // remove from auth before regular tables
      // call edge function as auth cannot be accessed from frontend

      // auth requires phone , but only learner_id available

      // remove from dependent tables
      // remove from enrollment
      const { error: enrollmentDeleteerror } = await supabase
        .from("enrollment")
        .delete()
        .eq("learner_id", learner_id);

      if (enrollmentDeleteerror) {
        throw new Error("Failed to delete the enrollment record.");
      }
      console.log("Deleted enrollment records for learner ", learner_id);
      // remove from learner
      // remove from payment
      const { error: paymentDeleteerror } = await supabase
        .from("payment")
        .delete()
        .eq("learner_id", learner_id);

      if (paymentDeleteerror) {
        throw new Error("Failed to delete the payment record.");
      }
      console.log("Deleted payment records for learner ", learner_id);
      const { error: learnerDeleteError } = await supabase
        .from("Learner")
        .delete()
        .eq("id", learner_id);

      if (learnerDeleteError) {
        throw new Error("Failed to delete the learner record.");
      }
      console.log("Deleted learner records for learner ", learner_id);

      // Optional: remove from Admin, should not be required if learner does not get added
      // to Admin after signup
      if (phone) {
        const { error: adminDeleteerror } = await supabase
          .from("Admin")
          .delete()
          .eq("phone", phone);
        if (adminDeleteerror) {
          throw new Error("Failed to delete the Admin record.");
        }
        console.log("Deleted Admin records for learner ", phone);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deleted learner. Hit refresh ↻ to delete the learner",
      });
      // setItems(prevItems => prevItems.filter(item => item.id !== variables));
      // queryClient.invalidateQueries({ queryKey: ['items'] });
    },
    onSettled: () => {
      // Remove the ID from the set when the mutation is complete
      setDeleteLearnerProcessingList({
        ...deleteLearnerProcessingList,
        [learner_id]: false,
      });
      setDeleteLearnerRequests({
        ...deleteLearnerRequests,
        [learner_id]: false,
      });
    },
  });

  const handleDeleteLearnerRequest = (learner_id: string) => {
    setDeleteLearnerRequests({ ...deleteLearnerRequests, [learner_id]: true });
    console.log("Request", learner_id, deleteLearnerRequests[learner_id]);
  };

  const handleDeleteLearnerConfirm = async (
    learner_id: string,
    phone: string,
  ) => {
    console.log("Removing learner", learner_id, phone);

    if (!learner_id || !phone) {
      console.error("Learner ID cannot be empty.");
      return;
    }

    if (!deleteLearnerRequests[learner_id]) {
      console.error(learner_id + "not requested for delete but it's confirmed");
      return;
    }
    console.log("Confirm", learner_id, deleteLearnerRequests[learner_id]);
    setDeleteLearnerProcessingList({
      ...deleteLearnerProcessingList,
      [learner_id]: true,
    });

    await deleteLearnerMutation.mutate({ learner_id, phone }); // Note that mutationFn only accepts single arg

    setDeleteLearnerProcessingList({
      ...deleteLearnerProcessingList,
      [learner_id]: false,
    });
    setDeleteLearnerRequests({ ...deleteLearnerRequests, [learner_id]: false });
    return;
  };

  const handleDeleteLearnerCancel = (learner_id: string) => {
    setDeleteLearnerRequests({ ...deleteLearnerRequests, [learner_id]: false });
    console.log("Cancel", learner_id, deleteLearnerRequests[learner_id]);
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
                      <td className="px-2 py-2">{getCourseName(enrollment)}</td>
                      <td className="px-2 py-2">
                        {enrollment.installment_mode === "installment"
                          ? "first_half"
                          : enrollment.installment_mode}
                      </td>
                      <td className="px-2 py-2 text-right">
                        ₹{getPayableAmount(enrollment)?.toLocaleString()}
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
                        {deleteLearnerRequests[enrollment.learner_id] ? (
                          <>
                            {/* Request phase confirmation pending */}
                            <Button
                              variant="outline"
                              size="sm"
                              // onClick={() => setShowDeleteDialog(true); enrollment.learner_id)}
                              onClick={() =>
                                handleDeleteLearnerConfirm(
                                  enrollment.learner_id,
                                  enrollment.Learner.phone,
                                )
                              }
                              disabled={
                                deleteLearnerProcessingList[
                                  enrollment.learner_id
                                ]
                              }
                              className="whitespace-nowrap"
                            >
                              {deleteLearnerProcessingList[
                                enrollment.learner_id
                              ] ? (
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
                              onClick={() =>
                                handleDeleteLearnerCancel(enrollment.learner_id)
                              }
                              disabled={
                                deleteLearnerProcessingList[
                                  enrollment.learner_id
                                ]
                              }
                              className="whitespace-nowrap"
                            >
                              {deleteLearnerProcessingList[
                                enrollment.learner_id
                              ] ? (
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
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDeleteLearnerRequest(enrollment.learner_id)
                            }
                            disabled={
                              deleteLearnerProcessingList[enrollment.learner_id]
                            }
                            className="whitespace-nowrap"
                          >
                            {deleteLearnerProcessingList[
                              enrollment.learner_id
                            ] ? (
                              <RefreshCcw
                                size={14}
                                className="mr-1 animate-spin"
                              />
                            ) : (
                              <Delete size={14} className="mr-1" />
                            )}
                            Delete
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPaidInfoDialogData(enrollment);
                            setPaidInfoDialogOpen(true);
                          }}
                          disabled={updatingPaidInfo[enrollment?.id]}
                          className="whitespace-nowrap"
                        >
                          {updatingPaidInfo[enrollment?.id] ? (
                            <RefreshCcw
                              size={14}
                              className="mr-1 animate-spin"
                            />
                          ) : (
                            <Send size={14} className="mr-1" />
                          )}
                          Add paid info
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        <Dialog open={paidInfoDialogOpen} onOpenChange={setPaidInfoDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Enter Paid Installments</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="installment1-paid"
                  // The checkbox is checked if manualInstallment1 is truthy (contains the amount)
                  checked={!!manualInstallment1}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    // If checked is true, set the amount; otherwise set to null.
                    setManualInstallment1(
                      checked ? paidInfoDialogData?.installment1_amount : null,
                    );
                  }}
                />
                {/* Using the provided 'Label' component */}
                <Label htmlFor="installment1-paid">
                  Installment 1 (Amount:{" "}
                  {paidInfoDialogData?.installment1_amount ?? 0})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="installment2-paid"
                  // FIX: Disable this checkbox if manualInstallment1 is not yet set (null/0/false)
                  disabled={!manualInstallment1}
                  // The checkbox is checked if manualInstallment2 is truthy (contains the amount)
                  checked={!!manualInstallment2}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    // If checked is true, set the amount; otherwise set to null.
                    setManualInstallment2(
                      checked ? paidInfoDialogData?.installment2_amount : null,
                    );
                  }}
                />
                {/* Using the provided 'Label' component */}
                <Label
                  htmlFor="installment2-paid"
                  // Optional: Add a class to visually indicate disabled state on the label (e.g., lower opacity)
                  className={!manualInstallment1 ? "opacity-50" : ""}
                >
                  Installment 2 (Amount:{" "}
                  {paidInfoDialogData?.installment2_amount ?? 0})
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleUpdatePaidInfoClose} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleUpdatePaidInfoSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
