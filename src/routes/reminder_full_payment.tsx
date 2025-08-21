
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ReminderFullPaymentProps {
  learner: {
    phone: string;
    // add other learner properties if needed
  };
}

export function ReminderFullPayment({ learner }: ReminderFullPaymentProps) {
    const navigate = useNavigate();

    return (
            <main
            className="scrollbar-none flex h-[calc(100vh-50px)] flex-col overflow-y-auto p-4 pb-20"
            style={{ scrollbarWidth: "none" }}
        >

                <header className="sticky top-0 z-10 flex items-center justify-between p-4">
                    <h1 className="text-2xl font-medium">
                        Let's continue the journey
                    </h1>
                </header>
                    {/* <CardHeader>
                        <CardTitle className="text-primary">
                            Complete Your Payment
                        </CardTitle>
                    </CardHeader> */}
                    {
                        <p className="mb-4 mt-8 text-center text-gray-700">
                            Complete Your Payment
                        </p>
                    }
                    {/* <CardContent> */}
                        <p className="mb-4 text-gray-700">
                            You've completed the first installment. Pay the remaining
                            amount to unlock all lessons.
                        </p> 
                        <Button
                        onClick={() => navigate(`/payment?phone=${learner?.phone}`)}
                        className="hover:bg-primary-dark w-full bg-primary"
                        >
                        Pay Remaining Amount
                        </Button>
                    {/* </CardContent> */}
            </main>
        );

    }