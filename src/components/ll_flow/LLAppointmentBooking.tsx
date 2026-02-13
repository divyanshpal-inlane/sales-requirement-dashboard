import { getCalApi } from "@calcom/embed-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { useLearner } from "@/queries/learner";
import { useLearnerUpdate } from "@/queries/learner";

import LLFillForm from "./LLFillForm";

export default function LLAppointmentBooking() {
  const learner = useLearner();
  const { mutate: updateLearner } = useLearnerUpdate();

  const [showFillFormBanner, setShowFillFormBanner] = useState<boolean>(false);
  const [showLLConfirmDialog, setShowLLConfirmDialog] =
    useState<boolean>(false);

  const handleFillForm = () => {
    setShowFillFormBanner(true);
  };

  const handleConfirmHasLL = () => {
    // User confirms they already have LL - skip LL flow and go to scheduling
    // NOTE: We set LL_received: true, NOT has_a_DL: true
    // has_a_DL means they have a Driving License, which is different from Learner's License
    updateLearner({
      LL_received: true,
      LL_result: true,
      LL_team_appointment_booked: true,
      LL_application_approved: true,
    });
    setShowLLConfirmDialog(false);
  };

  if (!learner) {
    // This assumes useLearner() returns undefined or null while loading.
    return <div>Loading data...</div>;
  }

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
        },
      });
    })();
  }, [updateLearner, learner]);

  // For logging only
  // useEffect(() => {
  //   // This will only run when the `learner` object changes
  //   console.log("updated learner", learner.data);
  //   console.log("updated learner", JSON.stringify(learner.data, null, 2));
  // }, [learner]);

  return (
    <div className="flex w-full grow flex-col">
      {showFillFormBanner ? (
        <LLFillForm
          learnerName={learner.data.name}
          learnerPhone={learner.data.phone}
          learnerEmail={learner.data.email}
        />
      ) : (
        // The colon is followed by a valid JSX expression
        <>
          <Card className="mx-auto mt-4 max-w-2xl">
            <CardHeader className="rounded-t-xl bg-primary text-white">
              <CardTitle className="text-2xl font-bold">
                Schedule Your Appointment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <p className="text-lg font-semibold">
                Before booking your appointment, please fill out the Google
                form:
              </p>
              <Button className="w-full py-3 text-lg" onClick={handleFillForm}>
                Fill google form
              </Button>
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
                disabled={!learner.data.is_LL_form_filled}
              >
                Book Appointment
              </Button>
            </CardContent>
          </Card>
          <p className="mt-auto text-center text-base">
            <span>Already have an LL?</span>
            <Button variant="link" onClick={() => setShowLLConfirmDialog(true)}>
              Schedule lessons
            </Button>
          </p>

          {/* Confirmation Dialog for "Already have an LL" */}
          <Dialog
            open={showLLConfirmDialog}
            onOpenChange={setShowLLConfirmDialog}
          >
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Confirm Learner's License</DialogTitle>
                <DialogDescription>
                  Are you sure you already have a valid Learner's License (LL)?
                  By confirming, you will skip the LL application process and
                  proceed directly to scheduling your driving lessons.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setShowLLConfirmDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleConfirmHasLL}>Yes, I have an LL</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
