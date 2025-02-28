import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLearnerUpdate } from "@/queries/learner";

export function LLTestPreparation() {
  const [hasCompletedTest, setHasCompletedTest] = useState<boolean | null>(
    null,
  );
  const { mutate: updateLearner } = useLearnerUpdate();

  const handleTestCompletion = (completed: boolean) => {
    setHasCompletedTest(completed);
    if (completed) {
      updateLearner({ LL_result: true });
    }
  };

  return (
    <Card className="mx-auto mt-4 max-w-2xl">
      <CardHeader className="rounded-t-xl bg-primary text-white">
        <CardTitle className="text-2xl font-bold">
          Learner&apos;s License Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <p className="text-lg font-semibold">
          Your application has been approved. It&apos;s time for your LL test!
        </p>
        <div>
          <p className="mb-2 font-semibold">Helpful Resources:</p>
          <ul className="list-inside list-disc space-y-2">
            <li>
              <a
                href="https://staging.da3uvaik39s3z.amplifyapp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Learning Module
              </a>
            </li>
            <li>
              <a
                href="https://drive.google.com/file/d/1fyF6GPko_hmazMHI6pBb-nvMu19BbvQE/view"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Test Video Guide
              </a>
            </li>
          </ul>
        </div>
        {hasCompletedTest === null ? (
          <div className="space-y-4">
            <p className="text-lg font-medium">
              Have you completed your LL test and received your license?
            </p>
            <div className="flex justify-center space-x-4">
              <Button onClick={() => handleTestCompletion(true)}>
                Yes, I&apos;ve received my LL
              </Button>
              <Button
                variant="outline"
                onClick={() => handleTestCompletion(false)}
              >
                Not yet
              </Button>
            </div>
          </div>
        ) : hasCompletedTest ? (
          <p className="text-lg font-medium text-green-600">
            Congratulations! You&apos;re now ready to start your practical
            driving lessons.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-lg font-medium">
              No problem! Take your time to prepare well for the test.
            </p>
            <p>
              When you&apos;ve completed your test and received your LL, come
              back here to update your status.
            </p>
            <Button onClick={() => setHasCompletedTest(null)}>
              I&apos;ve completed my test now
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
