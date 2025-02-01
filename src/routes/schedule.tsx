/* eslint-disable prettier/prettier */
import { format, isSameDay } from "date-fns";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COURSES_DATA } from "@/constants/courses";
import {
  useLearner,
  useLearnerEnrollment,
  useLearnerSchedule,
} from "@/queries/learner";

type CustomDayProps = {
  date: Date;
  displayMonth?: Date;
};

export default function Schedule() {
  function formatTimeTo12Hour(time: string): string {
    // Validate input time format
    const regex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    if (!regex.test(time)) {
      throw new Error("Invalid time format. Expected format is HH:MM:SS.");
    }

    // Split the time into hours, minutes, and seconds
    const [hours, minutes] = time.split(":").map(Number);

    // Determine AM or PM
    const period = hours < 12 ? "AM" : "PM";

    // Convert hours to 12-hour format
    const hours12 = hours % 12 || 12;

    // Format the time string
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  }

  const { data: learner, isLoading, error } = useLearner();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const learnerId = learner?.id;
  const { data: enrollment } = useLearnerEnrollment({ learnerId });
  const { data: scheduledLessons } = useLearnerSchedule({
    learnerId,
    courseId: enrollment?.course_id,
  });

  useEffect(() => {
    if (scheduledLessons) {
      setSelectedDates(scheduledLessons.map((lesson) => new Date(lesson.date)));
    }
  }, [scheduledLessons]);

  const CustomDay = ({ date }: CustomDayProps) => {
    if (!scheduledLessons) return null;

    const lessonsForDay = scheduledLessons.filter((lesson) =>
      isSameDay(new Date(lesson.date), date),
    );

    if (lessonsForDay.length === 0) {
      return <div className="h-8 w-8 p-0">{date.getDate()}</div>;
    }
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`h-8 w-8 p-0 font-normal ${
              date < new Date().setHours(0, 0, 0, 0)
                ? "bg-gray-300 text-gray-600"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {date.getDate()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-fit">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Scheduled Lessons
            </h3>
            {lessonsForDay.map((lesson) => {
              const now = new Date();
              const isLessonPast =
                new Date(`${lesson.date}T${lesson.startTime}`) < now;
              return (
                <p
                  key={lesson.id}
                  className={`flex flex-col gap-1 text-xs ${isLessonPast ? "text-gray-400 line-through" : ""}`}
                >
                  <span
                    className={`${isLessonPast ? "text-gray-400" : "text-gray-600"}`}
                  >
                    {format(
                      new Date(`2000-01-01T${lesson.startTime}`),
                      "h:mm a",
                    )}{" "}
                    -
                    {format(new Date(`2000-01-01T${lesson.endTime}`), "h:mm a")}
                  </span>
                  <span
                    className={`${isLessonPast ? "text-gray-400" : "text-accent-purple"}`}
                  >
                    Lesson {lesson.lesson?.number}: {lesson.lesson?.description}
                  </span>
                </p>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // TODO: fix the time thingy
  const nextLesson = scheduledLessons?.find((lesson) => {
    const now = new Date();
    const currentDateTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
    );

    const [year, month, day] = lesson.date.split("-").map(Number);
    const [hours, minutes] = lesson.startTime.split(":").map(Number);
    const lessonDateTime = new Date(year, month - 1, day, hours, minutes);

    return lessonDateTime > currentDateTime;
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const lessonData = enrollment?.course_id
    ? COURSES_DATA[enrollment.course_id].lessonsData
    : undefined;
  const courseLessons = enrollment?.Courses?.Lesson || [];
  return (
    <div className="flex h-full w-full p-6 pb-20">
      <Tabs defaultValue="calendar" className="flex h-full w-full flex-col">
        <TabsList className="w-full">
          <TabsTrigger value="calendar" className="w-full">
            Calendar
          </TabsTrigger>
          <TabsTrigger value="lesson" className="w-full">
            Lesson
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="calendar"
          className="flex h-full flex-col overflow-y-auto"
        >
          <div className="flex min-h-full flex-col">
            <Card className="flex-none">
              <CardHeader>Upcoming schedule</CardHeader>
              <CardContent>
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  className="w-full rounded-md"
                  components={{
                    Day: CustomDay,
                  }}
                />
              </CardContent>
            </Card>

            <h2 className="mt-6 text-lg font-medium">Upcoming Lesson</h2>

            {nextLesson && nextLesson.lesson ? (
              <Card className="mb-6 mt-6 bg-gray-50">
                <CardContent className="flex h-full flex-col items-start gap-4 py-4">
                  <p className="flex h-full w-full gap-2 text-sm">
                    <span className="text-accent-purple">
                      Lesson {nextLesson.lesson.number}
                    </span>
                    <span>
                      {new Date(nextLesson.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      | {formatTimeTo12Hour(nextLesson.startTime)} -{" "}
                      {formatTimeTo12Hour(nextLesson.endTime)}
                    </span>
                  </p>
                  <div className="flex w-full flex-col gap-2 rounded-md shadow-sm">
                    <Link
                      to={`/lesson/${nextLesson.lesson.id}`}
                      className="text-md flex flex-col justify-between"
                    >
                      <p>
                        {nextLesson.lesson.number && lessonData
                          ? lessonData[nextLesson.lesson.number.toString()]
                              ?.description
                          : ""}
                      </p>
                    </Link>
                    <div className="relative">
                      <img
                        className="h-full w-full object-cover"
                        src={`/assets/lesson-pic-${nextLesson.lesson.number}.png`}
                        alt="Lesson-pic"
                      />
                      <div className="absolute bottom-0 flex w-full flex-row items-center justify-center gap-1 rounded-sm bg-white px-1.5 py-1 shadow-md">
                        <Link
                          to={`/lesson/${nextLesson.lesson.id}`}
                          className="font-medium text-primary"
                        >
                          More details
                        </Link>
                        <ChevronRight
                          color="white"
                          className="rounded-full bg-primary"
                          size={20}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="mt-24 text-center text-lg">
                No Upcoming Lesson. 😓
              </div>
            )}
          </div>
        </TabsContent>
        <ScrollArea className="relative">
          <TabsContent value="lesson" className="h-full overflow-y-auto">
            <div className="grid grid-cols-2 gap-4 pb-6">
              {enrollment?.course_id &&
                Object.values(
                  COURSES_DATA[enrollment.course_id].lessonsData,
                ).map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex flex-col gap-1 rounded-md bg-gray-50 p-3 shadow-md"
                  >
                    <p className="text-accent-purple">Lesson {lesson.id}</p>
                    <div className="relative">
                      <img src={lesson.image_path} alt="Lesson-pic" />
                      <div className="absolute -bottom-1.5 right-1 flex w-[75%] flex-row items-center justify-center gap-1 rounded-sm bg-white px-1.5 py-1 shadow-md">
                        <Link
                          to={`/lesson/${
                            courseLessons.find(
                              (l) => l.number === parseInt(lesson.id),
                            )?.id
                          }`}
                          className="text-xs text-primary"
                        >
                          More details
                        </Link>
                        <ChevronRight
                          color="white"
                          className="rounded-full bg-primary"
                          size={16}
                        />
                      </div>
                    </div>
                    <Link
                      to={`/lesson/${
                        courseLessons.find(
                          (l) => l.number === parseInt(lesson.id),
                        )?.id
                      }`}
                      className="text-md mt-1.5"
                    >
                      {lesson.description}
                    </Link>
                  </div>
                ))}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
