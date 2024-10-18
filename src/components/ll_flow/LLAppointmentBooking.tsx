/* First make sure that you have installed the package */

/* If you are using yarn */
// yarn add @calcom/embed-react

/* If you are using npm */
// npm install @calcom/embed-react

import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LLAppointmentBooking() {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi({ namespace: "30min" });
      cal("ui", {
        theme: "light",
        styles: { branding: { brandColor: "#00CE84" } },
        hideEventTypeDetails: true,
        layout: "month_view",
      });
    })();
  }, []);

  return (
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
          data-cal-link="shubham-jain-pxyyf5/30min"
          data-cal-config='{"layout":"month_view","theme":"light"}'
        >
          Book Appointment
        </Button>
      </CardContent>
    </Card>
  );
}
