import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Home, Phone } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import invariant from "tiny-invariant";

import PurpleGradient from "@/components/layout/purple";
import { SessionDetails } from "@/components/SessionDetails";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLessonSchedule, useUpcomingLesson } from "@/queries/learner";

export default function StartLesson() {
  // debug refs to keep previous values
  const prev = useRef<any>({
    lessonNumber: undefined,
    upcomingData: undefined,
    scheduleData: undefined,
    lessonSchedule: undefined,
    isLoading: undefined,
    error: undefined,
    queryClient: undefined,
    navigate: undefined,
  });

  // 1) useParams
  console.log(
    "[step] about to call useParams - previous lessonNumber:",
    prev.current.lessonNumber,
  );
  const params = useParams();
  const { lessonNumber } = params;
  console.log("[step] after useParams - lessonNumber:", lessonNumber);
  prev.current.lessonNumber = lessonNumber;

  // 2) useUpcomingLesson (hook) - log before, track changes with useEffect
  console.log(
    "[step] about to call useUpcomingLesson - previous upcomingData:",
    prev.current.upcomingData,
  );
  const { data, isLoading, error } = useUpcomingLesson();
  console.log(
    "[step] just after calling useUpcomingLesson (sync) - immediate data/isLoading/error:",
    {
      data,
      isLoading,
      error,
    },
  );

  useEffect(() => {
    console.log(
      "[effect] useUpcomingLesson changed - previous:",
      prev.current.upcomingData,
      "current:",
      data,
    );
    prev.current.upcomingData = data;
  }, [data]);

  useEffect(() => {
    console.log(
      "[effect] isLoading/error changed - previous:",
      { prevLoading: prev.current.isLoading, prevError: prev.current.error },
      "current:",
      { isLoading, error },
    );
    prev.current.isLoading = isLoading;
    prev.current.error = error;
  }, [isLoading, error]);

  // 3) useQueryClient
  console.log(
    "[step] about to call useQueryClient - previous queryClient:",
    prev.current.queryClient,
  );
  const queryClient = useQueryClient();
  console.log(
    "[step] after useQueryClient - queryClient obtained:",
    !!queryClient,
  );
  prev.current.queryClient = queryClient;

  // 4) compute scheduleData from cache
  const upcomingLessonId = data?.upcomingLesson?.id;
  console.log(
    "[step] about to call queryClient.getQueryData - previous scheduleData:",
    prev.current.scheduleData,
    "next key lesson id:",
    upcomingLessonId,
  );
  const scheduleData = queryClient.getQueryData([
    "lessonSchedule",
    upcomingLessonId,
  ]);
  console.log("[step] after getQueryData - scheduleData:", scheduleData);
  prev.current.scheduleData = scheduleData;

  // 5) compute refetchInterval (pure computation, but log prev/new)
  const prevRefetch = prev.current.refetchInterval;
  const refetchInterval =
    scheduleData?.status && scheduleData.status.toUpperCase() === "BOOKED"
      ? 10 * 1000
      : undefined;
  console.log(
    "[step] computed refetchInterval - previous:",
    prevRefetch,
    "current:",
    refetchInterval,
  );
  prev.current.refetchInterval = refetchInterval;

  // 6) useLessonSchedule (hook) - log before, track with useEffect
  console.log(
    "[step] about to call useLessonSchedule - previous lessonSchedule:",
    prev.current.lessonSchedule,
    "args:",
    {
      lessonId: upcomingLessonId,
      refetchInterval,
    },
  );
  const { data: lessonSchedule } = useLessonSchedule({
    lessonId: upcomingLessonId,
    refetchInterval,
  });
  console.log(
    "[step] just after calling useLessonSchedule (sync) - immediate lessonSchedule:",
    lessonSchedule,
  );

  useEffect(() => {
    console.log(
      "[effect] lessonSchedule changed - previous:",
      prev.current.lessonSchedule,
      "current:",
      lessonSchedule,
    );
    prev.current.lessonSchedule = lessonSchedule;
  }, [lessonSchedule]);

  // 7) useNavigate
  console.log(
    "[step] about to call useNavigate - previous navigate:",
    !!prev.current.navigate,
  );
  const navigate = useNavigate();
  console.log("[step] after useNavigate - navigate ready:", !!navigate);
  prev.current.navigate = navigate;

  // 8) final conditional/logging before returns
  console.log("[step] about to evaluate loading/error/lessonNumber - values:", {
    isLoading,
    lessonNumber,
    error: error?.message,
  });

  if (isLoading || !lessonNumber) {
    console.log("[step] returning Loading... - reason:", {
      isLoading,
      lessonNumberMissing: !lessonNumber,
    });
    return <div>Loading...</div>;
  }
  if (error) {
    console.log("[step] returning Error... - error:", error);
    return <div>Error: {error.message}</div>;
  }

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
          <span className="flex items-center space-x-2">
            <Phone size={16} />
            <a href="tel:+919748439881">Emergency Button</a>
          </span>
        </Button>
      </div>
    </PurpleGradient>
  );
}
