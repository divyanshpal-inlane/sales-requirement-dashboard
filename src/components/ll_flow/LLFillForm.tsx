import { getCalApi } from "@calcom/embed-react";
import React from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import ImagePopup from "@/components/ui/imagePopup";

import LLAppointmentBooking from "./LLAppointmentBooking";

export default function LLFillForm({
  learnerName,
  learnerEmail,
  learnerPhone,
}) {
  const localImageUrl = "/assets/documents_list.jpg";

  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const [continueToForm, setContinueToForm] = React.useState<boolean>(false);
  const [returnPreviousPage, setReturnPreviousPage] =
    React.useState<boolean>(false);
  const handleContinueClick = () => {
    setContinueToForm(true);
  };
  const handleReturnClick = () => {
    setReturnPreviousPage(true);
  };

  if (returnPreviousPage) {
    return <LLAppointmentBooking />;
  }
  if (continueToForm) {
    if (!learnerName || !learnerEmail || !learnerPhone) {
      console.error(
        "Name, email or phone empty, redirecting to unfilled form",
        learnerName,
        learnerEmail,
        learnerPhone,
      );
      // unfilled form
      window.open("https://forms.gle/4Qe8ttAhBYHE7PDq8", "_blank");
    } else {
      const preFilledFormUrl =
        "https://docs.google.com/forms/d/e/1FAIpQLSffjo3ewZLOspMsNB-4j82PSx3XMp-Zw-PSEvLi4cCY_4jV9A/viewform?usp=pp_url" +
        "&entry.799475635=" +
        learnerName +
        "&entry.1911735067=" +
        learnerEmail +
        "&entry.55658890=" +
        learnerPhone;
      // prefilled form
      console.log(learnerName, learnerEmail, learnerPhone);
      window.open(preFilledFormUrl, "_blank");
    }
    // The page should go to /home but currently the prop are redered at
    // '/home' only, so return back to previous page

    // navigate("/home");
    return <LLAppointmentBooking />;
  }

  const handleClosePopup = () => {
    console.log("Popup closed");
    setIsPopupOpen(false);
  };

  return (
    <div className="container mx-auto p-4 text-center">
      <h1 className="mb-4 text-2xl font-bold">
        You're about to be redirected!
      </h1>
      <p className="mb-6">
        Keep your documents ready before proceeding. Please fill out our Google
        Form to provide your details. After submitting the form, you will be
        able to book your appointment for OTP verification.
      </p>
      <Button
        className="mb-4 w-full py-3 text-lg"
        onClick={() => setIsPopupOpen(true)}
      >
        Documents List
      </Button>
      <Button
        className="mb-4 w-full py-3 text-lg"
        onClick={handleContinueClick}
      >
        Continue to Form
      </Button>
      <Button className="w-full py-3 text-lg" onClick={handleReturnClick}>
        I do not have documents ready
      </Button>

      <ImagePopup
        isOpen={isPopupOpen}
        onClose={handleClosePopup}
        imageUrl={localImageUrl}
        altText="Required Documents"
      />
    </div>
  );
}
