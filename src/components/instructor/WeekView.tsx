import { addDays, format, isSameDay } from "date-fns";
import { Plus } from "lucide-react";

import { isTimeUnavailable } from "@/utils/time";

interface WeekViewProps {
  currentWeekStart: Date;
  instructorData: any;
  googleEvents: any[];
  isGoogleConnected: boolean;
  onScheduleClick: (schedule: any, learner: any) => void;
  onEventClick: (event: any) => void;
  onEmptyCellClick: (date: Date, hour: number) => void;
}

const WeekView = ({
  currentWeekStart,
  instructorData,
  googleEvents,
  isGoogleConnected,
  onScheduleClick,
  onEventClick,
  onEmptyCellClick,
}: WeekViewProps) => {
  return (
    <div className="flex h-full flex-col">
      <div
        className="scrollbar-none max-h-85 h-[calc(100vh-200px)] overflow-x-auto overflow-y-auto p-4"
        style={{ scrollbarWidth: "none" }}
      >
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-24 border border-gray-200 bg-white p-1 text-xs">
                Time
              </th>
              {Array.from({ length: 7 }).map((_, index) => {
                const day = addDays(currentWeekStart, index);
                const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
                const isToday = isSameDay(day, new Date());

                return (
                  <th
                    key={index}
                    className="min-w-24 border border-gray-200 p-1 text-xs"
                  >
                    <div
                      className={`${isToday ? "font-semibold text-blue-600" : ""}`}
                    >
                      {dayNames[index]}
                    </div>
                    <div
                      className={`text-xs ${isToday ? "mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white" : ""}`}
                    >
                      {format(day, "d")}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 16 }).map((_, timeIndex) => {
              const hour = timeIndex + 6;
              const minute = 0;
              return (
                <tr key={timeIndex} className="h-12">
                  <td className="sticky left-0 z-10 border border-gray-200 bg-white px-2 py-0 text-center">
                    <span className="text-xs">
                      {format(new Date().setHours(hour, minute), "h:mm a")}
                    </span>
                  </td>
                  {Array.from({ length: 7 }).map((_, dayIndex) => {
                    const day = addDays(currentWeekStart, dayIndex);

                    const schedule = instructorData?.instructorSchedule.find(
                      (s) => {
                        const scheduleDate = new Date(s.date);
                        const scheduleStart = new Date(
                          `${s.date}T${s.start_time}`,
                        );
                        const scheduleEnd = new Date(`${s.date}T${s.end_time}`);
                        const currentTime = new Date(day);
                        currentTime.setHours(hour, minute);

                        return (
                          isSameDay(scheduleDate, day) &&
                          currentTime >= scheduleStart &&
                          currentTime < scheduleEnd
                        );
                      },
                    );

                    const googleEvent = googleEvents.find((event) => {
                      const eventStart = new Date(
                        event.start?.dateTime || event.start?.date,
                      );
                      const eventEnd = new Date(
                        event.end?.dateTime || event.end?.date,
                      );
                      const currentTime = new Date(day);
                      currentTime.setHours(hour, minute);

                      return (
                        isSameDay(eventStart, day) &&
                        currentTime >= eventStart &&
                        currentTime < eventEnd
                      );
                    });

                    const isUnavailable = isTimeUnavailable(
                      instructorData?.unavailability,
                      day,
                      hour,
                      minute,
                    );

                    let learnerName = "";
                    let learnerInfo = null;
                    if (schedule) {
                      const learnerLesson = instructorData?.learnerLesson.find(
                        (ll) => ll.lesson.id === schedule.lesson_id,
                      );
                      if (learnerLesson) {
                        learnerName = learnerLesson.learner.name;
                        learnerInfo = learnerLesson.learner;
                      }
                    }

                    const isScheduleStart =
                      schedule &&
                      parseInt(schedule.start_time.split(":")[0]) === hour &&
                      parseInt(schedule.start_time.split(":")[1]) === minute;

                    const isGoogleEventStart =
                      googleEvent &&
                      new Date(googleEvent.start.dateTime).getHours() ===
                        hour &&
                      new Date(googleEvent.start.dateTime).getMinutes() ===
                        minute;

                    const isEmpty = !schedule && !googleEvent && !isUnavailable;

                    return (
                      <td
                        key={dayIndex}
                        className={`h-12 max-h-12 border border-gray-200 px-2 py-0 text-center ${
                          schedule
                            ? schedule.status === "completed"
                              ? "bg-green-200 text-green-800"
                              : schedule.status === "ongoing"
                                ? "bg-blue-200 text-blue-800"
                                : "bg-primary text-white"
                            : googleEvent
                              ? "bg-orange-200 text-orange-800"
                              : isUnavailable
                                ? "bg-gray-400 text-red-800"
                                : isEmpty && isGoogleConnected
                                  ? "cursor-pointer hover:bg-blue-50"
                                  : ""
                        } ${schedule || googleEvent ? "cursor-pointer hover:opacity-80" : ""}`}
                        onClick={() => {
                          if (schedule) {
                            onScheduleClick(schedule, learnerInfo);
                          } else if (googleEvent) {
                            onEventClick(googleEvent);
                          } else if (isEmpty && isGoogleConnected) {
                            onEmptyCellClick(day, hour);
                          }
                        }}
                      >
                        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xs">
                          {isScheduleStart ? (
                            <>
                              <div className="font-semibold">{learnerName}</div>
                              <div>{`${schedule.start_time.substring(0, 5)} - ${schedule.end_time.substring(0, 5)}`}</div>
                            </>
                          ) : isGoogleEventStart ? (
                            <>
                              <div className="font-semibold">
                                {googleEvent.summary}
                              </div>
                              <div>
                                {format(
                                  new Date(googleEvent.start.dateTime),
                                  "HH:mm",
                                )}{" "}
                                -{" "}
                                {format(
                                  new Date(googleEvent.end.dateTime),
                                  "HH:mm",
                                )}
                              </div>
                            </>
                          ) : isEmpty && isGoogleConnected ? (
                            <div className="text-xs text-gray-400">
                              <Plus className="mx-auto h-3 w-3" />
                            </div>
                          ) : isUnavailable && !schedule && !googleEvent ? (
                            ""
                          ) : (
                            ""
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WeekView;
