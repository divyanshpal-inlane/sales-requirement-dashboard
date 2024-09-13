import { addDays, format, startOfDay } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import CalendarTimeSlotSelector from "@/components/lesson/schedule";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSchedule } from "@/queries/learner";

export default function ScheduleSlots() {
  const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()));
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);

  const { data, isLoading } = useSchedule();

  const days = useMemo(
    () => Array.from({ length: 10 }, (_, i) => addDays(startDate, i)),
    [startDate],
  );

  const scheduleSlots = useMemo(() => {
    if (!data) return {};

    const slots: { [key: string]: boolean } = {};
    data.forEach((schedule) => {
      const date = schedule.date;
      const hour = Number(schedule.start_time?.split(":")[0]);
      const key = `${date}-${hour}`;
      slots[key] = true;
    });
    return slots;
  }, [data]);

  const hours = useMemo(() => Array.from({ length: 13 }, (_, i) => i + 9), []);

  const blockedSlots = useMemo(() => {
    if (!data) return {};

    const blocked: { [key: string]: boolean } = {};
    days.forEach((day) => {
      hours.forEach((hour) => {
        const date = format(day, "yyyy-MM-dd");
        const t = data.findIndex(
          (schedule) =>
            Number(schedule.start_time?.split(":")[0]) === hour &&
            date === schedule.date &&
            schedule.learner_id !== null,
        );
        const key = `${date}-${hour}`;
        blocked[key] = t !== -1;
      });
    });
    return blocked;
  }, [days, hours, data]);

  return (
    <div className="flex h-full w-full flex-col rounded-md">
      <div className="flex flex-col rounded-b-[40px] bg-primary">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
            asChild
          >
            <Link to="/createSchedule/details">
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <span className="text-lg font-semibold text-primary-foreground">
            2/3
          </span>
        </div>
        <div className="relative z-10 rounded-b-[40px] bg-primary p-6 text-primary-foreground">
          <h1 className="mb-1 text-xl font-semibold">
            When are you free for the lesson?
          </h1>
          <p className="">We&apos;ll use these slots for your lessons</p>
        </div>
      </div>

      <ScrollArea className="mt-4 flex grow overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          <CalendarTimeSlotSelector
            blockedSlots={blockedSlots}
            days={days}
            hours={hours}
          />
          <Button className="w-full" asChild>
            <Link to="/createSchedule/uploadLL">Continue</Link>
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
