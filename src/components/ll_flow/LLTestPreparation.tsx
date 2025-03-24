import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { useLearnerUpdate } from "@/queries/learner";

export function LLTestPreparation({ learnerId }: { learnerId: string }) {
  const [hasCompletedTest, setHasCompletedTest] = useState<boolean | null>(
    null,
  );
  const [hasPassedTest, setHasPassedTest] = useState<boolean | null>(null);
  const [hasReceivedLL, setHasReceivedLL] = useState<boolean | null>(null);
  const [learner, setLearner] = useState<any>(null);
  const { mutate: updateLearner } = useLearnerUpdate();

  useEffect(() => {
    // Fetch learner details
    const fetchLearnerDetails = async () => {
      const { data: learnerData, error } = await supabase
        .from("Learner")
        .select("*")
        .eq("id", learnerId) // Use the learnerId parameter to fetch the correct learner
        .single();

      if (error) {
        console.error("Error fetching learner details:", error);
      } else {
        setLearner(learnerData);
      }
    };

    fetchLearnerDetails();
  }, [learnerId]);

  const handleTestCompletion = (passed: boolean) => {
    if(passed) {
      supabase.functions.invoke("send-message", {
        body: JSON.stringify({
          message_type: "LL_RECEIVED",
          learner_id: learner.id,
        }),
      });
    }
    setHasPassedTest(passed);
    if (!passed) {
      supabase.functions.invoke("send-message", {
        body: JSON.stringify({
          message_type: "WEBAPP_RESTEST_LL",
          learner_id: learner.id,
        }),
      });
      setHasCompletedTest(false);
    }
  };

  const handleLLReceived = (received: boolean) => {
    setHasReceivedLL(received);
    if (received && learner) {
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
        {hasPassedTest === null ? (
          <div className="space-y-4">
            <p className="text-lg font-medium">
              Did you pass your LL test?
            </p>
            <div className="flex justify-center space-x-4">
              <Button onClick={() => handleTestCompletion(true)}>
                Yes, I passed
              </Button>
              <Button
                variant="outline"
                onClick={() => handleTestCompletion(false)}
              >
                No, I didn&apos;t pass
              </Button>
            </div>
          </div>
        ) : hasPassedTest && hasReceivedLL === null ? (
          <div className="space-y-4">
            <p className="text-lg font-medium">
              Have you received your Learner&apos;s License?
            </p>
            <div className="flex justify-center space-x-4">
              <Button onClick={() => handleLLReceived(true)}>
                Yes, I&apos;ve received it
              </Button>
              <Button
                variant="outline"
                onClick={() => handleLLReceived(false)}
              >
                Not yet
              </Button>
            </div>
          </div>
        ) : hasPassedTest && hasReceivedLL ? (
          <p className="text-lg font-medium text-green-600">
            Congratulations! The government is printing your Learner&apos;s
            License. As soon as you receive a message from the government, do
            let us know and book your on-road practice lessons.
          </p>
        ) : hasPassedTest && !hasReceivedLL ? (
          <div className="space-y-4">
            <p className="text-lg font-medium">
              No problem! The government is processing your Learner&apos;s
              License. Please wait for the confirmation message.
            </p>
            <Button onClick={() => setHasReceivedLL(null)}>
              I&apos;ve received it now
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-lg font-medium">
              No problem! Take your time to prepare well for the test.
            </p>
            <p>
              When you&apos;ve completed your test and received your LL, come
              back here to update your status.
            </p>
            <Button onClick={() => setHasPassedTest(null)}>
              I&apos;ve passed my test now
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
