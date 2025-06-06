import { format, addDays, isSameDay, isSameMonth, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

interface MonthViewProps {
  currentDate: Date;
  instructorData: any;
  googleEvents: any[];
  isGoogleConnected: boolean;
  onScheduleClick: (schedule: any, learner: any) => void;
  onEventClick: (event: any) => void;
  onEmptyCellClick: (date: Date, hour: number) => void;
}

const MonthView = ({
  currentDate,
  instructorData,
  googleEvents,
  isGoogleConnected,
  onScheduleClick,
  onEventClick,
  onEmptyCellClick,
}: MonthViewProps) => {
  
  const generateCalendarDays = () => {
    const startOfMonthDate = startOfMonth(currentDate);
    const endOfMonthDate = endOfMonth(currentDate);
    const startDate = startOfWeek(startOfMonthDate);
    const endDate = endOfWeek(endOfMonthDate);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(new Date(day));
      day = addDays(day, 1);
    }

    return days;
  };

  const CalendarDay = ({ date }: { date: Date }) => {
    const isToday = isSameDay(date, new Date());
    const isCurrentMonth = isSameMonth(date, currentDate);
    
    const daySchedules = instructorData?.instructorSchedule.filter(schedule => 
      isSameDay(new Date(schedule.date), date)
    ) || [];

    const dayGoogleEvents = googleEvents.filter(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date);
      return isSameDay(eventDate, date);
    });

    return (
      <div className={`
        border-r border-b border-gray-200 p-1 min-h-[80px] relative cursor-pointer
        ${!isCurrentMonth ? 'text-gray-400 bg-gray-50' : 'bg-white'}
        ${isToday ? 'bg-blue-50' : ''}
        ${isGoogleConnected && daySchedules.length === 0 && dayGoogleEvents.length === 0 ? 'hover:bg-blue-25' : ''}
      `}
      onClick={() => {
        if (isGoogleConnected && daySchedules.length === 0 && dayGoogleEvents.length === 0) {
          onEmptyCellClick(date, 9); // Default to 9 AM
        }
      }}>
        <div className={`
          text-sm font-medium mb-1
          ${isToday ? 'flex justify-center items-center w-6 h-6 text-xs text-white bg-blue-600 rounded-full' : ''}`}>
          {format(date, 'd')}
        </div>

        <div className="space-y-1">
          {/* Instructor Schedules */}
          {daySchedules.slice(0, 2).map((schedule, idx) => {
            const learnerInfo = instructorData?.learnerLesson.find(
              (ll) => ll.lesson.id === schedule.lesson_id,
            );

            return (
              <div
                key={idx}
                className={`
                  text-xs p-1 rounded truncate cursor-pointer
                  ${schedule.status === 'completed' ? 'bg-green-100 text-green-800' :
                    schedule.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                    'bg-purple-100 text-purple-800'}
                `}
                onClick={(e) => {
                  e.stopPropagation();
                  onScheduleClick(schedule, learnerInfo?.learner);
                }}
              >
                {format(
                  new Date(`${schedule.date}T${schedule.start_time}`),
                  "HH:mm",
                )}{" "}
                {learnerInfo?.learner.name}
              </div>
            );
          })}

          {/* Google Calendar Events */}
          {dayGoogleEvents.slice(0, 2).map((event, idx) => (
            <div
              key={`google-${idx}`}
              className="p-1 text-xs text-orange-800 truncate bg-orange-100 rounded cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onEventClick(event);
              }}
            >
              {format(new Date(event.start?.dateTime || event.start?.date), "HH:mm")} {event.summary}
            </div>
          ))}
          
          {(daySchedules.length + dayGoogleEvents.length) > 2 && (
            <div className="text-xs font-medium text-gray-500">
              +{(daySchedules.length + dayGoogleEvents.length) - 2} more
            </div>
          )}

          {/* Add Event Indicator */}
          {isGoogleConnected && daySchedules.length === 0 && dayGoogleEvents.length === 0 && (
            <div className="text-xs italic text-gray-400">
              Click to add event
            </div>
          )}
        </div>
      </div>
    );
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="p-2 text-xs font-medium text-center text-gray-600"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 auto-rows-fr">
        {calendarDays.map((day, index) => (
          <CalendarDay key={index} date={day} />
        ))}
      </div>
    </div>
  );
};

export default MonthView;
