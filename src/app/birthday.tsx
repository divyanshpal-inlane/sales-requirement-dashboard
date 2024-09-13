import { format, getMonth, getYear, setMonth, setYear } from "date-fns";
import { ArrowLeft } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router";
import invariant from "tiny-invariant";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/auth-context";
import { useLearnerUpdate } from "@/queries/learner";

const years = Array.from(
  { length: 61 },
  (_, i) => getYear(new Date()) - 60 + i,
);

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function Birthday() {
  const { user } = useAuth();
  const phone = user?.phone;
  invariant(
    user !== null && typeof phone === "string",
    "user phone is required",
  );
  const [date, setDate] = useState<Date>();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { mutate, isPending } = useLearnerUpdate();
  const navigate = useNavigate();

  const handleYearChange = (year: string) => {
    setCurrentDate(setYear(currentDate, parseInt(year)));
  };

  const handleMonthChange = (month: string) => {
    setCurrentDate(setMonth(currentDate, months.indexOf(month)));
  };

  const handleContinueClick = React.useCallback(() => {
    if (!date) {
      alert("Birthdate is required");
      return;
    }
    mutate(
      {
        phone,
        data: {
          dob: format(date, "yyyy-MM-dd"),
        },
      },
      {
        onSuccess: () => navigate("/onboard/aadhar"),
      },
    );
  }, []);

  return (
    <div className="flex h-full w-full flex-col rounded-md">
      <div className="flex flex-col rounded-b-[20px] bg-primary">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <span className="text-lg font-semibold text-primary-foreground">
            1/2
          </span>
        </div>
        <div className="relative z-10 rounded-b-[40px] bg-primary p-6 text-primary-foreground">
          <h1 className="mb-2 text-2xl font-bold">When's your birthday?</h1>
          <p>We use this to check your eligibility to drive</p>
        </div>
      </div>
      <div className="mt-8 flex grow flex-col justify-between bg-white p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <Select
              onValueChange={handleYearChange}
              value={getYear(currentDate).toString()}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              onValueChange={handleMonthChange}
              value={months[getMonth(currentDate)]}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            month={currentDate}
            onMonthChange={setCurrentDate}
            className="rounded-lg border border-border p-4"
            initialFocus
          />
        </div>
        <Button onClick={handleContinueClick} className="w-full">
          Continue
        </Button>
      </div>
    </div>
  );
}
