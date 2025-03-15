import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function PaymentStatus() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");
  const reference = searchParams.get("reference");

  useEffect(() => {
    // If no status is provided, redirect to home
    if (!status) {
      navigate("/");
    }
  }, [status, navigate]);

  const isSuccess = status === "completed";

  return (
    <div className="container mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isSuccess ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                <span>Payment Successful</span>
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-red-500" />
                <span>Payment Failed</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-medium">
              {isSuccess ? "Payment Completed" : "Payment Failed"}
            </p>
          </div>

          {reference && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Reference Number</p>
              <p className="break-all font-medium">{reference}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              {isSuccess
                ? "Your payment has been processed successfully."
                : "There was an issue processing your payment."}
            </p>
            {!isSuccess && (
              <p className="text-sm text-gray-500">
                Please try again or contact support if the issue persists.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => navigate("/home")}
              variant="default"
            >
              Return to Home
            </Button>
            {!isSuccess && (
              <Button onClick={() => navigate(-2)} variant="outline">
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentStatus;
