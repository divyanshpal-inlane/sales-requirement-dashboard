import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function PaymentResult() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");
  const reference = searchParams.get("reference");
  const phone = searchParams.get("phone");

  useEffect(() => {
    // You can trigger any post-payment actions here
    // For example, refreshing user data, updating UI, etc.
  }, [status]);

  const handleReturnHome = () => {
    if (status === "completed" && phone) {
      navigate(`/login?phone=${encodeURIComponent(phone)}&active=signup`);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="container mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === "completed" ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                Payment Successful
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-red-500" />
                Payment Failed
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium">
                {status === "completed" ? "Completed" : "Failed"}
              </p>
            </div>
            {reference && (
              <div>
                <p className="text-sm text-gray-500">Reference Number</p>
                <p className="font-medium">{reference}</p>
              </div>
            )}
            <div className="pt-4">
              <Button
                onClick={handleReturnHome}
                variant="default"
                className="w-full"
              >
                {status === "completed"
                  ? "Continue to Sign Up"
                  : "Return to Home"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentResult;
