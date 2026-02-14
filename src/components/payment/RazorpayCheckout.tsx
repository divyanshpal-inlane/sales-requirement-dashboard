import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRazorpay } from "@/hooks/useRazorpay";

interface RazorpayCheckoutProps {
  paymentData: {
    amount: number;
    email: string;
    phone: string;
    name: string;
    paymentType: string;
    courseId?: string;
    learnerId?: string;
    installmentType?: string;
    installment1Amount?: number;
    installment2Amount?: number;
    selectedModules?: string[];
    totalHours?: number;
    isDemoUpgrade?: boolean;
    demoPaymentId?: string | null;
    courseSelectionType?: string;
    enrollmentId?: string;
    totalAmount?: number;
    requestId?: string;
    parentPaymentId?: string;
  };
  onCancel: () => void;
}

export function RazorpayCheckout({
  paymentData,
  onCancel,
}: RazorpayCheckoutProps) {
  const navigate = useNavigate();
  const { isLoading, error, createOrder, verifyPayment, openCheckout } =
    useRazorpay();
  const [status, setStatus] = useState<
    "creating" | "checkout" | "verifying" | "success" | "error"
  >("creating");

  useEffect(() => {
    const initiatePayment = async () => {
      setStatus("creating");

      // Create Razorpay order
      const orderData = await createOrder(paymentData);

      if (!orderData) {
        setStatus("error");
        return;
      }

      setStatus("checkout");

      // Open Razorpay checkout
      await openCheckout(
        orderData,
        {
          name: paymentData.name,
          email: paymentData.email,
          phone: paymentData.phone,
        },
        async (response) => {
          // Payment successful - verify with backend
          setStatus("verifying");

          const verified = await verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            paymentId: orderData.paymentId,
          });

          if (verified) {
            setStatus("success");
            // Redirect to success page
            navigate("/payment-success?status=success");
          } else {
            setStatus("error");
          }
        },
        () => {
          // Payment cancelled/dismissed
          onCancel();
        },
      );
    };

    initiatePayment();
  }, [
    paymentData,
    createOrder,
    openCheckout,
    verifyPayment,
    navigate,
    onCancel,
  ]);

  if (status === "creating" || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {status === "creating"
            ? "Creating payment order..."
            : "Processing payment..."}
        </p>
      </div>
    );
  }

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Verifying your payment...
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">
          Payment successful! Redirecting...
        </p>
      </div>
    );
  }

  if (status === "error" || error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error || "Payment failed. Please try again."}
        </AlertDescription>
      </Alert>
    );
  }

  // Default checkout state - Razorpay modal should be open
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">
        Opening payment gateway...
      </p>
    </div>
  );
}
