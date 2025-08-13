import { ScrollArea } from "@radix-ui/react-scroll-area";
import { addDays, isAfter, isBefore, subDays } from "date-fns";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Scroll,
  Star,
  ThumbsUp,
  User,
} from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import React, { useState } from "react";

import LLFlow from "@/components/ll_flow";
import PaymentStatusCard from "@/components/payment/PaymentStatusCard";
import { SessionDetails } from "@/components/SessionDetails";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LESSON_CONTENT } from "@/constants/Lesson";
import { supabase } from "@/lib/supabaseClient";
import {
  useLearner,
  useLearnerEnrollment,
  useLearnerSchedule,
  useLearnerUpdate,
  useLessonSchedule,
  useUpcomingLesson,
} from "@/queries/learner";
import { useLatestPayment, usePaymentsByLearner } from "@/queries/payment";
import { useLearnerRescheduleRequests } from "@/queries/preferences";

const isWithin30MinutesOfLesson = (
  scheduleDate: string,
  scheduleTime: string,
) => {
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

  const { data: lessonSchedule } = useLessonSchedule({
    lessonId: LessonData?.upcomingLesson?.id,
  });

  const { data: scheduledLessons } = useLearnerSchedule({
    learnerId: learner?.id,
    courseId: enrolledCourse?.course_id,
  });
  const { mutate: updateLearner } = useLearnerUpdate();

  // Fetch all payments for the learner
  const { data: payments, isLoading: paymentLoading } = usePaymentsByLearner(
    learner?.id,
  );

  // Find the latest completed payment
  const completedPayment = Array.isArray(payments)
    ? payments
        .filter(
          (payment: { payment_type: string; status: string }) =>
            payment.payment_type === "course" && payment.status === "completed",
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

  if (!learner?.onboarding_completed && !learner?.dob) {
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
        scheduleItem.lesson?.number === 2 &&
        scheduleItem.status?.toUpperCase() === "COMPLETED",
    );

  // Check if reschedule request is for the upcoming lesson
  const isRescheduleForUpcomingLesson =
    scheduleRequests &&
    scheduleRequests.length > 0 &&
    LessonData?.upcomingLesson &&
    scheduleRequests.some(
      (request) => request.lesson_id === LessonData.upcomingLesson.id,
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
        className="cursor-pointer text-center text-sm text-white rounded bg-primary py-2 **px-4**"
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

  const renderUpcomingLesson = () => (
    <div className="flex flex-col gap-2 p-4 text-center text-xl">
      <p>Here is your upcoming lesson!</p>
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

      {/* Reschedule & Start Lesson button */}
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-row flex-wrap gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() =>
                    navigate(
                      `/startLesson/${LessonData?.upcomingLesson?.number}`,
                    )
                  }
                  className="w-full"
                  disabled={
                    !isWithin30MinutesOfLesson(
                      LessonData.upcomingSchedule.date,
                      LessonData.upcomingSchedule.start_time,
                    ) || lessonSchedule?.status?.toUpperCase() === "COMPLETED"
                  }
                >
                  {lessonSchedule?.status?.toUpperCase() === "ONGOING"
                    ? "Lesson Started"
                    : lessonSchedule?.status?.toUpperCase() === "COMPLETED"
                      ? "Lesson Completed"
                      : "Start Lesson"}
                </Button>
              </TooltipTrigger>
              {!isWithin30MinutesOfLesson(
                LessonData.upcomingSchedule.date,
                LessonData.upcomingSchedule.start_time,
              ) &&
                !lessonSchedule?.status && (
                  <TooltipContent>
                    <p>Available 30 mins before lesson</p>
                  </TooltipContent>
                )}
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
            onClick={() =>
              navigate(`/lesson/${LessonData?.upcomingLesson?.id}`)
            }
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

        {/* {scheduleRequests && scheduleRequests.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Your reschedule request is being processed.
          </p>
        )} */}
      </div>
    </div>
  );

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

      {/* Main content */}
      <main
        className="scrollbar-none flex h-[calc(100vh-50px)] flex-col overflow-y-auto p-4 pb-20"
        style={{ scrollbarWidth: "none" }}
      >
        {!allLessonsCompleted ? (
          showPaymentCompletion ? (
            <Card className="mb-6 border-primary bg-white">
              <CardHeader>
                <CardTitle className="text-primary">
                  Complete Your Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-primary">
                  You've completed the first installment. Pay the remaining
                  amount to unlock all lessons.
                </p>
                <Button
                  onClick={() => navigate(`/payment?phone=${learner?.phone}`)}
                  className="hover:bg-primary-dark w-full bg-primary"
                >
                  Pay Remaining Amount
                </Button>
              </CardContent>
            </Card>
          ) : (
            <p className="text-center text-xl font-medium">
              Let's start your journey!
            </p>
          )
        ) : (
          <></>
        )}

        {/* Show course completion page if all lessons are completed */}
        {allLessonsCompleted ? (
          renderCourseCompletionPage()
        ) : (
          <>
            {/* Show upcoming lesson first if available */}
            {LessonData?.upcomingLesson && (
              <div className="mb-6">{renderUpcomingLesson()}</div>
            )}

            {/* Then show schedule creation state if there are pending requests */}
            {scheduleRequests &&
              scheduleRequests.length > 0 &&
              renderScheduleCreationState()}

            {/* If no upcoming lesson and no schedule requests, show appropriate content */}
            {!LessonData?.upcomingLesson &&
              !(scheduleRequests && scheduleRequests.length > 0) && (
                <>
                  {learner && !learner.LL_result ? (
                    <LLFlow />
                  ) : learner && learner.LL_result === true ? (
                    scheduledLessons && scheduledLessons.length === 0 ? (
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
                        No Upcoming Lesson. 😓
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
