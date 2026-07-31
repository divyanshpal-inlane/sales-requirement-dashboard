import { useState } from "react";

import { Button } from "@/components/ui/button";
import ImagePopup from "@/components/ui/imagePopup";

import LLApplicationForm from "./LLApplicationForm";

/**
 * Entry screen for the in-app LL application (WAI-75). Shows the documents
 * checklist, then the native form — the Google Form redirect is gone.
 */
export default function LLFillForm({ onExit }: { onExit: () => void }) {
  const localImageUrl = "/assets/documents_list.jpg";

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [continueToForm, setContinueToForm] = useState(false);

  if (continueToForm) {
    return <LLApplicationForm onDone={onExit} />;
  }

  return (
    <div className="container mx-auto p-4 text-center">
      <h1 className="mb-4 text-2xl font-bold">LL Application Form</h1>
      <p className="mb-6">
        Keep your documents ready before proceeding. Fill in your details and
        upload your documents right here — after submitting, you will be able to
        book your appointment for OTP verification.
      </p>
      <Button
        className="mb-4 w-full py-3 text-lg"
        onClick={() => setIsPopupOpen(true)}
      >
        Documents List
      </Button>

      <div className="sticky bottom-0 space-y-3 border-t bg-white py-4">
        <Button
          className="w-full py-3 text-lg"
          onClick={() => setContinueToForm(true)}
        >
          Continue to Form
        </Button>
        <Button className="w-full py-3 text-lg" onClick={onExit}>
          I do not have documents ready
        </Button>
      </div>

      <ImagePopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        imageUrl={localImageUrl}
        altText="Required Documents"
      />
    </div>
  );
}
