import { ArrowLeft, Calendar, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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

  console.log(data && data);

  return (
    <div>
      {data && data.LL_result === true ? (
        scheduledLessons && scheduledLessons.length === 0 ? (
          <div className="flex flex-col gap-4 p-6 text-center text-xl">
            {/* profile */}
            <div className="mb-4 flex flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-start text-2xl">
                  Hi {data.name || "Learner"}!
                </p>
                <p className="text-sm">Great job on passing the test.</p>
              </div>
              <div>
                <User size={36} className="rounded-full bg-primary p-1" />
              </div>
            </div>
            <img
              src="/assets/clocks.png"
              alt="First Lesson"
              className="w-full rounded-lg"
            />
            <p>Ready for your first lesson ? We just need few more details</p>
            <Button className="w-full" asChild>
              <Link to="/createSchedule/details">Set your schedule</Link>
            </Button>
            <p className="text-sm">
              Share your availability, and we’ll book your lessons
            </p>
          </div>
        ) : LessonData?.upcomingLesson ? (
          // <div className="relative flex h-screen max-h-[930px] flex-col gap-4 overflow-y-auto">
          //   {/* Image and LessonInfo */}
          //   <div className="relative h-2/5 w-full">
          //     <img
          //       src="/assets/lesson1.png"
          //       alt="Car dashboard"
          //       className="h-full w-full object-fill"
          //     />
          //     <div className="absolute inset-0 bg-black bg-opacity-50">
          //       <div className="flex h-full w-fit flex-col gap-2 bg-[#636363] bg-opacity-70 p-4 text-white">
          //         <Button
          //           variant={"ghost"}
          //           size="icon"
          //           className="text-primary-foreground"
          //         >
          //           <ArrowLeft />
          //         </Button>
          //         <div className="my-auto flex flex-col gap-2">
          //           <h1 className="mb-2 text-lg font-semibold">
          //             Lesson {LessonData?.upcomingLesson?.number}
          //           </h1>
          //           <div className="flex flex-col gap-0 text-xs">
          //             <p className="text-sm">Date, Time</p>
          //             <p className="font-extralight">
          //               {formatDate(LessonData?.upcomingSchedule?.date)}
          //             </p>
          //             <p className="font-extralight">
          //               <span>
          //                 {formatTimeTo12Hour(
          //                   LessonData?.upcomingSchedule?.start_time,
          //                 )}
          //               </span>
          //               {" - "}
          //               <span>
          //                 {formatTimeTo12Hour(
          //                   LessonData?.upcomingSchedule?.end_time,
          //                 )}
          //               </span>
          //             </p>
          //           </div>
          //           <div className="flex flex-col justify-between gap-0">
          //             <p className="text-sm">Instructor Name</p>
          //             <p className="text-xs font-extralight">
          //               {LessonData?.instructor?.name}
          //             </p>
          //           </div>
          //           <div className="flex flex-col justify-between gap-0">
          //             <p className="text-sm">Pick Up location</p>
          //             <p className="text-xs font-extralight">
          //               {data.pick_up_location}
          //             </p>
          //           </div>
          //           <div className="flex flex-col justify-between gap-0">
          //             <p className="text-sm">Car Model</p>
          //             <p className="text-xs font-extralight">
          //               {LessonData?.instructor?.car_make}
          //             </p>
          //           </div>
          //           <div className="flex flex-col justify-between gap-0">
          //             <p className="text-sm">Car Number</p>
          //             <p className="text-xs font-extralight">
          //               {LessonData?.instructor?.car_number}
          //             </p>
          //           </div>
          //         </div>
          //       </div>
          //     </div>
          //   </div>

          //   <div className="flex grow flex-col gap-2 px-6 pb-6">
          //     {/* title */}
          //     <h2 className="text-xl font-semibold">
          //       You will be good at Starting &amp; Stopping the Car
          //     </h2>

          //     {/* points */}
          //     <div className="space-y-4">
          //       {LessonData?.upcomingLesson.number &&
          //         LESSON_CONTENT[
          //           LessonData?.upcomingLesson.number
          //         ].content.points.map((item, index) => (
          //           <div
          //             key={index}
          //             className="flex items-center justify-center space-x-4"
          //           >
          //             <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/50 text-2xl">
          //               {item.icon}
          //             </div>
          //             <div className="w-2/5">
          //               <h3 className="font-semibold text-primary">
          //                 {item.header}
          //               </h3>
          //               <p className="text-sm">{item.desc}</p>
          //             </div>
          //           </div>
          //         ))}
          //     </div>

          //     {/* remember card */}
          //     <Card className="my-6 mb-16 shadow-lg">
          //       <CardHeader>
          //         <CardTitle className="text-primary">
          //           Things to Remember
          //         </CardTitle>
          //       </CardHeader>
          //       <CardContent className="flex flex-col gap-1">
          //         {LESSON_CONTENT[
          //           LessonData?.upcomingLesson.number
          //         ].content.remember.map((item, index) => (
          //           <div key={index} className="flex items-center gap-2">
          //             <div className="flex h-12 w-12 items-center justify-center rounded-full text-2xl">
          //               {item.icon}
          //             </div>
          //             <div className="w-4/5">
          //               <p>{item.text}</p>
          //             </div>
          //           </div>
          //         ))}
          //       </CardContent>
          //     </Card>

          //     {/* Reschedule & Start Lesson button */}
          //     <div className="y-4 sticky bottom-12 mt-auto flex flex-row gap-4 pb-5 backdrop-blur-sm">
          //       <Button
          //         onClick={() =>
          //           navigate(`/OTP/${LessonData?.upcomingLesson.number}`)
          //         }
          //         className="w-full"
          //       >
          //         Reschedule
          //       </Button>
          //       <Button
          //         onClick={() =>
          //           navigate(`/OTP/${LessonData?.upcomingLesson.number}`)
          //         }
          //         className="w-full"
          //       >
          //         Start Lesson
          //       </Button>
          //     </div>
          //   </div>
          // </div>

          //  New Home Screen
          <div className="flex flex-col gap-4 p-6 text-center text-xl">
            {/* profile */}
            <div className="mb-4 flex flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-start text-2xl">
                  Hi {data.name || "Learner"}!
                </p>
                <p className="text-sm">Please Check Your Upcoming Schedule.</p>
              </div>
              <div>
                <User size={36} className="rounded-full bg-primary p-1" />
              </div>
            </div>
            {/* title */}
            <h2 className="mt-6 text-xl font-semibold">
              You will be good at Starting &amp; Stopping the Car
            </h2>

            {/* info */}

            <div className="mx-auto mt-6 w-full rounded-lg p-2 border">
              <div className="grid grid-cols-2 gap-4">
                {/* Row 1 */}
                <div className="rounded p-4">
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">Lesson Number</span>
                    <span className="text-sm font-extralight">
                      Lesson {LessonData?.upcomingLesson?.number}
                    </span>
                  </div>
                </div>
                <div className="rounded p-4">
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">
                      Instructor Name
                    </span>
                    <span className="text-sm font-extralight">
                      {LessonData?.instructor?.name}
                    </span>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="rounded p-4">
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">Date, Time</span>
                    <span className="text-sm font-extralight text-start">
                      {formatDate(LessonData?.upcomingSchedule?.date)}{" "}
                      <span>
                        {formatTimeTo12Hour(
                          LessonData?.upcomingSchedule?.start_time,
                        )}
                      </span>
                      {" - "}
                      <span>
                        {formatTimeTo12Hour(
                          LessonData?.upcomingSchedule?.end_time,
                        )}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="rounded p-4">
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">Car Model</span>
                    <span className="text-sm font-extralight">
                      {LessonData?.instructor?.car_make}
                    </span>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="rounded p-4">
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">
                      Pick Up location
                    </span>
                    <span className="text-sm font-extralight">
                      {data.pick_up_location}
                    </span>
                  </div>
                </div>
                <div className="rounded p-4">
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">Car Number</span>
                    <span className="text-sm font-extralight">
                      {LessonData?.instructor?.car_number}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reschedule & Start Lesson button */}
            <div className="mt-6 flex flex-row gap-4">
              <Button
                onClick={() =>
                  navigate(`/OTP/${LessonData?.upcomingLesson.number}`)
                }
                className="w-full"
              >
                Reschedule
              </Button>
              <Button
                onClick={() =>
                  navigate(`/OTP/${LessonData?.upcomingLesson.number}`)
                }
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
        <div className="flex h-full flex-col overflow-x-auto p-6 pb-20">
          <div className="mb-6 flex flex-row items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-start text-2xl">
                Hi {data.name || "Learner"}!
              </p>
              <p className="text-sm">We’ve got your back!</p>
            </div>
            <div>
              <User size={36} className="rounded-full bg-primary p-1" />
            </div>
          </div>

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
                Let’s get your Learners License!
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
    </div>
  );
}
