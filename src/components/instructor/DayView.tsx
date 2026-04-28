import { format, isSameDay } from "date-fns";
import { Plus } from "lucide-react";

import { isTimeUnavailable } from "@/utils/time";

interface DayViewProps {
  currentDate: Date;
  instructorData: any;
  googleEvents: any[];
  isGoogleConnected: boolean;
  onScheduleClick: (schedule: any, learner: any) => void;
  onEventClick: (event: any) => void;
  onEmptyCellClick: (date: Date, hour: number, minute: number) => void;
}

const DayView = ({
  currentDate,
  instructorData,
  googleEvents,
  isGoogleConnected,
  onScheduleClick,
  onEventClick,
  onEmptyCellClick,
}: DayViewProps) => {
  const daySchedules =
    instructorData?.instructorSchedule.filter((schedule) =>
      isSameDay(new Date(schedule.date), currentDate),
    ) || [];

  const dayGoogleEvents = googleEvents.filter((event) => {
    const eventDate = new Date(event.start?.dateTime || event.start?.date);
    return isSameDay(eventDate, currentDate);
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {/* 32 slots = 16 hours × 2 (30-min each), from 6 AM to 10 PM */}
        {Array.from({ length: 32 }).map((_, timeIndex) => {
          const hour = Math.floor(timeIndex / 2) + 6;
          const minute = (timeIndex % 2) * 30;

          const timeSlotSchedules = daySchedules.filter((schedule) => {
            const scheduleStart = new Date(
              `${schedule.date}T${schedule.start_time}`,
            );
            const scheduleEnd = new Date(
              `${schedule.date}T${schedule.end_time}`,
            );
            const currentTime = new Date(currentDate);
            currentTime.setHours(hour, minute, 0, 0);
            const nextSlotTime = new Date(currentDate);
            nextSlotTime.setHours(hour, minute + 30, 0, 0);

            // Check if this slot overlaps with the schedule
            return currentTime < scheduleEnd && nextSlotTime > scheduleStart;
          });

          const timeSlotGoogleEvents = dayGoogleEvents.filter((event) => {
            if (!event.start?.dateTime) return false;
            const eventStart = new Date(event.start.dateTime);
            const eventEnd = new Date(event.end.dateTime);
            const currentTime = new Date(currentDate);
            currentTime.setHours(hour, minute, 0, 0);
            const nextSlotTime = new Date(currentDate);
            nextSlotTime.setHours(hour, minute + 30, 0, 0);

            return currentTime < eventEnd && nextSlotTime > eventStart;
          });

          const isUnavailable = isTimeUnavailable(
            instructorData?.unavailability,
            currentDate,
            hour,
            minute,
          );

          const isEmpty =
            timeSlotSchedules.length === 0 &&
            timeSlotGoogleEvents.length === 0 &&
            !isUnavailable;

          // Show hour label only on the hour (minute === 0)
          const showHourLabel = minute === 0;

          return (
            <div
              key={timeIndex}
              className={`flex min-h-[40px] border-b ${minute === 0 ? "border-gray-200" : "border-gray-100"} ${
                isEmpty && isGoogleConnected
                  ? "cursor-pointer hover:bg-blue-50"
                  : ""
              }`}
              onClick={() => {
                if (isEmpty && isGoogleConnected) {
                  onEmptyCellClick(currentDate, hour, minute);
                }
              }}
            >
              <div
                className={`w-16 border-r bg-gray-50 p-1 text-xs text-gray-600 ${!showHourLabel ? "text-gray-400" : ""}`}
              >
                {format(new Date().setHours(hour, minute), "HH:mm")}
              </div>

              <div
                className={`relative flex-1 p-1 ${
                  isUnavailable && timeSlotSchedules.length === 0
                    ? "bg-gray-400"
                    : ""
                }`}
              >
                {timeSlotSchedules.map((schedule, idx) => {
                  const learnerInfo = instructorData?.learnerLesson.find(
                    (ll) => ll.lesson.id === schedule.lesson_id,
                  );

                  const scheduleStartHour = parseInt(
                    schedule.start_time.split(":")[0],
                  );
                  const scheduleStartMinute = parseInt(
                    schedule.start_time.split(":")[1],
                  );
                  const isScheduleStart =
                    scheduleStartHour === hour &&
                    scheduleStartMinute >= minute &&
                    scheduleStartMinute < minute + 30;

                  if (!isScheduleStart) return null;

                  return (
                    <div
                      key={idx}
                      className={`mb-1 cursor-pointer rounded p-1.5 text-sm ${
                        schedule.status === "completed"
                          ? "bg-green-200 text-green-800"
                          : schedule.status === "ongoing"
                            ? "bg-blue-200 text-blue-800"
                            : "bg-primary text-white"
                      } `}
                      onClick={(e) => {
                        e.stopPropagation();
                        onScheduleClick(schedule, learnerInfo?.learner);
                      }}
                    >
                      <div className="font-medium">
                        {learnerInfo?.learner.name}
                      </div>
                      <div className="text-xs">
                        {schedule.start_time.substring(0, 5)} -{" "}
                        {schedule.end_time.substring(0, 5)}
                      </div>
                      <div className="text-xs capitalize">
                        Status: {schedule.status}
                      </div>
                    </div>
                  );
                })}

                {/* Google Calendar Events */}
                {timeSlotGoogleEvents.map((event, idx) => {
                  if (!event.start?.dateTime) return null;
                  const eventStartHour = new Date(
                    event.start.dateTime,
                  ).getHours();
                  const eventStartMinute = new Date(
                    event.start.dateTime,
                  ).getMinutes();
                  const isEventStart =
                    eventStartHour === hour &&
                    eventStartMinute >= minute &&
                    eventStartMinute < minute + 30;

                  if (!isEventStart) return null;

                  return (
                    <div
                      key={`google-${idx}`}
                      className="mb-1 cursor-pointer rounded bg-orange-200 p-1.5 text-sm text-orange-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    >
                      <div className="font-medium">{event.summary}</div>
                      <div className="text-xs">
                        {format(new Date(event.start.dateTime), "HH:mm")} -{" "}
                        {format(new Date(event.end.dateTime), "HH:mm")}
                      </div>
                      <div className="text-xs">Google Calendar</div>
                    </div>
                  );
                })}

                {/* Empty slot indicator - only show on hover via CSS */}
                {isEmpty && isGoogleConnected && (
                  <div className="flex h-full items-center justify-center text-gray-300 opacity-0 transition-opacity hover:opacity-100">
                    <Plus className="h-3 w-3" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DayView;
