import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSetLLResult } from "@/queries/learner";
import { Tables } from "@/types/database.types";
import { LLWaitVerification } from "./LLWaitVerification";

interface LLTestResultProps {
  learner: Tables<"Learner">;
}

export function LLTestResult({ learner }: LLTestResultProps) {
  const [result, setResult] = useState<boolean | null>(null);
  const setLLResultMutation = useSetLLResult();

  const handleSetResult = (passed: boolean) => {
    setResult(passed);
    setLLResultMutation.mutate({ LL_result: passed });
  };

  if (learner.LL_result === true) {
    return <LLWaitVerification />;
  }

  const testDate = new Date(learner.LL_test_date!);
  const today = new Date();

  if (testDate > today) {
    const daysUntilTest = Math.ceil(
      (testDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Your LL Test is Coming Up!</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Your test is scheduled for {testDate.toLocaleDateString()}.</p>
          <p>Days until test: {daysUntilTest}</p>
          <p className="mt-2">Keep practicing and good luck!</p>
        </CardContent>
      </Card>
    );
  }

  if (result === null) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>How did your LL test go?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mt-4 flex space-x-4">
            <Button onClick={() => handleSetResult(true)} variant="default">
              I passed!
            </Button>
            <Button onClick={() => handleSetResult(false)} variant="outline">
              I need to retake
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>
          {result ? "Congratulations!" : "Don't worry, you can try again!"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>
          {result
            ? "You've passed your LL test. You're now ready to start your practical driving lessons."
            : "You can retake the test after 7 days. Keep practicing and you'll do great next time!"}
        </p>
      </CardContent>
    </Card>
  );
}
