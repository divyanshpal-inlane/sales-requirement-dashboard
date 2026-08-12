import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useLearner } from "@/queries/learner";
import { useMyLLApplication } from "@/queries/llCustomer";
import Home from "@/routes/home";

import { LLApplicationStatus } from "./LLApplicationStatus";
import LLAppointmentBooking from "./LLAppointmentBooking";
import LLJourney from "./LLJourney";
import { LLTestPreparation } from "./LLTestPreparation";
import { LLWaitVerification } from "./LLWaitVerification";

function LLFlow() {
  const { data: learner, isLoading, error } = useLearner();
  const { data: mine, isLoading: appLoading } = useMyLLApplication(learner?.id);

  if (isLoading || appLoading)
    return <LoadingSpinner className="mx-auto mt-8" />;
  if (error)
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  if (!learner)
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>No learner data found</AlertDescription>
      </Alert>
    );

  // New status-driven journey (RTO-flow spec): whenever an ll_applications
  // row exists it is the single source of truth for the homepage state.
  if (mine?.application) {
    return <LLJourney />;
  }

  // No application row: learners who already started the LEGACY flow
  // (Google-Form era flags) continue on the old screens so they don't get
  // bounced back to "fill the form".
  if (learner.is_LL_form_filled || learner.LL_team_appointment_booked) {
    if (!learner.LL_team_appointment_booked) {
      return <LLAppointmentBooking />;
    }
    if (!learner.LL_application_approved) {
      return <LLApplicationStatus applicationId={learner.LL_application_id} />;
    }
    if (!learner.LL_test_date) {
      return <LLTestPreparation learnerId={learner.id} />;
    }
    if (!learner.LL_received) {
      return <LLWaitVerification />;
    }
    return <Home />;
  }

  // Fresh learner, nothing started yet — the journey opens on the
  // "fill the LL form" state (an application row is created on submit).
  return <LLJourney />;
}

export default LLFlow;
