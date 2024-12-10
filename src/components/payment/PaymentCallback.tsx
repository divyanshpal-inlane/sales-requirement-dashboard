import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { supabase } from "@/lib/supabaseClient";

interface PaymentResponse {
  EncData: string;
  MerchantId?: string;
  BankId?: string;
  TerminalId?: string;
}

function PaymentCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processPayment = async () => {
      try {
        // Get and parse the payment response from URL
        const paymentResponseStr = searchParams.get("paymentResponse");
        if (!paymentResponseStr) {
          throw new Error("No payment response received");
        }

        let paymentResponse: PaymentResponse;
        try {
          paymentResponse = JSON.parse(paymentResponseStr);
        } catch (e) {
          console.error("Failed to parse payment response:", e);
          throw new Error("Invalid payment response format");
        }

        if (!paymentResponse.EncData) {
          throw new Error("No encrypted data received");
        }

        // Create form data with the parsed response
        const formData = new FormData();
        formData.append("EncData", paymentResponse.EncData);
        if (paymentResponse.MerchantId) {
          formData.append("MerchantId", paymentResponse.MerchantId);
        }
        if (paymentResponse.BankId) {
          formData.append("BankId", paymentResponse.BankId);
        }
        if (paymentResponse.TerminalId) {
          formData.append("TerminalId", paymentResponse.TerminalId);
        }

        // Call the payment callback function
        const { data, error: functionError } = await supabase.functions.invoke(
          "payment-callback",
          {
            method: "POST",
            body: formData,
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (functionError) throw functionError;

        // The edge function will return a redirect URL
        const redirectUrl = data?.redirectUrl;
        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          throw new Error("No redirect URL received");
        }
      } catch (err) {
        console.error("Payment callback error:", err);
        setError(
          err instanceof Error ? err.message : "Payment processing failed",
        );
        // Redirect to failure page after a short delay
        setTimeout(() => {
          navigate("/payment/failure?status=failed");
        }, 2000);
      }
    };

    processPayment();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="container mx-auto max-w-md py-8 text-center">
        <p className="text-lg text-red-500">Error processing payment</p>
        <p className="mt-2 text-sm text-gray-500">{error}</p>
        <p className="mt-4 text-sm text-gray-500">
          Redirecting to failure page...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md py-8 text-center">
      <p className="text-lg">Processing your payment...</p>
      <p className="text-sm text-gray-500">
        Please wait while we verify your payment.
      </p>
    </div>
  );
}

export default PaymentCallback;
