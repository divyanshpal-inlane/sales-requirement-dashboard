// DatePickerDemo.tsx
import { CalendarIcon } from "@radix-ui/react-icons";
import { format, getMonth, getYear, setMonth, setYear } from "date-fns";
import * as React from "react";
import { Matcher } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

export function DatePicker({
  date,
  setDate,
  disabled,
  disableYear,
  disableMonth,
}: {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  disabled?: Matcher;
  disableYear?: boolean;
  disableMonth?: boolean;
}) {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const years = Array.from(
    { length: 61 },
    (_, i) => getYear(new Date()) - 60 + i,
  );

  const handleYearChange = (year: string) => {
    setCurrentDate(setYear(currentDate, parseInt(year)));
  };

  const handleMonthChange = (month: string) => {
    setCurrentDate(setMonth(currentDate, months.indexOf(month)));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="flex items-center justify-between space-x-2 p-3">
          {!disableYear ? (
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
          ) : null}
          {!disableMonth ? (
            <Select
              onValueChange={handleMonthChange}
              value={months[getMonth(currentDate)]}
              disabled={disableMonth}
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
          ) : null}
        </div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          month={currentDate}
          onMonthChange={setCurrentDate}
          initialFocus
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}
