import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLearnerUpdate } from "@/queries/learner";

export default function OnboardingQuestions() {
  const navigate = useNavigate();
  const { mutate: updateLearner, isPending } = useLearnerUpdate();

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [completionDays, setCompletionDays] = useState<string>("");
  const [twoHourClasses, setTwoHourClasses] = useState<string>("yes");

  const handleSubmit = () => {
    updateLearner(
      {
        preferred_start_date: startDate
          ? format(startDate, "yyyy-MM-dd")
          : null,
        preferred_completion_days: completionDays
          ? parseInt(completionDays)
          : null,
        prefers_two_hour_classes: twoHourClasses === "yes",
      },
      {
        onSuccess: () => {
          navigate("/createSchedule/uploadLL");
        },
      },
    );
  };

  return (
    <div className="scrollbar-hide flex h-full w-full flex-col overflow-y-auto rounded-md">
      <div className="flex flex-col rounded-b-[40px] bg-primary">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
          >
            <Link to="/createSchedule/details">
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <span className="text-lg font-semibold text-primary-foreground">
            2/4
          </span>
        </div>
        <div className="relative z-10 rounded-b-[40px] bg-primary p-6 text-primary-foreground">
          <h1 className="mb-1 text-xl font-semibold">
            Let's customize your learning experience
          </h1>
          <p className="">
            Answer a few questions to help us plan your lessons
          </p>
        </div>
      </div>

      <div className="mt-8 flex w-full flex-col items-center gap-8 bg-white p-6">
        <div className="w-full space-y-8">
          {/* Question 1: Start Date */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">
              When do you want to start your lessons?
            </h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground",
                  )}
                >
                  {startDate ? format(startDate, "PPP") : "Select a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Question 2: Completion Days */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">
              In how many days do you want to complete the course?
            </h3>
            <Input
              type="number"
              min="1"
              placeholder="Enter number of days"
              value={completionDays}
              onChange={(e) => setCompletionDays(e.target.value)}
            />
          </div>

          {/* Question 3: Two-hour Classes */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">
              Do you want to do classes for two hours any day?
            </h3>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="two-hour-classes"
                id="two-hour-yes"
                value="yes"
                checked={twoHourClasses === "yes"}
                onChange={(e) => setTwoHourClasses(e.target.value)}
              />
              <Label htmlFor="two-hour-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="two-hour-classes"
                id="two-hour-no"
                value="no"
                checked={twoHourClasses === "no"}
                onChange={(e) => setTwoHourClasses(e.target.value)}
              />
              <Label htmlFor="two-hour-no">No</Label>
            </div>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={isPending || !startDate || !completionDays}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

