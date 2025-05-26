import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LLApplicationStatusProps {
  applicationId: string | null;
}

export function LLApplicationStatus({
  applicationId,
}: LLApplicationStatusProps) {
  return (
    <>
      <Card className="mx-auto mt-4 max-w-2xl">
        <CardHeader className="text-white rounded-t-xl bg-primary">
          <CardTitle className="text-2xl font-bold">
            Application Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-lg font-semibold">
            {applicationId
              ? `Your LL application (ID: ${applicationId}) is being processed.`
              : "Your LL application ID is being generated."}
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
            className="py-3 mt-6 w-full text-lg"
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
        <p className="mt-auto mb-2 text-base text-center">
        Shared LL details?{" "}
        <a
          href="https://forms.gle/4Qe8ttAhBYHE7PDq8"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Submit now
        </a>
      </p>
      </Card>
      {/* <p className="mt-auto mb-2 text-base text-center">
        Shared LL details?{" "}
        <a
          href="https://forms.gle/4Qe8ttAhBYHE7PDq8"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Submit now
        </a>
      </p> */}
    </>
  );
}
