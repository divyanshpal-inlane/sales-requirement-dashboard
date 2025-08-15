import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useLearner } from "@/queries/learner";
import Home from "@/routes/home";

import { LLApplicationStatus } from "./LLApplicationStatus";
import LLAppointmentBooking from "./LLAppointmentBooking";
import { LLTestPreparation } from "./LLTestPreparation";
import { LLWaitVerification } from "./LLWaitVerification";

function LLFlow() {
  const { data: learner, isLoading, error } = useLearner();

  if (isLoading) return <LoadingSpinner className="mx-auto mt-8" />;
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

  // console.log("learner", learner);
  if (!learner.LL_team_appointment_booked) {
    return <LLAppointmentBooking />;
  }

  if (!learner.LL_application_approved) {
    return <LLApplicationStatus applicationId={learner.LL_application_id} />;
  }

  if (!learner.LL_test_date) {
    return <LLTestPreparation learnerId={learner.id} />;
  }

  if (learner.LL_result) {
    return <LLWaitVerification />
  }
  
  return <Home />;
}

export default LLFlow;
