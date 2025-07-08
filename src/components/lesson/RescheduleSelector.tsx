import { format, isBefore } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Schedule, useLearnerSchedule } from "@/queries/learner";

import { Label } from "../ui/label";

interface RescheduleSelectorProps {
  learnerId: string;
  courseId: string;
  onLessonsSelected: (schedules: Schedule[]) => void;
}

interface GroupedSchedule {
  date: string;
  schedules: Schedule[];
}

export default function RescheduleSelector({
  learnerId,
  courseId,
  onLessonsSelected,
}: RescheduleSelectorProps) {
  const [selectedLessons, setSelectedLessons] = useState<Schedule[]>([]);

  const { data: schedules } = useLearnerSchedule({
    learnerId,
    courseId,
  });

  const groupedSchedules = schedules?.reduce(
    (groups: GroupedSchedule[], schedule) => {
      const date = schedule.date;
      const existingGroup = groups.find((g) => g.date === date);

      if (existingGroup) {
        existingGroup.schedules.push(schedule);
      } else {
        groups.push({ date, schedules: [schedule] });
      }

      return groups;
    },
    [],
  );

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

  const calculateDayFee = (date: string) => {
    const scheduleDate = new Date(date);
    const now = new Date();
    const diffHours =
      (scheduleDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours < 6 ? 300 : 0;
  };

  const getTotalFee = () => {
    if (!groupedSchedules) return 0;
    return groupedSchedules.reduce((total, group) => {
      const hasSelectedLessonInDay = group.schedules.some((schedule) =>
        selectedLessons.some((s) => s.id === schedule.id),
      );

      return total + (hasSelectedLessonInDay ? calculateDayFee(group.date) : 0);
    }, 0);
  };

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-2">
          {groupedSchedules
            ?.filter((group) => {
              // Keep groups that have at least one valid schedule
              return group.schedules.some((schedule) => {
                const now = new Date();
                const scheduleDateTime = new Date(
                  `${group.date}T${schedule.startTime}`,
                );
                return scheduleDateTime > now;
              });
            })
            .map((group) => ({
              ...group,
              schedules: group.schedules.filter((schedule) => {
                const now = new Date();
                const scheduleDateTime = new Date(
                  `${group.date}T${schedule.startTime}`,
                );
                return scheduleDateTime > now;
              }),
            }))
            .map((group) => (
              <Card key={group.date} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {format(new Date(group.date), "EEEE, MMMM d")}
                    </div>
                    {calculateDayFee(group.date) > 0 && (
                      <div className="text-sm text-destructive">
                        ₹300 fee applies
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {group.schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Label className="flex items-center gap-3">
                            <Checkbox
                              className="rounded-none"
                              checked={selectedLessons.some(
                                (s) => s.id === schedule.id,
                              )}
                              onCheckedChange={() =>
                                schedule.lessonId &&
                                handleLessonSelect(schedule)
                              }
                            />
                            <div>
                              <div className="font-medium">
                                Lesson {schedule.lesson?.number}
                              </div>
                              <div className="text-sm text-muted-foreground">
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
                          </Label>
                        </div>
                      </div>
                    ))}
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
          {getTotalFee() > 0 && (
            <span className="ml-2 text-destructive">
              (Total fee: ₹{getTotalFee()})
            </span>
          )}
        </div>
        <Button onClick={handleSubmit} disabled={selectedLessons.length === 0}>
          Continue
        </Button>
      </div>
    </div>
  );
}
