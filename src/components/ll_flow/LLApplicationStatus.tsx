import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { llStageLabel } from "@/constants/llPipeline";
import { useLearner } from "@/queries/learner";
import { useMyLLApplication } from "@/queries/llCustomer";

import LLApplicationForm from "./LLApplicationForm";

interface LLApplicationStatusProps {
  applicationId: string | null;
}

export function LLApplicationStatus({
  applicationId,
}: LLApplicationStatusProps) {
  const { data: learner } = useLearner();
  const { data: mine } = useMyLLApplication(learner?.id);
  const [showForm, setShowForm] = useState(false);

  const application = mine?.application ?? null;
  const docsRejected = application?.status === "docs_rejected";

  if (showForm) {
    return <LLApplicationForm onDone={() => setShowForm(false)} />;
  }

  return (
    <>
      {docsRejected && (
        <Alert variant="destructive" className="mx-auto mt-4 max-w-2xl">
          <AlertTitle>Your documents need attention</AlertTitle>
          <AlertDescription>
            {application?.rejection_reason ||
              "The RTO team rejected one or more of your documents."}{" "}
            <Button
              variant="link"
              className="h-auto p-0 text-sm underline"
              onClick={() => setShowForm(true)}
            >
              Fix &amp; resubmit
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <Card className="mx-auto mt-4 max-w-2xl">
        <CardHeader className="rounded-t-xl bg-primary text-white">
          <CardTitle className="text-2xl font-bold">
            Application Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {application && (
            <Badge variant="outline" className="text-sm">
              {llStageLabel(application.status)}
            </Badge>
          )}
          <p className="text-lg font-semibold">
            {applicationId
              ? `Your LL application (ID: ${applicationId}) is being processed.`
              : "Your LL application is being processed."}
          </p>
          <p className="text-base">
            You will be able to schedule your lessons as soon as your LL
            application gets approved. As the government approves the
            application documents, please prepare for the Learner&apos;s License
            test by going through our fun Learning Modules.
          </p>
          <p className="text-base font-medium">
            We will get back to you with the next steps very soon. Thank you for
            your patience 😇
          </p>
          <Button
            className="mt-6 w-full py-3 text-lg"
            onClick={() =>
              window.open(
                "https://staging.da3uvaik39s3z.amplifyapp.com",
                "_blank",
              )
            }
          >
            Start Learning Module
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
