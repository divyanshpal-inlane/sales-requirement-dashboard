import { RefreshCcw, Send } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

export function IncompletePaymentsCard() {
  const [incompletePayments, setIncompletePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingPaymentLink, setSendingPaymentLink] = useState({});
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
    if (enrollment.installment_mode === "full") {
      return enrollment.installment1_amount + enrollment.installment2_amount;
    } else if (
      enrollment.installment_mode === "first_half" ||
      enrollment.installment_mode === "installment"
    ) {
      return enrollment.installment1_amount;
    } else if (enrollment.installment_mode === "second_half") {
      return enrollment.installment2_amount;
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

      // Call the send-message function to send the payment link via WhatsApp
      const { error } = await supabase.functions.invoke("send-message", {
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

      if (error) throw error;

      toast({
        title: "Success",
        description: `Payment link sent to ${enrollment.Learner.name} successfully!`,
      });

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
