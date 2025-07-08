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
  onEmptyCellClick: (date: Date, hour: number) => void;
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
        {Array.from({ length: 16 }).map((_, timeIndex) => {
          const hour = timeIndex + 6;
          const minute = 0;

          const timeSlotSchedules = daySchedules.filter((schedule) => {
            const scheduleStart = new Date(
              `${schedule.date}T${schedule.start_time}`,
            );
            const scheduleEnd = new Date(
              `${schedule.date}T${schedule.end_time}`,
            );
            const currentTime = new Date(currentDate);
            currentTime.setHours(hour, minute);

            return currentTime >= scheduleStart && currentTime < scheduleEnd;
          });

          const timeSlotGoogleEvents = dayGoogleEvents.filter((event) => {
            const eventStart = new Date(event.start.dateTime);
            const eventEnd = new Date(event.end.dateTime);
            const currentTime = new Date(currentDate);
            currentTime.setHours(hour, minute);

            return currentTime >= eventStart && currentTime < eventEnd;
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

          return (
            <div
              key={timeIndex}
              className={`flex min-h-[60px] border-b border-gray-100 ${
                isEmpty && isGoogleConnected
                  ? "cursor-pointer hover:bg-blue-50"
                  : ""
              }`}
              onClick={() => {
                if (isEmpty && isGoogleConnected) {
                  onEmptyCellClick(currentDate, hour);
                }
              }}
            >
              <div className="w-16 border-r bg-gray-50 p-2 text-xs text-gray-600">
                {format(new Date().setHours(hour, 0), "HH:mm")}
              </div>

              <div
                className={`relative flex-1 p-2 ${
                  isUnavailable && timeSlotSchedules.length === 0
                    ? "bg-gray-400"
                    : ""
                }`}
              >
                {timeSlotSchedules.map((schedule, idx) => {
                  const learnerInfo = instructorData?.learnerLesson.find(
                    (ll) => ll.lesson.id === schedule.lesson_id,
                  );

                  const isScheduleStart =
                    parseInt(schedule.start_time.split(":")[0]) === hour &&
                    parseInt(schedule.start_time.split(":")[1]) === minute;

                  if (!isScheduleStart) return null;

                  return (
                    <div
                      key={idx}
                      className={`mb-1 cursor-pointer rounded p-2 text-sm ${
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
                  const isEventStart =
                    new Date(event.start.dateTime).getHours() === hour &&
                    new Date(event.start.dateTime).getMinutes() === minute;

                  if (!isEventStart) return null;

                  return (
                    <div
                      key={`google-${idx}`}
                      className="mb-1 cursor-pointer rounded bg-orange-200 p-2 text-sm text-orange-800"
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

                {/* Empty slot indicator */}
                {isEmpty && isGoogleConnected && (
                  <div className="flex h-full items-center justify-center text-gray-400">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="text-sm">Click to add event</span>
                    </div>
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
