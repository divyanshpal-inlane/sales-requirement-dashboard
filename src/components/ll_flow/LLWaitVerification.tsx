import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSetLLResult } from "@/queries/learner";
import Home from "@/routes/home";
import { useNavigate } from "react-router-dom";


export function LLWaitVerification() {
    const navigate = useNavigate();
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Congratulations!</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            On passing the test. Please wait while you documents are verified. You will be notified once the verification is complete.
          </p>
        </CardContent>
        <div className="flex justify-center p-6 pt-0">
          <Button
            className="w-1/2"
            onClick={() => {navigate("/prep")}}
          >
            Prep for lessons
          </Button>
        </div>
      </Card>
    );

  };