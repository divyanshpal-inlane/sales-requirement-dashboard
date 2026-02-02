import React from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReminderFullPaymentProps {
  learner: {
    phone: string;
    // add other learner properties if needed
  };
}

export function ReminderFullPayment({ learner }: ReminderFullPaymentProps) {
  const navigate = useNavigate();
  console.log("Learner in ReminderFullPayment", learner);

  return (
    <Card className="mb-6 border-primary bg-white">
      <CardHeader>
        <CardTitle className="text-center text-primary">
          Complete Your Payment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-black">
          You've completed the first installment. Pay the remaining amount to
          unlock all lessons.
        </p>
        <div className="flex justify-center">
          <Button
            onClick={() => navigate(`/payment?phone=${learner?.phone}`)}
            className="hover:bg-primary-dark w-fit bg-primary"
          >
            Pay Remaining Amount
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
