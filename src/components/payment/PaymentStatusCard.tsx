import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLearner } from "@/queries/learner";
import { useLatestPayment, usePaymentsByLearner } from "@/queries/payment";

function PaymentStatusCard() {
  const navigate = useNavigate();
  const { data: learner } = useLearner();

  // Fetch all payments for the learner
  const { data: payments, isLoading } = usePaymentsByLearner(learner?.id);

  // Find the latest completed payment
  const completedPayment = Array.isArray(payments)
    ? payments
        .filter(
          (payment: { payment_type: string; status: string }) =>
            payment.payment_type === "course" && payment.status === "completed",
        )
        .sort(
          (a: { created_at: string }, b: { created_at: string }) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )[0]
    : null;

  // Find the latest payment (completed or not)
  const latestPayment = payments?.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading payment status...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!payments) {
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
          <Button onClick={() => navigate(`/payment?phone=${learner?.phone}`)} className="w-full">
            Make Payment
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isCompleted = completedPayment && completedPayment?.status === "completed";
  const payment = isCompleted ? completedPayment : latestPayment;

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
            <Button onClick={() => navigate(`/payment?phone=${learner?.phone}`)} className="w-full">
              Retry Payment
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PaymentStatusCard;
