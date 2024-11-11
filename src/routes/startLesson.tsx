import { ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router";

import PurpleGradient from "@/components/layout/purple";
import { SessionDetails } from "@/components/SessionDetails";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpcomingLesson, useUpdateScheduleStatus } from "@/queries/learner";

export default function StartLesson() {
  const { data, isLoading, error } = useUpcomingLesson();
  const { mutate, isPending } = useUpdateScheduleStatus();
  const navigate = useNavigate();

  const handleEndLesson = () => {
    mutate(
      {
        scheduleId: data?.upcomingSchedule?.id,
        status: "COMPLETED",
      },
      {
        onSuccess: () => {
          navigate("/home");
        },
      },
    );
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <PurpleGradient>
      <div className="flex h-full flex-col p-6">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl">Lesson Details</h1>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
            onClick={() => navigate("/home")}
          >
            <Home className="h-6 w-6" />
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>OTP for Instructor</span>
              <Badge variant="default">
                {data?.upcomingSchedule?.status
                  ? data?.upcomingSchedule?.status.toUpperCase()
                  : "BOOKED"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-3xl font-bold">
              {data?.upcomingSchedule?.otp}
            </div>
            <p className="mt-2 text-center text-sm">
              Share this OTP with your instructor to start the lesson
            </p>
          </CardContent>
        </Card>

        {data?.upcomingSchedule && data?.instructor && data?.upcomingLesson && (
          <SessionDetails
            schedule={data.upcomingSchedule}
            instructor={data.instructor}
            lessonNumber={data.upcomingLesson.number}
          />
        )}

        <Button className="mb-6 w-full" variant="destructive" asChild>
          <a href="tel:+919748439881">Emergency Button</a>
        </Button>
      </div>
    </PurpleGradient>
  );
}
