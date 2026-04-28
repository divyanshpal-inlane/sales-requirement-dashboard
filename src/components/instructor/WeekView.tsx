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
  onEmptyCellClick: (date: Date, hour: number, minute: number) => void;
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
            {/* 32 slots = 16 hours × 2 (30-min each), from 6 AM to 10 PM */}
            {Array.from({ length: 32 }).map((_, timeIndex) => {
              const hour = Math.floor(timeIndex / 2) + 6;
              const minute = (timeIndex % 2) * 30;
              const showHourLabel = minute === 0;

              return (
                <tr
                  key={timeIndex}
                  className={`h-8 ${minute === 0 ? "border-t border-gray-300" : ""}`}
                >
                  <td
                    className={`sticky left-0 z-10 border border-gray-200 bg-white px-1 py-0 text-center ${!showHourLabel ? "text-gray-400" : ""}`}
                  >
                    <span className="text-[10px]">
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
                        currentTime.setHours(hour, minute, 0, 0);
                        const nextSlotTime = new Date(day);
                        nextSlotTime.setHours(hour, minute + 30, 0, 0);

                        return (
                          isSameDay(scheduleDate, day) &&
                          currentTime < scheduleEnd &&
                          nextSlotTime > scheduleStart
                        );
                      },
                    );

                    const googleEvent = googleEvents.find((event) => {
                      if (!event.start?.dateTime) return false;
                      const eventStart = new Date(event.start.dateTime);
                      const eventEnd = new Date(event.end.dateTime);
                      const currentTime = new Date(day);
                      currentTime.setHours(hour, minute, 0, 0);
                      const nextSlotTime = new Date(day);
                      nextSlotTime.setHours(hour, minute + 30, 0, 0);

                      return (
                        isSameDay(eventStart, day) &&
                        currentTime < eventEnd &&
                        nextSlotTime > eventStart
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

                    const scheduleStartHour = schedule
                      ? parseInt(schedule.start_time.split(":")[0])
                      : 0;
                    const scheduleStartMinute = schedule
                      ? parseInt(schedule.start_time.split(":")[1])
                      : 0;
                    const isScheduleStart =
                      schedule &&
                      scheduleStartHour === hour &&
                      scheduleStartMinute >= minute &&
                      scheduleStartMinute < minute + 30;

                    const isGoogleEventStart =
                      googleEvent &&
                      googleEvent.start?.dateTime &&
                      new Date(googleEvent.start.dateTime).getHours() ===
                        hour &&
                      new Date(googleEvent.start.dateTime).getMinutes() >=
                        minute &&
                      new Date(googleEvent.start.dateTime).getMinutes() <
                        minute + 30;

                    const isEmpty = !schedule && !googleEvent && !isUnavailable;

                    return (
                      <td
                        key={dayIndex}
                        className={`h-8 max-h-8 border border-gray-200 px-1 py-0 text-center ${
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
                            onEmptyCellClick(day, hour, minute);
                          }
                        }}
                      >
                        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px]">
                          {isScheduleStart ? (
                            <>
                              <div className="truncate font-semibold">
                                {learnerName}
                              </div>
                              <div>{`${schedule.start_time.substring(0, 5)}-${schedule.end_time.substring(0, 5)}`}</div>
                            </>
                          ) : isGoogleEventStart ? (
                            <>
                              <div className="truncate font-semibold">
                                {googleEvent.summary}
                              </div>
                              <div>
                                {format(
                                  new Date(googleEvent.start.dateTime),
                                  "HH:mm",
                                )}
                                -
                                {format(
                                  new Date(googleEvent.end.dateTime),
                                  "HH:mm",
                                )}
                              </div>
                            </>
                          ) : isEmpty && isGoogleConnected ? (
                            <div className="text-gray-300 opacity-0 hover:opacity-100">
                              <Plus className="mx-auto h-2 w-2" />
                            </div>
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
