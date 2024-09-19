import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { DatePicker } from "@/components/date-picker";
import PurpleGradient from "@/components/layout/purple";
import { Button } from "@/components/ui/button";
import { useLearnerUpdate } from "@/queries/learner";

export default function LL_test_booking_3() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const setLLTestDateMutation = useLearnerUpdate();

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleLLTestDate = () => {
    if (!selectedDate) {
      alert("No selected date");
      return;
    }
    setLLTestDateMutation.mutate({
      LL_test_date: format(selectedDate, "yyyy-MM-dd"),
    });
  };

  return (
    <PurpleGradient>
      <div className="flex h-full flex-col p-6">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl">Test Date</h1>
          <div className="w-6" />
        </div>

        <div className="mb-6 overflow-hidden rounded-3xl bg-white shadow-lg">
          <img
            src="/assets/laptop-typing.png"
            alt="aadhar card"
            className="object-fit h-56 w-full"
          />
        </div>

        <p className="mb-4 text-lg">
          When are you taking your Learners License Test?
        </p>

        <DatePicker
          disabled={(date) => date < new Date()}
          date={selectedDate}
          setDate={handleDateChange}
          disableYear={true}
          disableMonth={true}
        />

        <div className="mt-4 flex flex-row justify-center gap-12">
          <a href="/home">
            <Button
              onClick={handleLLTestDate}
              className="mt-auto w-[90px]"
              variant={"purple"}
            >
              Submit
            </Button>
          </a>
        </div>
      </div>
    </PurpleGradient>
  );
}
