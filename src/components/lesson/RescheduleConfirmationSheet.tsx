import { format } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/lib/supabaseClient";
import { Schedule } from "@/queries/learner";

interface RescheduleConfirmationSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSchedules: Schedule[];
  totalFee: number;
  learnerId: string;
}

export default function RescheduleConfirmationSheet({
  isOpen,
  onOpenChange,
  selectedSchedules,
  totalFee,
  learnerId,
}: RescheduleConfirmationSheetProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from("payment")
        .insert([
          {
            learner_id: learnerId,
            amount: totalFee,
            payment_type: "reschedule",
            status: totalFee > 0 ? "pending_payment" : "completed",
          },
        ])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create reschedule request
      const { data: rescheduleRequest, error: rescheduleError } = await supabase
        .from("reschedule_requests")
        .insert({
          amount: totalFee,
          status: totalFee > 0 ? "pending_payment" : "pending",
          learner_id: learnerId,
          lesson_ids: selectedSchedules
            .filter((s) => s.lessonId)
            .map((lesson) => lesson.lessonId!),
          payment_id: payment.id,
        })
        .select()
        .single();

      if (rescheduleError) throw rescheduleError;

      // If payment is required, initiate payment
      if (totalFee > 0) {
        const { data, error: functionError } = await supabase.functions.invoke(
          "handle-reschedule-payment",
          {
            body: {
              amount: totalFee,
              paymentId: payment.id,
              requestId: rescheduleRequest.id,
            },
          },
        );

        if (functionError) throw functionError;

        // Create a form element
        const form = document.createElement("form");
        form.method = "POST";
        form.action = data.gatewayURL;

        // Add all the required fields from the response
        Object.entries(data.formData).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        });

        // Append the form to the document body and submit
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
      } else {
        // If no payment required, redirect to home
        navigate("/");
      }
    } catch (error) {
      console.error("Error creating reschedule request:", error);
      alert("Failed to create reschedule request. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader>
          <SheetTitle>Confirm Reschedule</SheetTitle>
          <SheetDescription>
            Review your selected lessons and confirm rescheduling
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-4">
            <h3 className="font-medium">Selected Lessons</h3>
            <div className="space-y-2">
              {selectedSchedules.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <div className="font-medium">
                      Lesson {lesson.lesson?.number}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(lesson.date), "EEEE, MMMM d")}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(
                        new Date(`2000-01-01T${lesson.startTime}`),
                        "h:mm a",
                      )}{" "}
                      -{" "}
                      {format(
                        new Date(`2000-01-01T${lesson.endTime}`),
                        "h:mm a",
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {totalFee > 0 && (
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Rescheduling Fee</span>
                <span className="font-medium">₹{totalFee}</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Fee applies for rescheduling within 72 hours
              </p>
            </div>
          )}
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="w-full"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading
              ? "Processing..."
              : totalFee > 0
                ? "Proceed to Payment"
                : "Confirm Reschedule"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
