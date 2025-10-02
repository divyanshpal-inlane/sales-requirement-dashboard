import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { useCourses } from "@/queries/payment";

interface PaymentDetails {
  amount: number;
  email: string;
  phone: string;
  paymentType: "course" | "reschedule";
  courseId?: string;
  requestId?: string;
  name: string;
  learnerId?: string;
  installmentType?: "full" | "first_half" | "second_half";
  totalAmount?: number;
  parentPaymentId?: string;
  enrollmentId?: string;
  installment1Amount?: number;
  installment2Amount?: number;
}

function PaymentPage() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrefilled, setIsPrefilled] = useState(false);
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const [paymentOption, setPaymentOption] = useState<"full" | "installment">(
    "full",
  );

  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    amount: 0,
    email: "",
    phone: "",
    paymentType: "course",
    courseId: "",
    requestId: "",
    name: "",
    learnerId: "",
    installmentType: "full",
    totalAmount: 0,
  });

  // Helper function to round prices to nearest integer
  const roundPrice = (price: number): number => {
    return Math.round(price);
  };

  useEffect(() => {
    const fetchLearnerDetails = async () => {
      const phone = searchParams.get("phone");
      if (phone) {
        try {
          const { data: learner, error } = await supabase
            .from("Learner")
            .select("email, phone, name, id")
            .eq("phone", phone)
            .order("created_at", {ascending: false})
            .limit(1)
            .maybeSingle();
            

          if (error || !learner) throw new Error("Failed to fetch learner details");

          // Check if there's an existing enrollment for this learner
          const { data: enrollments, error: enrollmentError } = await supabase
            .from("enrollment")
            .select(
              "id, course_id, amount, payment_status, status, unlocked_lessons, installment_mode, installment1_amount, installment2_amount",
            )
            .eq("learner_id", learner.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (enrollmentError)
            throw new Error("Failed to fetch enrollment details");

          const enrollment =
            enrollments && enrollments.length > 0 ? enrollments[0] : null;
          const courseId = enrollment?.course_id || "";
          const enrollmentId = enrollment?.id || "";
          const installmentMode = enrollment?.installment_mode || "full";

          // Get course details
          const { data: course, error: courseError } = await supabase
            .from("Courses")
            .select("price, id")
            .eq("id", courseId)
            .single();

          if (courseError && courseId)
            throw new Error("Failed to fetch course details");

          // Check if this is a second installment payment by looking for a completed first installment payment
          let isSecondInstallment = false;
          let parentPaymentId = null;

          if (enrollment?.payment_status === "half_paid") {
            // Check if there's a completed first installment payment
            const { data: firstPayments, error: paymentsError } = await supabase
              .from("payment")
              .select("id, status")
              .eq("learner_id", learner.id)
              .eq("installment_type", "first_half")
              .eq("status", "completed")
              .order("created_at", { ascending: false })
              .limit(1);

            if (!paymentsError && firstPayments && firstPayments.length > 0) {
              // If there's a completed first installment payment, this is a second installment
              isSecondInstallment = true;
              parentPaymentId = firstPayments[0].id;
            }
          }

          // Get the installment amounts (either from enrollment or calculate)
          const coursePrice = roundPrice(course?.price || 0);
          const totalAmount = roundPrice(enrollment?.amount || coursePrice);

          // Use custom installment amounts if available, otherwise calculate
          let installment1Amount = roundPrice(totalAmount / 2);
          let installment2Amount = totalAmount - installment1Amount;

          // Check if custom installment amounts are set in the enrollment
          if (
            enrollment?.installment1_amount &&
            enrollment?.installment1_amount > 0
          ) {
            installment1Amount = roundPrice(enrollment.installment1_amount);
          }

          if (
            enrollment?.installment2_amount &&
            enrollment?.installment2_amount > 0
          ) {
            installment2Amount = roundPrice(enrollment.installment2_amount);
          }

          // Set the correct amount based on installment type
          const paymentAmount = isSecondInstallment
            ? installment2Amount
            : paymentOption === "full"
              ? totalAmount
              : installment1Amount;

          console.log("Installment amounts:", {
            installment1Amount,
            installment2Amount,
            totalAmount,
            paymentAmount,
            isSecondInstallment,
            paymentStatus: enrollment?.payment_status,
          });

          setPaymentDetails((prev) => ({
            ...prev,
            email: learner.email || "",
            phone: learner.phone || "",
            name: learner.name || "",
            courseId: courseId,
            enrollmentId: enrollmentId,
            amount: paymentAmount,
            learnerId: learner.id,
            installmentType: isSecondInstallment
              ? "second_half"
              : paymentOption === "full"
                ? "full"
                : "first_half",
            totalAmount: totalAmount,
            parentPaymentId: parentPaymentId,
            installment1Amount: installment1Amount,
            installment2Amount: installment2Amount,
          }));

          // If it's a second installment, force the payment option
          if (isSecondInstallment) {
            setPaymentOption("installment");
          } else if (installmentMode === "installment") {
            // If enrollment was created with installment mode, default to that
            setPaymentOption("installment");
          }

          setIsPrefilled(true);
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : "An error occurred";
          setError(errorMessage);
        }
      }
    };

    fetchLearnerDetails();
  }, [searchParams, paymentOption]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Update payment amount when payment option changes
  useEffect(() => {
    if (paymentDetails.installmentType !== "second_half") {
      const totalAmount = paymentDetails.totalAmount || paymentDetails.amount;

      if (totalAmount > 0) {
        // Use custom installment amounts if available
        const installment1Amount =
          paymentDetails.installment1Amount || roundPrice(totalAmount / 2);

        const amount =
          paymentOption === "full" ? totalAmount : installment1Amount;

        setPaymentDetails((prev) => ({
          ...prev,
          amount: amount,
          installmentType: paymentOption === "full" ? "full" : "first_half",
        }));
      }
    }
  }, [
    paymentOption,
    paymentDetails.totalAmount,
    paymentDetails.installment1Amount,
  ]);

  const handleCourseChange = (courseId: string) => {
    const selectedCourse = courses?.find((course) => course.id === courseId);
    const coursePrice = roundPrice(selectedCourse?.price || 0);
    const installment1Amount = roundPrice(coursePrice / 2);
    const installment2Amount = coursePrice - installment1Amount;

    setPaymentDetails((prev) => ({
      ...prev,
      courseId,
      amount: paymentOption === "full" ? coursePrice : installment1Amount,
      totalAmount: coursePrice,
      installmentType: paymentOption === "full" ? "full" : "first_half",
      installment1Amount: installment1Amount,
      installment2Amount: installment2Amount,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Include the enrollmentId and installment amounts in the payment details
      const paymentData = {
        ...paymentDetails,
        ...(paymentDetails.enrollmentId
          ? { enrollmentId: paymentDetails.enrollmentId }
          : {}),
        installment1Amount:
          paymentDetails.installment1Amount ||
          Math.round((paymentDetails.totalAmount || paymentDetails.amount) / 2),
        installment2Amount:
          paymentDetails.installment2Amount ||
          (paymentDetails.totalAmount || paymentDetails.amount) -
            (paymentDetails.installment1Amount ||
              Math.round(
                (paymentDetails.totalAmount || paymentDetails.amount) / 2,
              )),
      };

      console.log("Sending payment data:", paymentData);

      const { data, error } = await supabase.functions.invoke(
        "process-payment",
        {
          body: paymentData,
        },
      );

      if (error) {
        console.error("Payment error:", error);

        // Check if the error is related to missing columns
        if (error.message && error.message.includes("column")) {
          setError(
            `Database error: ${error.message}. Please run the SQL migration to add the required columns.`,
          );
        } else {
          setError(`Payment processing failed: ${error.message}`);
        }

        throw error;
      }

      // const { error: messageError } = await supabase.functions.invoke(
      //   "send-message",
      //   {
      //     body: {
      //       message_type: "THANK_YOU_PAYMENT",
      //       learner_id: paymentDetails.learnerId,
      //       payment_amount: paymentDetails.amount,
      //     },
      //   },
      // );

      // if (messageError) throw messageError;

      // const { error: messageError2 } = await supabase.functions.invoke(
      //   "send-message",
      //   {
      //     body: {
      //       message_type: "SIGN_UP_REMINDER",
      //       learner_id: paymentDetails.learnerId,
      //     },
      //   },
      // );

      // if (messageError2) throw messageError2;

      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.gatewayURL;

      // Add debug logging
      console.log("Submitting to payment gateway:", {
        gatewayURL: data.gatewayURL,
        formData: data.formData,
      });

      // Ensure all form fields are properly set
      Object.entries(data.formData).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
        console.log(`Added form field: ${key}=${value}`);
      });

      // Set form attributes for proper submission
      form.setAttribute("target", "_self");
      form.style.display = "none";

      // Append form to body, submit it, and then remove it
      document.body.appendChild(form);

      // Add a small delay before submitting the form
      setTimeout(() => {
        console.log("Submitting payment form...");
        form.submit();
        // Don't remove the form immediately to ensure it submits properly
        setTimeout(() => {
          if (document.body.contains(form)) {
            document.body.removeChild(form);
          }
        }, 2000);
      }, 100);
    } catch (err: unknown) {
      console.error("Payment initiation failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Payment initiation failed. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const type =
    searchParams.get("type") === "reschedule" ? "reschedule" : "course";

  const isSecondInstallment = paymentDetails.installmentType === "second_half";
  const displayAmount = paymentDetails.totalAmount || paymentDetails.amount;
  const firstInstallmentAmount =
    paymentDetails.installment1Amount || roundPrice(displayAmount / 2);
  const secondInstallmentAmount =
    paymentDetails.installment2Amount || displayAmount - firstInstallmentAmount;

  if (coursesLoading) {
    return (
      <div className="container mx-auto max-w-md py-8">
        <Card>
          <CardHeader>
            <CardTitle>Loading courses...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {type === "course" && (
              <div>
                <label
                  htmlFor="courseId"
                  className="mb-1 block text-sm font-medium"
                >
                  Select Course
                </label>
                <Select
                  value={paymentDetails.courseId}
                  onValueChange={handleCourseChange}
                  disabled={isPrefilled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses?.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name} - {course.total_lessons} Lessons
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label
                htmlFor="amount"
                className="mb-1 block text-sm font-medium"
              >
                Amount
              </label>
              <Input
                id="amount"
                name="amount"
                type="number"
                value={paymentDetails.amount}
                onChange={handleInputChange}
                disabled
                className="w-full"
              />
            </div>
            {type === "course" && (
              <>
                <div>
                  <label
                    htmlFor="name"
                    className="mb-1 block text-sm font-medium"
                  >
                    Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={paymentDetails.name}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                    disabled={isPrefilled}
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={paymentDetails.email}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                    disabled={isPrefilled}
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1 block text-sm font-medium"
                  >
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={paymentDetails.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                    pattern="[0-9]{10}"
                    title="Please enter a valid 10-digit phone number"
                    disabled={isPrefilled}
                  />
                </div>
              </>
            )}
            {!isSecondInstallment && (
              <div className="space-y-2">
                <label htmlFor="paymentOption" className="text-sm font-medium">
                  Payment Option
                </label>
                <Select
                  value={paymentOption}
                  defaultValue={
                    paymentDetails.installmentType === "full" ? "full" : "installment"
                  }
                  onValueChange={(value: "full" | "installment") =>
                    setPaymentOption(value)
                  }
                  disabled={isPrefilled || isSecondInstallment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">
                      Pay full amount (₹{displayAmount})
                    </SelectItem>
                    <SelectItem value="installment">
                      Pay in installments (₹{firstInstallmentAmount} now + ₹
                      {secondInstallmentAmount} later)
                    </SelectItem>
                  </SelectContent>
                </Select>
                {paymentOption === "installment" && (
                  <p className="text-xs text-gray-500">
                    Note: Only 1 lesson will be unlocked.
                    You&apos;ll need to pay the remaining amount to unlock all
                    lessons.
                  </p>
                )}
              </div>
            )}
            {isSecondInstallment && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription>
                  This is your second installment payment of ₹
                  {secondInstallmentAmount}. Completing this payment will unlock
                  all remaining lessons.
                </AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={
                isLoading ||
                (!paymentDetails.courseId && type === "course") ||
                (!paymentDetails.requestId && type === "reschedule")
              }
            >
              {isLoading ? "Processing..." : "Proceed to Pay"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-black">By continuing, you agree to our</span>
            <div className="mt-1 flex justify-center gap-3">
              <a
                href="https://inlane.in/terms-and-conditions"
                className="text-gray-500 hover:text-blue-500 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>
              <a
                href="https://inlane.in/privacy-policy"
                className="text-gray-500 hover:text-blue-500 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policies
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentPage;
