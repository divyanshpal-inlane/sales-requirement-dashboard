import { Calendar, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import LLFlow from "@/components/ll_flow";
import { SessionDetails } from "@/components/SessionDetails";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LESSON_CONTENT } from "@/constants/Lesson";
import { useUser } from "@/context/auth-context";
import {
  useLearner,
  useLearnerSchedule,
  useSetLLResult,
  useSetLLTestDate,
  useUpcomingLesson,
} from "@/queries/learner";

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function Home() {
  const { phone } = useUser();
  const { data, isLoading, error } = useLearner();
  const {
    data: LessonData,
    isLoading: LessonIsLoading,
    error: LessonError,
  } = useUpcomingLesson();
  const { data: scheduledLessons } = useLearnerSchedule({
    learnerId: data?.id,
  });

  const [LLResult, setLLResult] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const [redirecting, SetRedirecting] = useState<boolean>(false);
  const [seconds, setSeconds] = useState<number>(10);

  const setLLResultMutation = useSetLLResult();
  const setLLTestDateMutation = useSetLLTestDate();

  function isDateGreaterThanToday(dateString: string): boolean {
    const inputDate = new Date(dateString);
    const today = new Date();
    // today.setHours(0, 0, 0, 0);
    return inputDate > today;
  }

  function isDateEqualToToday(dateString: string): boolean {
    const inputDate = new Date(dateString);
    const today = new Date();
    const formattedToday = today.toISOString().split("T");
    return inputDate.toISOString().split("T") <= formattedToday;
  }

  function getDateDifference(inputDate: string): { MM: string; DD: string } {
    const currentDate = new Date();
    const targetDate = new Date(inputDate);

    // Ensure the input date is valid
    if (isNaN(targetDate.getTime())) {
      throw new Error("Invalid date format. Use 'yyyy-mm-dd'.");
    }

    // Check if the input date is in the future
    const isFuture = targetDate > currentDate;

    let yearsDiff = targetDate.getFullYear() - currentDate.getFullYear();
    let monthsDiff = targetDate.getMonth() - currentDate.getMonth();
    let daysDiff = targetDate.getDate() - currentDate.getDate();

    if (isFuture) {
      // Adjust the values for future dates
      if (daysDiff < 0) {
        monthsDiff--;
        const lastMonth = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          0,
        );
        daysDiff += lastMonth.getDate();
      }

      if (monthsDiff < 0) {
        yearsDiff--;
        monthsDiff += 12;
      }
    } else {
      // Adjust the values for past dates
      yearsDiff = currentDate.getFullYear() - targetDate.getFullYear();
      monthsDiff = currentDate.getMonth() - targetDate.getMonth();
      daysDiff = currentDate.getDate() - targetDate.getDate();

      if (daysDiff < 0) {
        monthsDiff--;
        const lastMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          0,
        );
        daysDiff += lastMonth.getDate();
      }

      if (monthsDiff < 0) {
        yearsDiff--;
        monthsDiff += 12;
      }
    }

    // Format MM and DD as two-digit strings
    const MM = Math.abs(monthsDiff).toString().padStart(2, "0");
    const DD = Math.abs(daysDiff).toString().padStart(2, "0");

    return { MM, DD };
  }

  function getTotalDaysDifference(inputDate: string): { DD: string } {
    const currentDate = new Date();
    const targetDate = new Date(inputDate);

    // Ensure the input date is valid
    if (isNaN(targetDate.getTime())) {
      throw new Error("Invalid date format. Use 'yyyy-mm-dd'.");
    }

    // Calculate the difference in time (in milliseconds)
    const timeDifference = targetDate.getTime() - currentDate.getTime();

    // Convert the time difference to days (1 day = 24 * 60 * 60 * 1000 milliseconds)
    const totalDays = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

    // Ensure the DD is formatted as a two-digit string
    const DD = Math.abs(totalDays).toString().padStart(2, "0");

    return { DD };
  }

  function formatDate(inputDate: string): string {
    const targetDate = new Date(inputDate);

    // Ensure the input date is valid
    // if (isNaN(targetDate.getTime())) {
    //   throw new Error("Invalid date format. Use 'yyyy-mm-dd'.");
    // }

    // Define month and weekday names

    // Get day, month, and weekday
    const day = targetDate.getDate();
    const month = monthNames[targetDate.getMonth()];
    const weekday = dayNames[targetDate.getDay()];

    // Format the date string as 'DD MMM, Weekday'
    return `${day} ${month}, ${weekday}`;
  }

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function formatTimeTo12Hour(time: string): string {
    // Split the time into hours, minutes, and seconds
    const [hours, minutes] = time.split(":").map(Number);

    // Determine AM or PM
    const period = hours < 12 ? "AM" : "PM";

    // Convert hours to 12-hour format
    const hours12 = hours % 12 || 12;

    // Format the time string
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  }

  async function LLTestPassed() {
    setLLResult(true);
    SetRedirecting(true);
    setSeconds(10);
    setLLResultMutation.mutate({ phone: phone, LL_result: true });
    setLLTestDateMutation.mutate({
      phone: phone,
      LL_test_date: data && data?.LL_test_date,
    });
    await delay(8000);
    navigate(0);
  }

  async function LLTestFailed() {
    setLLResult(false);
    SetRedirecting(true);
    setSeconds(10);
    setLLResultMutation.mutate({ phone: phone, LL_result: false });
    setLLTestDateMutation.mutate({ phone: phone, LL_test_date: null });
    await delay(8000);
    navigate(0);
  }

  useEffect(() => {
    if (LLResult != null && seconds > 0) {
      const intervalId = setInterval(() => {
        setSeconds((prevSeconds) => prevSeconds - 1);
      }, 1000);

      return () => clearInterval(intervalId); // Cleanup interval on component unmount
    }
  }, [seconds, LLResult]);

  if (isLoading || LessonIsLoading) return <div>Loading...</div>;
  if (error || LessonError)
    return <p>Error: {error?.message || LessonError?.message}</p>;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Static header */}
      <header className="sticky top-0 z-10 flex items-center justify-between p-4">
        <h1 className="text-2xl font-bold">Hi {data?.name || "Learner"}!</h1>
        <Link to="/profile" className="rounded-full bg-white p-1">
          <User size={24} className="hover:text-primary-dark text-primary" />
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-grow p-4">
        {data && !data.has_a_DL ? (
          <LLFlow />
        ) : data && data.LL_result === true ? (
          scheduledLessons && scheduledLessons.length === 0 ? (
            <div className="flex flex-col gap-4 p-6 text-center text-xl">
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
              <p className="text-sm">
                Share your availability, and we'll book your lessons
              </p>
            </div>
          ) : LessonData?.upcomingLesson ? (
            <div className="flex flex-col gap-4 p-4 text-center text-xl">
              <h2 className="mt-6 text-xl font-semibold">
                {
                  LESSON_CONTENT[
                    LessonData?.upcomingLesson
                      ?.number as keyof typeof LESSON_CONTENT
                  ].content.title
                }
              </h2>

              {LessonData?.upcomingSchedule &&
                LessonData?.instructor &&
                LessonData?.upcomingLesson && (
                  <SessionDetails
                    schedule={LessonData.upcomingSchedule}
                    instructor={LessonData.instructor}
                    lessonNumber={LessonData.upcomingLesson.number ?? 0}
                  />
                )}

              {/* Reschedule & Start Lesson button */}
              <div className="mt-6 flex flex-row gap-4">
                <Button
                  onClick={() =>
                    navigate(`/reschedule/${LessonData?.upcomingLesson.number}`)
                  }
                  className="w-full"
                >
                  Reschedule
                </Button>
                <Button
                  onClick={() => navigate(`/startLesson`)}
                  className="w-full"
                >
                  Start Lesson
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

            {/* Date input */}
            {data && data.LL_test_date == null && data.LL_result != true ? (
              <div className="flex flex-col justify-center">
                <Label className="mb-4 text-center text-xl">
                  Let&apos;s get your Learners License!
                </Label>

                <div className="flex flex-row justify-center gap-4">
                  <Link to="/bookll-1">
                    <Button className="mt-auto w-full">Book now</Button>
                  </Link>
                  <Link to="/bookll-3">
                    <Button className="mt-auto w-full">Submit Test Date</Button>
                  </Link>
                </div>
              </div>
            ) : null}

            {/* user's LL_test_date count-down until today == LL_test_date */}
            {data &&
            data.LL_test_date != null &&
            data.LL_result != true &&
            isDateGreaterThanToday(data.LL_test_date) ? (
              <div className="mt-4 flex flex-col justify-center">
                <Button className="mt-auto w-full" asChild>
                  <Link to="/prep">Start Learning</Link>
                </Button>
                <p className="text-center">or should we say, Gaminggg...</p>
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="mb-4 text-center">
                      <p className="flex items-center justify-center gap-3">
                        <Calendar color="gray" size={24} />
                        <span className="text-gray-500">
                          {formatDate(data.LL_test_date)}
                        </span>
                      </p>
                    </CardTitle>
                    <div className="flex flex-row gap-x-12">
                      <CardDescription className="text-md w-1/2 border-r-4 border-gray-400 pr-4">
                        <span className="text-xl">
                          {getDateDifference(data.LL_test_date).MM}
                        </span>
                        <span> Month(s) and</span>
                        <br></br>
                        <span className="text-xl">
                          {getDateDifference(data.LL_test_date).DD}
                        </span>
                        <span> Day(s) to go</span>
                      </CardDescription>
                      <CardDescription className="text-md w-1/3 self-center text-center">
                        <span className="text-xl">
                          {getTotalDaysDifference(data.LL_test_date).DD}
                        </span>
                        <span> Day(s) Remaining</span>
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            ) : null}

            {/* user's Test result */}
            {data?.LL_test_date &&
            isDateEqualToToday(data.LL_test_date) &&
            data.LL_result !== true ? (
              <div className="flex flex-col justify-center">
                <Label className="text-center text-xl">
                  Every step is progress!
                </Label>
                <Label className="mb-4 text-center text-xl">
                  How did your LL test go?
                </Label>

                <div className="flex flex-row gap-4">
                  <Button
                    className="mt-auto w-full border-2 border-primary"
                    variant={`${LLResult === true ? "default" : "outline"}`}
                    onClick={() => LLTestPassed()}
                  >
                    Nailed it
                  </Button>
                  <Button
                    className="mt-auto w-full border-2 border-primary"
                    variant={`${LLResult === false ? "default" : "outline"}`}
                    onClick={() => LLTestFailed()}
                  >
                    One more shot
                  </Button>
                </div>
                {/* text when user passed the LL_test */}
                {LLResult === true ? (
                  <p className="mt-4">
                    Yayy! 🎉 Let&apos;s get you ready for your first practical
                    lesson!
                  </p>
                ) : null}

                {/* text when user failed the LL_test */}
                {LLResult === false ? (
                  <p className="mt-4">
                    Don&apos;t worry! 🤗 You can try again after 7 days.
                  </p>
                ) : null}

                {/* redirecting */}
                {redirecting ? (
                  <p className="mt-16 w-[150px] self-center bg-slate-50 p-1 text-center text-xs">
                    Redirecting in {seconds}s...
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
