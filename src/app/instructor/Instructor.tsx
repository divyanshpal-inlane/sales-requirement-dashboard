import { useQueryClient } from "@tanstack/react-query";
import {
  CircleCheckBig,
  ExternalLinkIcon,
  PhoneOutgoing,
  UserPen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LESSON_CONTENT } from "@/constants/Lesson";
import { useUser } from "@/context/auth-context";
import { useInstructor, useUpdateScheduleStatus } from "@/queries/instructor";

function Instructor() {
  const { phone } = useUser();
  const {
    data: instructorData,
    isLoading: instructorLoading,
    error: instructorError,
  } = useInstructor(phone ?? "");
  const updateScheduleStatus = useUpdateScheduleStatus();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (instructorLoading) return <div>Loading...</div>;
  if (instructorError)
    return <div>An error occurred: {instructorError.message}</div>;

  const handleFinishLesson = async (scheduleId: string) => {
    try {
      await updateScheduleStatus.mutateAsync({
        scheduleId,
        status: "completed",
      });
      // Invalidate the query to refetch the data and update the UI
      queryClient.invalidateQueries(["instructorSchedule"]);
    } catch (error) {
      console.error("Failed to update lesson status:", error);
    }
  };

  function formatTimeRange(start_time: string, end_time: string): string {
    const formatTime = (time: string): string => {
      const [hours, minutes] = time.split(":");
      let period = "AM";
      let hourNum = parseInt(hours, 10);

      if (hourNum >= 12) {
        period = "PM";
        if (hourNum > 12) {
          hourNum -= 12;
        }
      }

      if (hourNum === 0) {
        hourNum = 12;
      }

      return `${hourNum}:${minutes} ${period}`;
    };

    const formattedStartTime = formatTime(start_time);
    const formattedEndTime = formatTime(end_time);

    return `${formattedStartTime} to ${formattedEndTime}`;
  }

  return (
    <>
      <div className="flex h-full w-full p-6 pb-20">
        <Tabs defaultValue="calendar" className="flex h-full w-full flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="calendar" className="w-full">
              Schedule For The Day (
              {instructorData?.instructorScheduleDay.length})
            </TabsTrigger>
            <TabsTrigger value="lesson" className="w-full">
              All Classes
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="calendar"
            className="flex flex-col justify-between gap-2 overflow-y-auto"
          >
            {instructorData?.learnerLessonDay.map(
              ({ learner, lesson }, index) => {
                const currentSchedule =
                  instructorData.instructorScheduleDay[index];
                const isOngoing = currentSchedule.status === "ongoing";
                return (
                  <Card
                    className={
                      instructorData?.learnerLessonDay.length - 1 === index
                        ? `mb-24`
                        : ``
                    }
                    key={index}
                  >
                    <CardHeader>
                      <CardTitle className="flex flex-wrap items-center justify-between gap-4">
                        <div>Lesson {lesson?.number}</div>
                        <div className="text-sm">
                          {formatTimeRange(
                            currentSchedule.start_time,
                            currentSchedule.end_time,
                          )}
                        </div>
                      </CardTitle>
                      <CardDescription>
                        {lesson?.number &&
                          LESSON_CONTENT[lesson.number]?.content.title}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex flex-row items-center gap-1">
                          <p className="text-nowrap text-muted-foreground">
                            Pick-up Location :
                          </p>
                          <a
                            href={`https://www.google.com/maps?q=${learner.address_lat},${learner.address_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 truncate text-xs underline hover:text-blue-800"
                          >
                            <span className="truncate">
                              {learner.pick_up_location}
                            </span>
                            <ExternalLinkIcon className="h-4 w-4 shrink-0" />
                          </a>
                        </div>
                        <div className="flex flex-row gap-1">
                          <p className="text-muted-foreground">
                            Learner name :
                          </p>
                          <p>{learner.name}</p>
                        </div>
                        <div className="flex flex-row items-center gap-1">
                          <p className="text-muted-foreground">
                            Contact Learner :{" "}
                          </p>
                          <p>{learner.phone}</p>
                          <div className="ml-1">
                            <a href={`tel:+91${learner.phone}`}>
                              <PhoneOutgoing size={14} />
                            </a>
                          </div>
                        </div>
                      </div>
                      <Card className="rounded-smb flex flex-row items-center justify-between gap-4 p-2 shadow-md">
                        <div className="flex w-full flex-wrap items-center justify-between gap-2 p-1 text-xs">
                          <p>
                            Lesson status :{" "}
                            {currentSchedule.status?.toUpperCase()}
                          </p>
                          <div className="flex flex-row items-center gap-24">
                            {isOngoing ? (
                              <div className="relative flex items-center justify-center">
                                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                <div className="absolute h-3 w-3 animate-ping rounded-full bg-green-500"></div>
                              </div>
                            ) : null}
                            {currentSchedule.status === "completed" ? (
                              <div className="flex items-center justify-center">
                                <CircleCheckBig
                                  className="rounded-full bg-green-500 text-white"
                                  size={18}
                                />
                              </div>
                            ) : null}
                          </div>
                          {isOngoing && (
                            <Button
                              onClick={() =>
                                handleFinishLesson(
                                  currentSchedule.id.toString(),
                                )
                              }
                              size="sm"
                              variant="secondary"
                              className="text-xs"
                            >
                              Finish Lesson
                            </Button>
                          )}
                          {currentSchedule.status !== "ongoing" &&
                            currentSchedule.status !== "completed" && (
                              <Button
                                onClick={() => {
                                  navigate(
                                    `/otp/${learner.id}/${currentSchedule.id}`,
                                  );
                                }}
                                size="sm"
                                className="text-xs"
                              >
                                Start
                              </Button>
                            )}
                        </div>
                      </Card>
                    </CardContent>
                  </Card>
                );
              },
            )}
            <div className="fixed bottom-4 right-4">
              <button className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-purple shadow-lg transition duration-200 hover:bg-purple-600">
                <a href="tel:+919748439881">
                  <PhoneOutgoing className="text-white" size={18} />
                </a>
              </button>
            </div>
          </TabsContent>

          <TabsContent
            value="lesson"
            className="flex flex-col justify-between gap-2 overflow-y-scroll"
          >
            {instructorData?.learnerLesson.map(({ learner, lesson }, index) => {
              return (
                <Card
                  className={
                    instructorData?.learnerLesson.length - 1 === index
                      ? `mb-24`
                      : ``
                  }
                  key={index}
                >
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center justify-between gap-4">
                      <div>Lesson {lesson?.number}</div>
                      <div className="text-sm">
                        {formatTimeRange(
                          instructorData.instructorSchedule[index].start_time,
                          instructorData.instructorSchedule[index].end_time,
                        )}
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {lesson?.number &&
                        LESSON_CONTENT[lesson.number]?.content.title}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex flex-row items-center gap-1">
                        <p className="text-nowrap text-muted-foreground">
                          Pick-up Location :
                        </p>
                        <a
                          href={`https://www.google.com/maps?q=${learner.address_lat},${learner.address_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 truncate text-xs underline hover:text-blue-800"
                        >
                          <span className="truncate">
                            {learner.pick_up_location}
                          </span>
                          <ExternalLinkIcon className="h-4 w-4 shrink-0" />
                        </a>
                      </div>
                      <div className="flex flex-row gap-1">
                        <p className="text-muted-foreground">Learner name :</p>
                        <p>{learner.name}</p>
                      </div>
                      <div className="flex flex-row items-center gap-1">
                        <p className="text-muted-foreground">
                          Contact Learner :{" "}
                        </p>
                        <p>{learner.phone}</p>
                        <div className="ml-1">
                          <a href={`tel:+91${learner.phone}`}>
                            <PhoneOutgoing size={14} />
                          </a>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <div className="fixed bottom-4 right-4">
              <button className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-purple shadow-lg transition duration-200 hover:bg-purple-600">
                <a href="/instructor-profile">
                  <UserPen className="text-white" size={24} />
                </a>
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default Instructor;
