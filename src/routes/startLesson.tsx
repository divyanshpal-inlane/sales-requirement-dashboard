import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Home } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import invariant from "tiny-invariant";

import PurpleGradient from "@/components/layout/purple";
import { SessionDetails } from "@/components/SessionDetails";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLessonSchedule, useUpcomingLesson } from "@/queries/learner";

export default function StartLesson() {
  const { lessonNumber } = useParams();
  invariant(lessonNumber, "lessonNumber is required");
  const { data, isLoading, error } = useUpcomingLesson();
  const queryClient = useQueryClient();
  const scheduleData = queryClient.getQueryData([
    "lessonSchedule",
    data?.upcomingLesson?.id,
  ]);
  const { data: lessonSchedule } = useLessonSchedule({
    lessonId: data?.upcomingLesson?.id,
    refetchInterval:
      scheduleData?.status && scheduleData.status.toUpperCase() === "BOOKED"
        ? 10 * 1000
        : undefined,
  });
  const navigate = useNavigate();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <PurpleGradient>
      <div className="flex h-full flex-col p-6">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl">Lesson Details</h1>
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground"
            onClick={() => navigate("/home")}
          >
            <Home className="h-6 w-6" />
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {lessonSchedule?.status?.toUpperCase() === "BOOKED"
                  ? "OTP for Instructor"
                  : "Session Status"}
              </span>
              <Badge variant="default">
                {lessonSchedule?.status
                  ? lessonSchedule?.status.toUpperCase()
                  : "BOOKED"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lessonSchedule?.status?.toUpperCase() === "BOOKED" ? (
              <>
                <div className="text-center text-3xl font-bold">
                  {data?.upcomingSchedule?.otp}
                </div>
                <p className="mt-2 text-center text-sm">
                  Share this OTP with your instructor to start the lesson
                </p>
              </>
            ) : lessonSchedule?.status?.toUpperCase() === "ONGOING" ? (
              <div className="text-center">
                <div className="text-2xl font-semibold text-green-600">
                  Session In Progress
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Your driving lesson is currently in progress
                </p>
              </div>
            ) : lessonSchedule?.status?.toUpperCase() === "COMPLETED" ? (
              <div className="text-center">
                <div className="text-2xl font-semibold text-blue-600">
                  Session Completed
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Your driving lesson has been completed successfully
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-600">
                  Status Unknown
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Unable to determine the current session status
                </p>
              </div>
            )}
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
