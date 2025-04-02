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
      <CardHeader className="rounded-t-xl bg-primary text-white">
        <CardTitle className="text-2xl font-bold">Application Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        <p className="text-lg font-semibold">
          {applicationId
            ? `Your LL application (ID: ${applicationId}) is being processed.`
            : "Your LL application ID is being generated."}
        </p>
        <p className="text-base">
          As the government approves the application documents, please prepare
          for the Learner&apos;s License test by going through our fun Learning
          Module.
        </p>
        <p className="text-base font-medium">
          We will get back to you with the next steps very soon 😇
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
        <p className="mt-auto text-base mb-2 text-center">
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
        </>
  );
}
