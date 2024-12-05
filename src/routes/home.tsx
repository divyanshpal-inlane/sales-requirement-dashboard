import { User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import LLFlow from "@/components/ll_flow";
import { SessionDetails } from "@/components/SessionDetails";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LESSON_CONTENT } from "@/constants/Lesson";
import {
  useLearner,
  useLearnerSchedule,
  useLearnerUpdate,
  useLessonSchedule,
  useUpcomingLesson,
} from "@/queries/learner";

const isWithin30MinutesOfLesson = (
  scheduleDate: string,
  scheduleTime: string,
) => {
  const lessonTime = new Date(`${scheduleDate}T${scheduleTime}`);
  const now = new Date();
  const diffInMinutes = (lessonTime.getTime() - now.getTime()) / (1000 * 60);
  return diffInMinutes <= 30;
};

export default function Home() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useLearner();
  const {
    data: LessonData,
    isLoading: LessonIsLoading,
    error: LessonError,
  } = useUpcomingLesson();

  const { data: lessonSchedule } = useLessonSchedule({
    lessonId: LessonData?.upcomingLesson?.id,
  });

  const { data: scheduledLessons } = useLearnerSchedule({
    learnerId: data?.id,
  });
  const { mutate: updateLearner } = useLearnerUpdate();

  if (isLoading || LessonIsLoading) {
    return <div>Loading...</div>;
  }

  if (error || LessonError) {
    return <p>Error: {error?.message || LessonError?.message}</p>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Static header */}
      <header className="sticky top-0 z-10 flex items-center justify-between p-4">
        <h1 className="text-2xl font-medium">Hi {data?.name || "Learner"}!</h1>
        <Link to="/profile" className="rounded-full bg-white p-1">
          <User size={24} className="hover:text-primary-dark text-primary" />
        </Link>
      </header>

      {/* Main content */}
      <main className="flex flex-grow flex-col p-4 pb-20">
        {data && !data.has_a_DL ? (
          <LLFlow />
        ) : data && data.LL_result === true ? (
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
          ) : LessonData?.upcomingLesson ? (
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
                <div className="flex flex-row gap-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="w-full">
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
                          {lessonSchedule?.status?.toUpperCase() === "ONGOING"
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
                      {(lessonSchedule?.status?.toUpperCase() === "ONGOING" ||
                        lessonSchedule?.status?.toUpperCase() ===
                          "COMPLETED") && (
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
                      navigate(`/lesson/${LessonData?.upcomingLesson?.number}`)
                    }
                    variant="outline"
                    className="w-full"
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
      </main>
    </div>
  );
}
