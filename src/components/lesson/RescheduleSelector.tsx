import { format, isBefore } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Schedule, useLearnerSchedule } from "@/queries/learner";

interface RescheduleSelectorProps {
  learnerId: string;
  onLessonsSelected: (schedules: Schedule[]) => void;
}

export default function RescheduleSelector({
  learnerId,
  onLessonsSelected,
}: RescheduleSelectorProps) {
  const [selectedLessons, setSelectedLessons] = useState<Schedule[]>([]);

  const { data: schedules } = useLearnerSchedule({
    learnerId,
  });

  const handleLessonSelect = (schedule: Schedule) => {
    setSelectedLessons((prev) => {
      if (prev.some((s) => s.id === schedule.id)) {
        return prev.filter((s) => s.id !== schedule.id);
      }
      return [...prev, schedule];
    });
  };

  const handleSubmit = () => {
    if (selectedLessons.length === 0) {
      alert("Please select at least one lesson to reschedule");
      return;
    }

    onLessonsSelected(selectedLessons);
  };

  const calculateFee = (date: string, time: string) => {
    const scheduleDate = new Date(`${date}T${time}`);
    const now = new Date();
    const diffHours =
      (scheduleDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours < 72 ? 300 : 0;
  };

  const totalFee = schedules?.reduce((total: number, schedule) => {
    if (selectedLessons.some((s) => s.id === schedule.id)) {
      return total + calculateFee(schedule.date, schedule.startTime);
    }
    return total;
  }, 0);

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-2">
          {schedules
            ?.filter((schedule) =>
              isBefore(new Date(), new Date(schedule.date)),
            )
            .map((schedule) => (
              <Card
                key={schedule.id}
                className={`cursor-pointer transition-colors hover:bg-accent ${
                  selectedLessons.some((s) => s.id === schedule.id)
                    ? "border-primary"
                    : ""
                }`}
                onClick={() =>
                  schedule.lessonId && handleLessonSelect(schedule)
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {format(new Date(schedule.date), "EEEE, MMMM d")}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(
                          new Date(`2000-01-01T${schedule.startTime}`),
                          "h:mm a",
                        )}{" "}
                        -{" "}
                        {format(
                          new Date(`2000-01-01T${schedule.endTime}`),
                          "h:mm a",
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        Lesson {schedule.lesson?.number}
                      </div>
                      {calculateFee(schedule.date, schedule.startTime) > 0 && (
                        <div className="text-sm text-destructive">
                          ₹300 fee applies
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between">
        <div className="text-sm">
          {selectedLessons.length} lesson{selectedLessons.length !== 1 && "s"}{" "}
          selected
          {totalFee && totalFee > 0 ? (
            <span className="ml-2 text-destructive">
              (Total fee: ₹{totalFee})
            </span>
          ) : null}
        </div>
        <Button onClick={handleSubmit} disabled={selectedLessons.length === 0}>
          Continue
        </Button>
      </div>
    </div>
  );
}
