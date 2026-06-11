import { getYear } from "date-fns";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLearnerUpdate } from "@/queries/learner";

const days = Array.from({ length: 31 }, (_, i) => i + 1);

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

// Most recent year first so birthdays are quicker to reach.
const years = Array.from({ length: 61 }, (_, i) => getYear(new Date()) - i);

export default function Birthday() {
  const [day, setDay] = useState<string>("");
  const [month, setMonth] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const { mutate, isPending } = useLearnerUpdate();
  const navigate = useNavigate();

  const handleContinueClick = useCallback(() => {
    if (!day || !month || !year) {
      alert("Please select your full date of birth");
      return;
    }

    const dayNum = parseInt(day);
    const monthIndex = months.indexOf(month);
    const yearNum = parseInt(year);

    // Guard against impossible dates (e.g. 31 Feb).
    const candidate = new Date(yearNum, monthIndex, dayNum);
    if (
      candidate.getFullYear() !== yearNum ||
      candidate.getMonth() !== monthIndex ||
      candidate.getDate() !== dayNum
    ) {
      alert("That date doesn't exist. Please check the day and month.");
      return;
    }

    const dob = `${yearNum}-${String(monthIndex + 1).padStart(2, "0")}-${String(
      dayNum,
    ).padStart(2, "0")}`;

    mutate(
      { dob },
      {
        onSuccess: () => navigate("/onboard/aadhar"),
      },
    );
  }, [day, month, year, mutate, navigate]);

  return (
    <div className="flex h-full w-full flex-col rounded-md">
      <div className="flex flex-col rounded-b-[20px] bg-primary">
        <div className="flex items-center justify-end p-4">
          <span className="text-lg font-semibold text-primary-foreground">
            1/2
          </span>
        </div>
        <div className="relative z-10 rounded-b-[40px] bg-primary p-6 text-primary-foreground">
          <h1 className="mb-2 text-2xl font-semibold">
            When&apos;s your birthday?
          </h1>
          <p>We use this to check your eligibility to drive</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white p-6">
        <div className="mt-4 flex items-start gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-sm text-muted-foreground">Day</span>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="DD" />
              </SelectTrigger>
              <SelectContent>
                {days.map((d) => (
                  <SelectItem key={d} value={d.toString()}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-[1.4] flex-col gap-1">
            <span className="text-sm text-muted-foreground">Month</span>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-sm text-muted-foreground">Year</span>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="YYYY" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t bg-white p-4">
        <Button
          onClick={handleContinueClick}
          className="w-full"
          disabled={isPending}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
