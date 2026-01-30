import { ScrollArea } from "@radix-ui/react-scroll-area";
import { useQueryClient } from "@tanstack/react-query";
import {
  addDays,
  formatDuration,
  intervalToDuration,
  isAfter,
  isBefore,
  max,
  set,
  subDays,
} from "date-fns";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Scroll,
  Star,
  ThumbsUp,
  User,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import LLFlow from "@/components/ll_flow";
import PaymentStatusCard from "@/components/payment/PaymentStatusCard";
import { SessionDetails } from "@/components/SessionDetails";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LESSON_CONTENT } from "@/constants/Lesson";
import { supabase } from "@/lib/supabaseClient";
import { useUpdateScheduleStatus } from "@/queries/instructor";
import {
  useLearner,
  useLearnerEnrollment,
  useLearnerSchedule,
  useLearnerUpdate,
  useLessonSchedule,
  useUpcomingLesson,
} from "@/queries/learner";
import { usePaymentsByLearner } from "@/queries/payment";
import { useLearnerRescheduleRequests } from "@/queries/preferences";

const isWithin30MinutesOfLesson = (
  scheduleDate: string,
  scheduleTime: string,
) => {
  if (!scheduleDate || !scheduleTime) return false;
  const lessonTime = new Date(`${scheduleDate}T${scheduleTime}`);
  const now = new Date();
  const diffInMinutes = (lessonTime.getTime() - now.getTime()) / (1000 * 60);
  return diffInMinutes <= 30;
};

const isLessonCompleted = (lesson) => {
  return lesson?.status?.toUpperCase() === "COMPLETED";
};

export default function Home() {
  const navigate = useNavigate();

  const { data: learner, isLoading, error } = useLearner();
  const { data: enrolledCourse, isLoading: isEnrolledCourseLoading } =
    useLearnerEnrollment({ learnerId: learner?.id });

  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const { data: scheduleRequests, isLoading: scheduleRequestsLoading } =
    useLearnerRescheduleRequests(learner?.id);
  const {
    data: LessonData,
    isLoading: LessonIsLoading,
    error: LessonError,
  } = useUpcomingLesson();
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [showEndLessonDialog, setShowEndLessonDialog] = useState(false);
  const [isFinishingLesson, setIsFinishingLesson] = useState(false);
  const { data: lessonSchedule } = useLessonSchedule({
    lessonId: LessonData?.upcomingLesson?.id,
  });

  const { data: scheduledLessons } = useLearnerSchedule({
    learnerId: learner?.id,
    courseId: enrolledCourse?.course_id,
  });
  const {
    mutateAsync: updateScheduleStatusAsync,
    isPending: isUpdateScheduleLoading,
  } = useUpdateScheduleStatus();
  const { mutate: updateLearner } = useLearnerUpdate();
  const queryClient = useQueryClient();
  const maxNumLessonsOnHalfInstallment = 1;
  const numWaiveredLessonUnlocked = 1;
  const { data: payments, isLoading: paymentLoading } = usePaymentsByLearner(
    learner?.id,
  );

  // Find the latest completed payment (course, custom, or demo)
  const completedPayment = Array.isArray(payments)
    ? payments
        .filter(
          (payment: { payment_type: string; status: string }) =>
            ["course", "custom", "demo"].includes(payment.payment_type) &&
            payment.status === "completed",
        )
        .sort(
          (a: { created_at: string }, b: { created_at: string }) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )[0]
    : null;

  const isCompleted =
    completedPayment && completedPayment?.status === "completed";

  if (paymentLoading || isLoading) {
    return <div>Loading...</div>;
  }

  if (!completedPayment && !isCompleted) {
    return (
      <div className="container mx-auto max-w-md py-8">
        <PaymentStatusCard />
      </div>
    );
  }

  // After payment is complete, check if DL question has been answered
  const handleDLResponse = (hasDL: boolean) => {
    if (hasDL) {
      // User has a DL - they already have LL
      updateLearner({
        LL_result: true,
        has_a_DL: true,
        LL_received: true,
      });
    } else {
      // User does not have a DL - needs to go through LL flow
      updateLearner({
        LL_result: null,
        has_a_DL: false,
      });
    }
  };

  // Show DL question if not answered yet (has_a_DL is null/undefined)
  if (learner?.has_a_DL === null || learner?.has_a_DL === undefined) {
    return (
      <div className="flex h-full w-full flex-col">
        <header className="relative h-[300px]">
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <img
              src="/assets/lesson1.png"
              alt="Four-wheeler with driver"
              className="h-full w-full object-fill"
            />
          </div>
        </header>
        <div className="flex h-full flex-col gap-6 p-6">
          <div className="flex flex-col items-center">
            <h2 className="text-center text-2xl font-semibold">
              Do you have a Driving License for a Four Wheeler?
            </h2>
            <p className="mt-2 text-center text-muted-foreground">
              Let us know to proceed with scheduling your lessons
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <Button className="w-full" onClick={() => handleDLResponse(true)}>
              Yes, I have a DL
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleDLResponse(false)}
            >
              No, I need to get LL first
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const localStorageInitOnce = (local_var_name: string) => {
    if (localStorage.getItem(local_var_name)) {
      return;
    }
    if (!learner) return;
    switch (local_var_name) {
      case "onboardingDone":
        localStorage.setItem(
          local_var_name,
          learner.onboarding_completed ? "true" : "false",
        );
        break;
      case "schedulePreferencesUpdated":
        localStorage.setItem(
          local_var_name,
          learner.preferred_start_date ? "true" : "false",
        );
        break;
      default:
        break;
    }
  };
  localStorageInitOnce("onboardingDone");
  localStorageInitOnce("schedulePreferencesUpdated");

  const ls_onboarding_done = localStorage.getItem("onboardingDone");
  if (!learner?.onboarding_completed && ls_onboarding_done != "true") {
    return <Navigate to="/onboard/birthday" />;
  }

  if (
    isLoading ||
    LessonIsLoading ||
    scheduleRequestsLoading ||
    isEnrolledCourseLoading
  ) {
    return <div>Loading...</div>;
  }

  if (error || LessonError) {
    return <p>Error: {error?.message || LessonError?.message}</p>;
  }

  // Show payment completion prompt for half-paid enrollments
  const showPaymentCompletion =
    enrolledCourse?.payment_status === "half_paid" &&
    scheduledLessons &&
    scheduledLessons.some(
      (scheduleItem) =>
        // find the highest unlocked lesson number and check its status
        scheduleItem.lesson?.number === maxNumLessonsOnHalfInstallment &&
        scheduleItem.status?.toUpperCase() === "COMPLETED",
    );
  // if (showPaymentCompletion) {
  //   return (
  //     <div className="mb-6">
  //       <ReminderFullPayment learner />
  //     </div>
  //   );
  // }
  // For half installment,  locked lesson can be started
  const enabledLessonForInstallmentStatus = (
    lessonNumber: number | null,
  ): boolean => {
    if (!lessonNumber) return false;
    if (
      enrolledCourse?.payment_status === "completed" ||
      enrolledCourse?.payment_status === "full_paid"
    )
      return true;
    // Check that the lesson number is within unlocked + waivered range
    return (
      lessonNumber <= maxNumLessonsOnHalfInstallment + numWaiveredLessonUnlocked
    );
  };
  const isWaiveredLesson = (lessonNumber: number | null | undefined) => {
    if (!lessonNumber) return false;
    return (
      lessonNumber > maxNumLessonsOnHalfInstallment &&
      enabledLessonForInstallmentStatus(lessonNumber)
    );
  };

  const isRescheduleForUpcomingLesson =
    scheduleRequests &&
    scheduleRequests.length > 0 &&
    LessonData?.upcomingLesson &&
    scheduleRequests.some(
      (request) => request.lesson_id === LessonData.upcomingLesson.id,
    );

  const renderLesson1ScheduleState = () => (
    <div className="flex flex-col items-center gap-6 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <div className="relative">
            <Clock size={48} className="animate-pulse" />
            <div className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full" />
          </div>
          <h2 className="text-center text-2xl font-semibold">
            Your Schedule is Being Created
          </h2>
          <p className="text-center text-muted-foreground">
            Our team is working on crafting your perfect learning schedule.
            While you wait, play some learning games!
          </p>
        </CardContent>
      </Card>

      <Button
        className="flex w-full max-w-md items-center justify-between gap-2 p-6"
        onClick={() => navigate("/prep")}
      >
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5" />
          <span>Start Your Prep Work</span>
        </div>
        <ArrowRight className="h-5 w-5" />
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        We'll notify you once your schedule is ready.
      </p>
    </div>
  );

  const renderScheduleCreationState = () => (
    <div className="flex flex-col items-center gap-6 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <div className="relative">
            <Clock size={48} className="animate-pulse" />
            <div className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full" />
          </div>
          <h2 className="text-center text-2xl font-semibold">
            Your Schedule is Being Created
          </h2>
          <p className="text-center text-muted-foreground">
            Our team is working on crafting your perfect learning schedule.
            While you wait, play some learning games!
          </p>
        </CardContent>
      </Card>

      <Button
        className="flex w-full max-w-md items-center justify-between gap-2 p-6"
        onClick={() => navigate("/prep")}
      >
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5" />
          <span>Start Your Prep Work</span>
        </div>
        <ArrowRight className="h-5 w-5" />
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        We'll notify you once your schedule is ready.
      </p>

      <h3
        className="**px-4** cursor-pointer rounded bg-primary py-2 text-center text-sm text-white"
        onClick={() => setShowPolicyModal(true)}
      >
        Rescheduling Policy
      </h3>
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-11/12 max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-bold">Rescheduling Policy</h2>
            <ul className="mb-4 list-disc pl-5 text-sm text-gray-800">
              <li>
                Rescheduling within 10 hours of lesson start time will incur a
                charge of ₹300.
              </li>
              <li>Rescheduling more than 10 hours in advance is free.</li>
            </ul>
            <button
              className="mt-2 rounded bg-black px-4 py-2 text-white hover:bg-gray-900"
              onClick={() => setShowPolicyModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
  const renderUpcomingLessonReschedulePending = () => {
    return (
      <div className="flex flex-col gap-2 p-4 text-center text-xl">
        <p>
          Here is your upcoming lesson!
          <br />
          <small>(Reschedule requested)</small>
        </p>
        <h2 className="text-lg font-semibold">
          {
            LESSON_CONTENT[
              LessonData?.upcomingLesson?.number as keyof typeof LESSON_CONTENT
            ].content.title
          }
        </h2>
        <Button
          onClick={() => navigate(`/lesson/${LessonData?.upcomingLesson?.id}`)}
          variant="outline"
          className="grow"
        >
          Lesson Details
        </Button>
      </div>
    );
  };

  const renderUpcomingLesson = () => {
    return (
      <div className="flex flex-col gap-2 p-4 text-center text-xl">
        <p>Here is your upcoming lesson!</p>
        {enrolledCourse?.payment_status === "half_paid" && (
          <Alert className="mb-4 border-primary bg-white">
            <AlertDescription>
              You have paid the first installment. Some lessons are locked until
              you complete the payment.
              <Button
                variant="link"
                className="h-auto p-0 text-primary"
                onClick={() => navigate(`/payment?phone=${learner?.phone}`)}
              >
                Pay remaining amount
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {isWaiveredLesson(LessonData?.upcomingLesson?.number) && (
          <Alert className="mb-4 border-primary bg-white">
            <AlertDescription>
              We're unlocking the current lesson, but make payment before next
              lesson
            </AlertDescription>
          </Alert>
        )}
        {LessonData?.upcomingSchedule &&
          LessonData?.instructor &&
          LessonData?.upcomingLesson && (
            <SessionDetails
              schedule={LessonData.upcomingSchedule}
              instructor={LessonData.instructor}
              lessonNumber={LessonData.upcomingLesson.number ?? 0}
            />
          )}
        <h2 className="text-lg font-semibold">
          {
            LESSON_CONTENT[
              LessonData?.upcomingLesson?.number as keyof typeof LESSON_CONTENT
            ].content.title
          }
        </h2>

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-row flex-wrap gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={async () => {
                      if (
                        LessonData?.upcomingSchedule?.status?.toUpperCase() ===
                        "ONGOING"
                      ) {
                        if (!learner) return;
                        else {
                          setShowEndLessonDialog(true);
                        }
                      } else if (
                        LessonData?.upcomingSchedule?.status?.toUpperCase() ===
                        "BOOKED"
                      ) {
                        setShowLessonDialog(true);
                      }
                    }}
                    className="w-full"
                    disabled={
                      lessonSchedule?.status?.toUpperCase() === "COMPLETED" ||
                      lessonSchedule?.status?.toUpperCase() === "PAUSED" ||
                      !enabledLessonForInstallmentStatus(
                        LessonData?.upcomingLesson?.number,
                      ) ||
                      isFinishingLesson
                    }
                  >
                    {isFinishingLesson
                      ? "Wait for end lesson"
                      : lessonSchedule?.status?.toUpperCase() === "ONGOING"
                        ? "End lesson"
                        : lessonSchedule?.status?.toUpperCase() === "COMPLETED"
                          ? "Lesson Completed"
                          : !enabledLessonForInstallmentStatus(
                                LessonData?.upcomingLesson?.number,
                              )
                            ? "Lesson locked"
                            : lessonSchedule?.status?.toUpperCase() === "PAUSED"
                              ? "Lesson Paused"
                              : "Start Lesson"}
                  </Button>
                </TooltipTrigger>
                {(lessonSchedule?.status?.toUpperCase() === "ONGOING" ||
                  lessonSchedule?.status?.toUpperCase() === "COMPLETED") && (
                  <TooltipContent>
                    <p>
                      {lessonSchedule.status.toUpperCase() === "ONGOING"
                        ? "Session is already in progress"
                        : "Session has been completed"}
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <Button
              onClick={() => {
                navigate(`/lesson/${LessonData?.upcomingLesson?.id}`);
              }}
              variant="outline"
              className="grow"
            >
              Lesson Details
            </Button>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() =>
                    navigate(
                      `/reschedule/${LessonData?.upcomingSchedule?.lesson_id}`,
                    )
                  }
                  variant="secondary"
                  className="w-full"
                  disabled={scheduleRequests && scheduleRequests.length > 0}
                >
                  Reschedule Lesson
                </Button>
              </TooltipTrigger>
              {scheduleRequests && scheduleRequests.length > 0 && (
                <TooltipContent>
                  <p>You have a pending reschedule request</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <h3
            className="cursor-pointer text-center text-sm text-black"
            onClick={() => setShowPolicyModal(true)}
          >
            Rescheduling Policy
          </h3>
          {showPolicyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="w-11/12 max-w-md rounded-lg bg-white p-6 shadow-lg">
                <h2 className="mb-2 text-lg font-bold">Rescheduling Policy</h2>
                <ul className="mb-4 list-disc pl-5 text-sm text-gray-800">
                  <li>
                    Rescheduling within 10 hours of lesson start time will incur
                    a charge of ₹300.
                  </li>
                  <li>Rescheduling more than 10 hours in advance is free.</li>
                </ul>
                <button
                  className="mt-2 rounded bg-black px-4 py-2 text-white hover:bg-gray-900"
                  onClick={() => setShowPolicyModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {showLessonDialog && renderStartLessonDialog()}
          {showEndLessonDialog && renderEndLessonDialog()}
        </div>
      </div>
    );
  };

  const renderCourseCompletionPage = () => (
    <div className="flex flex-col items-center gap-6 p-4 text-center">
      <div className="relative w-full max-w-md overflow-hidden rounded-lg bg-primary p-6 text-white">
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex items-center justify-center rounded-full bg-white/20 p-4">
            <ThumbsUp size={48} className="text-white" />
          </div>

          <h1 className="text-3xl font-bold">Congratulations!</h1>
          <p className="text-xl">
            You've successfully completed all your driving lessons!
          </p>

          <div className="mt-2 flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={24}
                className="fill-yellow-300 text-yellow-300"
              />
            ))}
          </div>
        </div>
      </div>

      <Card className="w-full max-w-md border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-primary">
            Share Your Experience
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-center text-muted-foreground">
            Your feedback helps us improve and helps other learners find us!
          </p>

          <Button
            className="hover:bg-primary-dark w-full bg-primary"
            onClick={() =>
              window.open(
                "https://www.google.com/search?sca_esv=71235db9e3242676&si=APYL9bs7Hg2KMLB-4tSoTdxuOx8BdRvHbByC_AuVpNyh0x2KzQJRCGdyjVAeNpxL_v1ZJZEWLK7nyCxTAIrR2ZeCA8k7wV6unj_LsaY0pK3KhDrig-Qd3VV0QeYWcHIDk8lUXQkgAYTsMeCD1sZwXyhyJceUV-g5VQ%3D%3D&q=Lane+Driving+School+Platform+Reviews&sa=X&ved=2ahUKEwj6q7mT2OGMAxUkcGwGHcpIMqkQ0bkNegQIHxAD&biw=1920&bih=968&dpr=2#lrd=0x4cdc767dad33a5fd:0xda0c670666b6e2c2,3,,,,",
                "_blank",
              )
            }
          >
            Leave a Google Review
          </Button>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Need help? Contact our support team at{" "}
        <a href="mailto:team@inlane.in" className="text-primary underline">
          team@inlane.in
        </a>
      </p>
    </div>
  );

  const lesson9 = scheduledLessons?.find(
    (lesson) => lesson.lesson?.number === 9,
  );
  const lesson10 = scheduledLessons?.find(
    (lesson) => lesson.lesson?.number === 10,
  );

  const isLesson9Completed = lesson9 && isLessonCompleted(lesson9);
  const isLesson10Completed = lesson10 && isLessonCompleted(lesson10);

  // Check if all lessons are completed
  const allLessonsCompleted =
    scheduledLessons &&
    scheduledLessons.length === 10 &&
    scheduledLessons.every((lesson) => isLessonCompleted(lesson));

  if (scheduleRequests?.length > 0 && !LessonData?.upcomingLesson) {
    // lesson 1 getting scheduled
    return (
      <div className="flex min-h-screen flex-col">
        {/* Static header */}
        <header className="sticky top-0 z-10 flex items-center justify-between p-4">
          <h1 className="text-2xl font-medium">
            Hi {learner?.name || "Learner"}!
          </h1>
          <Link to="/profile" className="rounded-full bg-white p-1">
            <User size={24} className="hover:text-primary-dark text-primary" />
          </Link>
        </header>

        {renderLesson1ScheduleState()}
      </div>
    );
  }

  // Start lesson details
  const handleStartLessonDetailsClose = () => {
    setShowLessonDialog(false);
  };
  const renderStartLessonDialog = () => {
    return (
      <Dialog open={showLessonDialog} onOpenChange={setShowLessonDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Start Lesson</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <h2 className="col-span-4 text-left text-lg font-medium">
                Lesson {LessonData?.upcomingLesson?.number} -{" "}
                {LessonData?.course?.name}
                <br />
                Lesson OTP: {LessonData?.upcomingSchedule?.otp}
              </h2>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleStartLessonDetailsClose} variant="secondary">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const handleEndLessonDetailsSave = async (
    scheduleId: string,
    learnerId: string,
  ) => {
    // console.log("Ending lesson for scheduleId:", scheduleId, "learnerId:", learnerId);
    await handleFinishLesson(scheduleId, learnerId);
  };
  const handleEndLessonDetailsClose = () => {
    console.log("schedule details ", LessonData?.upcomingSchedule);
    setShowEndLessonDialog(false);
  };
  const renderEndLessonDialog = () => {
    return (
      <Dialog open={showEndLessonDialog} onOpenChange={setShowEndLessonDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>End Lesson</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <h2 className="col-span-4 text-left text-lg font-medium">
                Lesson {LessonData?.upcomingLesson?.number} -{" "}
                {LessonData?.course?.name}
                <br />
                Tell OTP {LessonData?.upcomingSchedule?.otp_end} to end lesson
              </h2>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                await handleEndLessonDetailsSave(
                  LessonData.upcomingSchedule?.id.toString(),
                  learner.id,
                );
                setShowEndLessonDialog(false);
                toast.success("Lesson ended successfully");
                window.location.reload();
              }}
              variant="secondary"
              disabled={isFinishingLesson}
            >
              {isFinishingLesson ? "Ending lesson..." : "Confirm"}
            </Button>
            <Button onClick={handleEndLessonDetailsClose} variant="secondary">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const handleFinishLesson = async (scheduleId: string, learnerId: string) => {
    setIsFinishingLesson(true);
    try {
      await updateScheduleStatusAsync({
        scheduleId,
        status: "completed",
        started_at: "",
        ended_at: `${String(new Date().getDate()).padStart(2, "0")}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${new Date().getFullYear()} ${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}:${String(new Date().getSeconds()).padStart(2, "0")}`,
      });

      const { data: learnerSchedules, error: schedulesError } = await supabase
        .from("Schedule")
        .select("id, status")
        .eq("learner_id", learnerId);

      if (schedulesError) {
        return;
      }

      const totalLessons = learnerSchedules.length;
      const completedLessons = learnerSchedules.filter(
        (schedule) => schedule.status === "completed",
      ).length;

      if (totalLessons > 0 && completedLessons === totalLessons) {
        const { data, error } = await supabase.functions.invoke(
          "send-message",
          {
            body: {
              message_type: "WEBAPP_LESSONS_DONE_REVIEW_PLEASE",
              learner_id: learnerId,
            },
          },
        );

        if (error) {
          return;
        }
      }

      queryClient.invalidateQueries(["instructorSchedule"]);
    } catch (error) {}
    setIsFinishingLesson(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Static header */}
      <header className="sticky top-0 z-10 flex items-center justify-between p-4">
        <h1 className="text-2xl font-medium">
          Hi {learner?.name || "Learner"}!
        </h1>
        <Link to="/profile" className="rounded-full bg-white p-1">
          <User size={24} className="hover:text-primary-dark text-primary" />
        </Link>
      </header>

      <main
        className="scrollbar-none flex h-[calc(100vh-50px)] flex-col overflow-y-auto p-4 pb-20"
        style={{ scrollbarWidth: "none" }}
      >
        {allLessonsCompleted ? (
          renderCourseCompletionPage()
        ) : (
          <>
            {scheduleRequests &&
            scheduleRequests.length > 0 &&
            scheduleRequests.some((request) =>
              request.lesson_ids.includes(LessonData.upcomingLesson?.id),
            ) ? (
              <>
                <div className="mb-6">
                  {renderUpcomingLessonReschedulePending()}
                </div>
                {renderScheduleCreationState()}
              </>
            ) : LessonData?.upcomingLesson ? (
              <div className="mb-6">{renderUpcomingLesson()}</div>
            ) : (
              <p className="text-center">
                {" "}
                {learner?.LL_received && scheduleRequests?.length > 0
                  ? "No upcoming lesson"
                  : ""}
              </p>
            )}
            {!LessonData?.upcomingLesson &&
              !(scheduleRequests && scheduleRequests.length > 0) && (
                <>
                  {learner && !learner.LL_received ? (
                    <LLFlow />
                  ) : learner && learner.LL_received ? (
                    // Check if this is a demo/custom course
                    (enrolledCourse?.progress?.type === "demo" ||
                      enrolledCourse?.progress?.type === "custom" ||
                      !enrolledCourse?.course_id) &&
                    learner.preferred_start_date ? (
                      // Demo/custom course with preferences already submitted
                      <div className="flex grow flex-col items-center gap-4 p-4 pb-0 text-center">
                        <img
                          src="/assets/clocks.png"
                          alt="Schedule"
                          className="w-48 rounded-lg"
                        />
                        <h2 className="text-xl font-semibold">
                          Your Schedule is Being Created
                        </h2>
                        <p className="text-muted-foreground">
                          Our team is working on crafting your perfect learning
                          schedule. We&apos;ll notify you once your schedule is
                          ready.
                        </p>
                      </div>
                    ) : scheduledLessons && scheduledLessons.length === 0 ? (
                      <div className="flex grow flex-col gap-4 p-4 pb-0 text-center text-xl">
                        <img
                          src="/assets/clocks.png"
                          alt="First Lesson"
                          className="w-full rounded-lg"
                        />
                        <p>
                          Ready for your first lesson? We just need a few more
                          details
                        </p>
                        <Button className="w-full" asChild>
                          <Link to="/createSchedule/details">
                            Set your schedule
                          </Link>
                        </Button>
                        <p className="text-base">
                          Share your availability, and we&apos;ll book your
                          lessons
                        </p>

                        <p className="mt-auto">
                          <span className="text-base">
                            Don&apos;t have an LL?
                          </span>
                          <Button
                            variant="link"
                            onClick={() => {
                              updateLearner({
                                has_a_DL: false,
                                LL_result: null,
                              });
                            }}
                          >
                            Book appointment
                          </Button>
                        </p>
                      </div>
                    ) : (
                      <div className="mt-24 text-center text-xl">
                        {learner?.LL_received_date
                          ? `Your LL was issued on ${learner.LL_received_date}.\n`
                          : ""}
                        You can apply for the Driver licence test after 30 days
                        of LL date.
                        {!learner.DL_test_date
                          ? "Once the test date gets confirmed by you, the lesson 10 can be scheduled within 1 week of the driving test date."
                          : ""}
                        {/*  !learner.has_lesson10_booked ? " Book lesson 10"
                             : "You've booked it" */}
                        {scheduledLessons &&
                          scheduledLessons.length === 9 &&
                          isLesson10Completed === undefined && (
                            <Button
                              className="mt-4 w-full"
                              onClick={() =>
                                navigate(
                                  "/createSchedule/preferences?type=lesson10",
                                )
                              }
                              disabled={
                                !(
                                  learner?.DL_test_date &&
                                  isAfter(
                                    new Date(),
                                    subDays(new Date(learner.DL_test_date), 7),
                                  )
                                )
                              }
                            >
                              Schedule Lesson 10
                            </Button>
                          )}
                      </div>
                    )
                  ) : (
                    <div className="flex h-full flex-col overflow-x-auto pb-20">
                      <div className="mb-6 h-48 w-full rounded-3xl bg-white shadow-lg">
                        <img
                          src="/assets/laptop-typing.png"
                          alt="Person using laptop"
                          className="h-48 w-full object-fill"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
          </>
        )}
      </main>
    </div>
  );
}
