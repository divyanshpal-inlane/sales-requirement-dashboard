import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLearner } from "@/queries/learner";
import { useLatestPayment } from "@/queries/payment";

function PaymentStatusCard() {
  const navigate = useNavigate();
  const { data: learner } = useLearner();
  const { data: payment, isLoading } = useLatestPayment(learner?.id);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading payment status...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!payment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-yellow-500" />
            Payment Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-gray-500">
            Please complete the payment to access your account.
          </p>
          <Button onClick={() => navigate("/payment?")} className="w-full">
            Make Payment
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isCompleted = payment.status === "completed";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isCompleted ? (
            <>
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Payment Completed
            </>
          ) : (
            <>
              <XCircle className="h-6 w-6 text-red-500" />
              Payment {payment.status}
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Amount</p>
            <p className="font-medium">₹{payment.amount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Type</p>
            <p className="font-medium capitalize">{payment.payment_type}</p>
          </div>
          {payment.gateway_reference && (
            <div>
              <p className="text-sm text-gray-500">Reference Number</p>
              <p className="font-medium">{payment.gateway_reference}</p>
            </div>
          )}
          {!isCompleted && (
            <Button onClick={() => navigate("/payment")} className="w-full">
              Retry Payment
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PaymentStatusCard;
