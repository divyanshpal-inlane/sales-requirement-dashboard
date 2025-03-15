import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";
import { useLearner } from "@/queries/learner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { useLearnerUpdate } from "@/queries/learner";

export default function LLAppointmentBooking() {
  const learner = useLearner();
  const { mutate: updateLearner } = useLearnerUpdate();
  useEffect(() => {
    (async function () {
      const cal = await getCalApi({ namespace: "30min" });
      cal("ui", {
        theme: "light",
        styles: { branding: { brandColor: "#00CE84" } },
        hideEventTypeDetails: true,
        layout: "month_view",
      });
      cal("on", {
        action: "bookingSuccessful",
        callback: (e) => {
          console.log(e);
          updateLearner({ LL_team_appointment_booked: true });

          supabase.functions.invoke("send-message", {
            body: JSON.stringify({
              message_type: "LL_DETAILS_BOOK_APPOINTMENT",
              learner_id: learner.data?.id,
            }),
          });
        },
      });
    })();
  }, [updateLearner, learner]);

  return (
    <div className="flex w-full grow flex-col">
      <Card className="mx-auto mt-4 max-w-2xl">
        <CardHeader className="rounded-t-xl bg-primary text-white">
          <CardTitle className="text-2xl font-bold">
            Schedule Your Appointment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <p className="text-lg font-semibold">
            Before booking your appointment, please fill out the Google form:
          </p>
          <a
            href="https://forms.gle/4Qe8ttAhBYHE7PDq8"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Fill Google Form
          </a>
          <p className="text-base">
            After submitting the form, you can book your appointment for OTP
            verification and confirming your details for your Learner&apos;s
            License application.
          </p>
          <Button
            className="w-full py-3 text-lg"
            data-cal-namespace="30min"
            data-cal-link="inlane.in/30min"
            data-cal-config='{"layout":"month_view","theme":"light"}'
          >
            Book Appointment
          </Button>
        </CardContent>
      </Card>
      <p className="mt-auto text-center text-sm">
        <span>Already have a DL?</span>
        <Button
          variant="link"
          onClick={() => {
            updateLearner({
              LL_result: true,
              has_a_DL: true,
            });
          }}
        >
          Schedule lessons
        </Button>
      </p>
    </div>
  );
}

