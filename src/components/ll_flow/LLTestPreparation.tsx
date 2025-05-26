import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { useLearnerUpdate } from "@/queries/learner";

export function LLTestPreparation({ learnerId }: { learnerId: string }) {
  const [testStatus, setTestStatus] = useState<"initial" | "passed" | "failed">(
    "initial",
  );
  const [hasReceivedLL, setHasReceivedLL] = useState<boolean | null>(null);
  const [learner, setLearner] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { mutate: updateLearner } = useLearnerUpdate();

  useEffect(() => {
    // Fetch learner details
    const fetchLearnerDetails = async () => {
      setIsLoading(true);
      const { data: learnerData, error } = await supabase
        .from("Learner")
        .select("*")
        .eq("id", learnerId)
        .single();

      if (error) {
        console.error("Error fetching learner details:", error);
      } else {
        setLearner(learnerData);

        // Set initial states based on learner data
        if (learnerData.LL_result === true) {
          setTestStatus("passed");
          setHasReceivedLL(learnerData.LL_received || null);
        } else if (learnerData.LL_result === false) {
          setTestStatus("failed");
        }
      }
      setIsLoading(false);
    };

    fetchLearnerDetails();
  }, [learnerId]);

  // Function to send admin email notifications
  const sendAdminEmail = async (subject: string, message: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-admin-email",
        {
          body: { subject, message },
        },
      );

      if (error) {
        console.error("Error sending admin email:", error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error("Error sending admin email:", error);
    }
  };

  const handleTestCompletion = async (passed: boolean) => {
    if (passed) {
      setTestStatus("passed");
      // Update the database with LL_result
      updateLearner({ LL_result: true });

      // Send WhatsApp notification
      await supabase.functions.invoke("send-message", {
        body: JSON.stringify({
          message_type: "LL_RECEIVED",
          learner_id: learner?.id,
        }),
      });

      // Send admin email notification about passed test
      await sendAdminEmail(
        "Learner Passed LL Test",
        `${learner?.name} (Phone: ${learner?.phone}) has reported passing their Learner's License test. They will update when they receive their physical LL.`,
      );
    } else {
      setTestStatus("failed");
      // Update the database with LL_result
      updateLearner({ LL_result: false });

      // Send WhatsApp notification
      await supabase.functions.invoke("send-message", {
        body: JSON.stringify({
          message_type: "WEBAPP_RESTEST_LL",
          learner_id: learner?.id,
        }),
      });

      // Send admin email notification about failed test
      await sendAdminEmail(
        "Learner Failed LL Test",
        `${learner?.name} (Phone: ${learner?.phone}) has reported failing their Learner's License test. They will need to retake the test.`,
      );
    }
  };

  const handleLLReceived = async (received: boolean) => {
    setHasReceivedLL(received);

    if (received && learner) {
      updateLearner({ LL_result: true, LL_received: true });

      // Send admin email notification about LL received
      await sendAdminEmail(
        "Learner Received Physical LL",
        `${learner?.name} (Phone: ${learner?.phone}) has confirmed receiving their physical Learner's License. They are now ready to proceed with driving lessons.`,
      );
    }
  };

  const resetTest = () => {
    setTestStatus("initial");
    setHasReceivedLL(null);
    updateLearner({ LL_result: null, LL_received: null });
  };

  if (isLoading) {
    return (
      <Card className="mx-auto mt-4 w-full max-w-2xl overflow-hidden px-4">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <p className="text-center">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mx-auto mt-4 w-full max-w-xl overflow-hidden px-4">
        <CardHeader className="rounded-t-xl bg-primary text-white">
          <CardTitle className="text-2xl font-bold">
            Learner&apos;s License Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <p className="break-words text-lg font-semibold">
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
                  className="break-words text-blue-600 hover:underline"
                >
                  Learning Module
                </a>
              </li>
              <li>
                <a
                  href="https://drive.google.com/file/d/1fyF6GPko_hmazMHI6pBb-nvMu19BbvQE/view"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-words text-blue-600 hover:underline"
                >
                  Test Video Guide
                </a>
              </li>
            </ul>
          </div>

          {testStatus === "initial" && (
            <div className="space-y-4">
              <p className="text-lg font-medium">Did you pass your LL test?</p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
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
          )}

          {testStatus === "passed" && hasReceivedLL === null && (
            <div className="space-y-4">
              <p className="text-lg font-medium">
                Have you received your Learner&apos;s License?
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
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
          )}

          {testStatus === "passed" && hasReceivedLL === false && (
            <div className="space-y-4">
              <p className="break-words text-lg font-medium">
                No problem! The government is processing your Learner&apos;s
                License. Please wait for the confirmation message.
              </p>
              <Button
                onClick={() => handleLLReceived(true)}
                className="w-full sm:w-auto"
              >
                I&apos;ve received it now
              </Button>
            </div>
          )}

          {testStatus === "failed" && (
            <div className="space-y-4">
              <p className="break-words text-lg font-medium">
                No problem! Take your time to prepare well for the test.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Button onClick={() => handleTestCompletion(true)}>
                  I&apos;ve passed my test now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setTestStatus("initial")}
                >
                  I haven&apos;t passed now
                </Button>
              </div>
            </div>
          )}

          {testStatus === "passed" && hasReceivedLL === true && (
            <div className="space-y-4">
              <p className="break-words text-lg font-medium text-green-600">
                Great! You've received your Learner's License. You're now ready
                to proceed with driving lessons.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
