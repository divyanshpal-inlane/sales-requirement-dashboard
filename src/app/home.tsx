import { ArrowLeft, Calendar } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import {
  useLearner,
  useSetLLResult,
  useSetLLTestDate,
} from "@/queries/learner";

export default function Home() {
  const { user } = useAuth();
  const { data, isLoading, error } = useLearner(user?.phone);
  const [LLResult, setLLResult] = useState<boolean | null>(null);
  const [key, setKey] = useState(0);

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
    const formattedToday = today.toISOString().split("T")[0];
    return inputDate.toISOString().split("T")[0] === formattedToday;
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
    if (isNaN(targetDate.getTime())) {
      throw new Error("Invalid date format. Use 'yyyy-mm-dd'.");
    }

    // Define month and weekday names
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

  async function LLTestPassed() {
    setLLResult(true);
    await delay(1000);
    setLLResultMutation.mutate({ phone: user?.phone, LL_result: true });
    setLLTestDateMutation.mutate({
      phone: user?.phone,
      testDate: data && data[0]?.LL_test_date,
    });
    setKey((prevKey: number) => prevKey + 1);
  }

  async function LLTestFailed() {
    setLLResult(false);
    await delay(1000);
    setLLResultMutation.mutate({ phone: user?.phone, LL_result: false });
    setLLTestDateMutation.mutate({ phone: user?.phone, testDate: null });
    setKey(key + 1);
  }

  console.log(data && data[0]);

  return (
    <div className="flex h-full flex-col overflow-x-auto p-6 pb-20">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="icon" className="text-primary-foreground">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl">Test Date</h1>
        <div className="w-6" />
      </div>

      <div className="mb-6 h-48 w-full rounded-3xl bg-white shadow-lg">
        <img
          src="/assets/laptop-typing.png"
          alt="Person using laptop"
          className="object-fit h-48 w-full"
        />
      </div>

      {/* when both LL_test_date and LL_test_result is null */}
      {data && data[0].LL_test_date == null && data[0].LL_result != true ? (
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

      {/* user's LL_test_date count-down */}
      {data &&
      data[0].LL_test_date != null &&
      data[0].LL_result != true &&
      isDateGreaterThanToday(data[0].LL_test_date) ? (
        <div className="mt-4 flex flex-col justify-center">
          <Button
            onClick={() => (window.location.href = "/prep")}
            className="mt-auto w-full"
          >
            Start Learning
          </Button>
          <p className="text-center">or should we say, Gaminggg...</p>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="mb-4 text-center">
                <p className="flex items-center justify-center gap-3">
                  <Calendar color="gray" size={24} />
                  <span className="text-gray-500">
                    {formatDate(data[0].LL_test_date)}
                  </span>
                </p>
              </CardTitle>
              <div className="flex flex-row gap-x-12">
                <CardDescription className="text-md w-1/2 border-r-4 border-gray-400 pr-4">
                  <span className="text-xl">
                    {getDateDifference(data[0].LL_test_date).MM}
                  </span>
                  <span> Month(s) and</span>
                  <br></br>
                  <span className="text-xl">
                    {getDateDifference(data[0].LL_test_date).DD}
                  </span>
                  <span> Day(s) to go</span>
                </CardDescription>
                <CardDescription className="text-md w-1/3 self-center text-center">
                  <span className="text-xl">
                    {getTotalDaysDifference(data[0].LL_test_date).DD}
                  </span>
                  <span> Day(s) Remaining</span>
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      {/* user's Test result */}
      {data &&
      isDateEqualToToday(data[0].LL_test_date) &&
      data[0].LL_test_date != null ? (
        <div key={key} className="flex flex-col justify-center">
          <Label className="text-center text-xl">Every step is progress!</Label>
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
              Yayy! 🎉 Let&apos;s get you ready for your first practical lesson!
            </p>
          ) : null}

          {/* text when user failed the LL_test */}
          {LLResult === false ? (
            <p className="mt-4">
              Don&apos;t worry! 🤗 You can try again after 7 days.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
