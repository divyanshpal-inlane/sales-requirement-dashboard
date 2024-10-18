import { addMinutes, isAfter } from "date-fns";
import { PhoneOutgoing, SquareArrowOutUpRight } from "lucide-react";

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
import { useInstructor } from "@/queries/instructor";

const Instructor = () => {
  const {
    data: instructorData,
    isLoading: instructorLoading,
    error: instructorError,
  } = useInstructor("3333344444");

  if (instructorLoading) return <div>Loading...</div>;
  if (instructorError)
    return <div>An error occurred: {instructorError.message}</div>;

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

  const shouldShowOTP = (timeStr: string): boolean => {
    // Get current time
    const now = new Date();

    // Parse the time string (format: "HH:mm:ss")
    const [hours, minutes] = timeStr.split(":").map(Number);

    // Create a date object for the lesson time today
    const lessonTime = new Date();
    lessonTime.setHours(hours, minutes, 0);

    // If the lesson time has already passed for today, it's a past lesson
    if (isAfter(now, lessonTime)) {
      return true;
    }

    // Calculate 30 minutes before lesson
    const thirtyMinutesBefore = addMinutes(lessonTime, -30);

    // Show OTP if current time is after the 30-minute mark
    return isAfter(now, thirtyMinutesBefore);
  };

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
              Lesson Details
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="calendar"
            className="flex min-h-screen flex-col justify-between gap-2 overflow-y-scroll"
          >
            {instructorData?.learnerLessonDay.map(
              ({ learner, lesson }, index) => {
                return (
                  <Card
                    className={
                      instructorData?.learnerLessonDay.length - 1 == index
                        ? `mb-24`
                        : ``
                    }
                    key={index}
                  >
                    <CardHeader>
                      <CardTitle className="flex flex-wrap items-center justify-between gap-4">
                        <div>Lesson {lesson.number}</div>
                        <div className="text-sm">
                          {formatTimeRange(
                            instructorData.instructorScheduleDay[index]
                              .start_time,
                            instructorData.instructorScheduleDay[index]
                              .end_time,
                          )}
                        </div>
                      </CardTitle>
                      <CardDescription>
                        {LESSON_CONTENT[lesson.number].content.title}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex flex-row items-center gap-1">
                          <p>Pick-up Location :</p>
                          <p>{learner.pick_up_location}</p>
                          <div className="ml-1">
                            <SquareArrowOutUpRight size={14} />
                          </div>
                        </div>
                        <div className="flex flex-row gap-1">
                          <p>Learner name :</p>
                          <p>{learner.name}</p>
                        </div>
                        <div className="flex flex-row items-center gap-1">
                          <p>Contact Learner : {learner.phone}</p>
                          <div className="ml-1">
                            <a href={`tel:+91${learner.phone}`}>
                              <PhoneOutgoing size={14} />
                            </a>
                          </div>
                        </div>
                        <div className="flex flex-row gap-1">
                          <p>OTP :</p>
                          <p>
                            {shouldShowOTP(
                              instructorData.instructorScheduleDay[index]
                                .start_time,
                            )
                              ? instructorData.instructorScheduleDay[index].otp
                              : "OTP will be available 30 min prior to the lesson"}
                          </p>
                        </div>
                      </div>
                      <Card className="rounded-smb flex flex-row items-center justify-between gap-4 p-2 shadow-md">
                        <div className="flex flex-wrap gap-1 p-1 text-xs">
                          <p>Lesson status :</p>
                          <p>
                            {instructorData.instructorScheduleDay[index].status}
                          </p>
                        </div>
                        <div>
                          <Button size="sm" className="text-xs">
                            Reschedule
                          </Button>
                        </div>
                      </Card>
                    </CardContent>
                  </Card>
                );
              },
            )}
          </TabsContent>

          <TabsContent
            value="lesson"
            className="flex h-full flex-col"
          ></TabsContent>
        </Tabs>
      </div>
      <div className="fixed bottom-4 right-4">
        <button className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-purple shadow-lg transition duration-200 hover:bg-purple-600">
          <a href="tel:+919748439881">
            <PhoneOutgoing className="text-white" size={18} />
          </a>
        </button>
      </div>
    </>
  );
};

export default Instructor;
