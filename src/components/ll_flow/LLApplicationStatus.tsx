import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LLApplicationStatusProps {
  applicationId: string;
}

export function LLApplicationStatus({
  applicationId,
}: LLApplicationStatusProps) {
  return (
    <Card className="mx-auto mt-4 max-w-2xl">
      <CardHeader className="rounded-t-xl bg-primary text-white">
        <CardTitle className="text-2xl font-bold">Application Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        <p className="text-lg font-semibold">
          Your LL application (ID: {applicationId}) is being processed.
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
  );
}
