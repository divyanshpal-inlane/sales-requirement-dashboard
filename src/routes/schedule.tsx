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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLearner, useLearnerSchedule } from "@/queries/learner";

const lessonIds = [
  { id: 1, img_path: "/assets/lesson-pic-1.png", desc: "Get to know your car" },
  { id: 2, img_path: "/assets/lesson-pic-2.png", desc: "Balancing the pedals" },
  {
    id: 3,
    img_path: "/assets/lesson-pic-3.png",
    desc: "Gearbox & Steering Control",
  },
  { id: 4, img_path: "/assets/lesson-pic-4.png", desc: "Conquering Parking" },
  {
    id: 5,
    img_path: "/assets/lesson-pic-5.png",
    desc: "Driving at steady speed ",
  },
  {
    id: 6,
    img_path: "/assets/lesson-pic-6.png",
    desc: "Hitting the main road",
  },
  {
    id: 7,
    img_path: "/assets/lesson-pic-7.png",
    desc: "Bumper to bumper traffic",
  },
  { id: 8, img_path: "/assets/lesson-pic-8.png", desc: "Evening driving" },
  {
    id: 9,
    img_path: "/assets/lesson-pic-9.png",
    desc: "Comfortable with flyovers",
  },
  {
    id: 10,
    img_path: "/assets/lesson-pic-10.png",
    desc: "Mini challenges -  Test Prep",
  },
];

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

  const { data: scheduledLessons } = useLearnerSchedule({
    learnerId,
  });

  useEffect(() => {
    if (scheduledLessons) {
      setSelectedDates(scheduledLessons.map((lesson) => new Date(lesson.date)));
    }
  }, [scheduledLessons]);

  const CustomDay = ({ date, displayMonth }) => {
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
  const nextLesson = scheduledLessons?.find(
    (lesson) => new Date(lesson.date) >= new Date(),
  );

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="flex h-full w-full p-6 pb-20">
      <Tabs defaultValue="calendar" className="flex h-full w-full flex-col">
        {/* <div className="flex justify-between gap-10"> */}
        <TabsList className="w-full">
          <TabsTrigger value="calendar" className="w-full">
            Calendar
          </TabsTrigger>
          <TabsTrigger value="lesson" className="w-full">
            Lesson
          </TabsTrigger>
        </TabsList>
        {/* </div> */}
        <TabsContent
          value="calendar"
          className="flex h-full grow flex-col justify-between"
        >
          <Card>
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

          {/* upcoming lesson's card */}

          {nextLesson && nextLesson.lesson ? (
            <Card className="mt-6 bg-gray-50">
              <CardContent className="flex h-full items-center justify-between gap-8 py-4">
                <p className="flex h-full w-2/5 flex-col justify-center gap-1 text-sm">
                  <span className="text-accent-purple">
                    Lesson {nextLesson.lesson.number}
                  </span>
                  <span>{formatTimeTo12Hour(nextLesson.startTime)}</span>
                  <span>{formatTimeTo12Hour(nextLesson.endTime)}</span>
                </p>
                <div className="flex flex-row gap-6 rounded-md bg-white p-2.5 shadow-sm">
                  <Link
                    to={`/lesson/${nextLesson.lesson.number}`}
                    className="text-md mt-1.5 flex flex-col justify-between"
                  >
                    <p>{nextLesson.lesson.description}</p>
                  </Link>
                  <div className="relative flex justify-end">
                    <img
                      className="h-full"
                      src={`/assets/lesson-pic-${nextLesson.lesson.number}.png`}
                      alt="Lesson-pic"
                    />
                    <div className="absolute -bottom-1.5 flex w-full flex-row items-center justify-center gap-1 rounded-sm bg-white px-1.5 py-1 shadow-md">
                      <Link
                        to={`/lesson/${nextLesson.lesson.number}`}
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
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-24 text-center text-lg">
              No Upcoming Lesson. 😓
            </div>
          )}
        </TabsContent>

        <TabsContent value="lesson" className="flex h-full flex-col">
          <div className="h-full grow">
            <div className="flex h-[95%] w-full flex-col gap-2 overflow-y-auto">
              <div className="mb-4 grid grid-cols-2 gap-4">
                {lessonIds.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex flex-col gap-1 rounded-md bg-gray-50 p-3 shadow-md"
                  >
                    <p className="text-accent-purple">Lesson {lesson.id}</p>
                    <div className="relative">
                      <img src={lesson.img_path} alt="Lesson-pic" />
                      <div className="absolute -bottom-1.5 right-1 flex w-[75%] flex-row items-center justify-center gap-1 rounded-sm bg-white px-1.5 py-1 shadow-md">
                        <Link
                          to={`/lesson/${lesson.id}`}
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
                      to={`/lesson/${lesson.id}`}
                      className="text-md mt-1.5"
                    >
                      {lesson.desc}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
