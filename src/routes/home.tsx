import { ArrowRight, BookOpen, Clock, Scroll, User } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";

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
import {
  useLearner,
  useLearnerEnrollment,
  useLearnerSchedule,
  useLearnerUpdate,
  useLessonSchedule,
  useUpcomingLesson,
} from "@/queries/learner";
import { useLatestPayment } from "@/queries/payment";
import { useLearnerRescheduleRequests } from "@/queries/preferences";
import { supabase } from "@/lib/supabaseClient";

import { ScrollArea } from "@radix-ui/react-scroll-area";
import { addDays, isBefore } from "date-fns";

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

  const { data: payment, isLoading: paymentLoading } = useLatestPayment(
    learner?.id,
  );

  if (paymentLoading || isLoading) {
    return <div>Loading...</div>;
  }

  if (!payment || payment.status !== "completed") {
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
  const showPaymentCompletion = enrolledCourse?.payment_status === "half_paid";

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
    </div>
  );

  const lesson9 = scheduledLessons?.find(
    (lesson) => lesson.lesson?.number === 9
  );
  const lesson10 = scheduledLessons?.find(
    (lesson) => lesson.lesson?.number === 10
  );

  const isLesson9Completed = lesson9 && isLessonCompleted(lesson9);
  const isLesson10Completed = lesson10 && isLessonCompleted(lesson10);
  console.log(isLesson9Completed)
                  console.log(learner?.DL_test_date)
                  
                  console.log(isLesson10Completed)

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
      <main className="flex flex-col p-4 pb-20 overflow-y-auto p-4 scrollbar-none  h-[calc(100vh-50px)]"style={{ scrollbarWidth: "none" }}>
        {showPaymentCompletion && (
          <Card className="mb-6 bg-white border-primary">
            <CardHeader>
              <CardTitle className="text-primary">Complete Your Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-primary mb-4">
                You've completed the first installment. Pay the remaining amount to unlock all lessons.
              </p>
              <Button 
                onClick={() => navigate(`/payment?phone=${learner?.phone}`)}
                className="w-full bg-primary hover:bg-primary-dark"
              
              >
                Pay Remaining Amount
              </Button>
            </CardContent>
          </Card>
        )}

        {scheduleRequests && scheduleRequests.length > 0 ? (
          renderScheduleCreationState()
        ) : learner && !learner.LL_result ? (
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
                Ready for your first lesson? We just need a few more details
              </p>
              <Button className="w-full" asChild>
                <Link to="/createSchedule/details">Set your schedule</Link>
              </Button>
              <p className="text-base">
                Share your availability, and we&apos;ll book your lessons
              </p>
              <p className="mt-auto">
                <span className="text-sm">Don&apos;t have a DL?</span>
                <Button
                  variant="link"
                  onClick={() => {
                    updateLearner({ has_a_DL: false, LL_result: null });
                  }}
                >
                  Book an appointment
                </Button>
              </p>
            </div>
          ) : (
            <>
              {LessonData?.upcomingLesson ? (
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
                        LessonData?.upcomingLesson
                          ?.number as keyof typeof LESSON_CONTENT
                      ].content.title
                    }
                  </h2>

                  {/* Reschedule & Start Lesson button */}
                  <div className="mt-6 flex flex-col gap-4">
                    <div className="flex flex-row flex-wrap gap-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="grow">
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
                                ) ||
                                lessonSchedule?.status?.toUpperCase() ===
                                  "COMPLETED"
                              }
                            >
                              {lessonSchedule?.status?.toUpperCase() ===
                              "ONGOING"
                                ? "Lesson Started"
                                : lessonSchedule?.status?.toUpperCase() ===
                                    "COMPLETED"
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
                          {(lessonSchedule?.status?.toUpperCase() ===
                            "ONGOING" ||
                            lessonSchedule?.status?.toUpperCase() ===
                              "COMPLETED") && (
                            <TooltipContent>
                              <p>
                                {lessonSchedule.status.toUpperCase() ===
                                "ONGOING"
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
                    <Button
                      onClick={() =>
                        navigate(
                          `/reschedule/${LessonData?.upcomingSchedule?.lesson_id}`,
                        )
                      }
                      variant="secondary"
                      className="w-full"
                    >
                      Reschedule Lesson
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-24 text-center text-xl">
                  No Upcoming Lesson. 😓
                  
                  {scheduledLessons && scheduledLessons.length === 9 && isLesson10Completed===undefined && (
                    <Button
                      className="mt-4 w-full"
                      onClick={() =>
                        navigate("/createSchedule/preferences?type=lesson10")
                      }
                      
                      disabled={
                        !isLesson9Completed && 
                        !(learner?.DL_test_date && isBefore(new Date(), addDays(new Date(learner.DL_test_date), 7)))
                      }
                    >
                      
                      Schedule Lesson 10
                    </Button>
                  )}
                </div>
              )}
            </>
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
      </main>
    </div>
  );
}
