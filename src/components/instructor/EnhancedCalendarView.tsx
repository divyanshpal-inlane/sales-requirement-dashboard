import { useState, useEffect } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addDays,
  isSameDay,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import MonthView from "./MonthView";
import WeekView from "./WeekView";
import DayView from "./DayView";
import useGoogleCalendar from "@/hooks/useGoogleCalendar";
// import { useRouter } from "next/navigation";
import { useNavigate } from "react-router-dom";

interface EnhancedCalendarViewProps {
  instructorData: any;
  onScheduleClick: (schedule: any, learner: any) => void;
  onEventClick: (event: any) => void;
}

const EnhancedCalendarView = ({
  instructorData,
  onScheduleClick,
  onEventClick,
}: EnhancedCalendarViewProps) => {
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date()),
  );
  const navigate = useNavigate();

  const googleCalendar = useGoogleCalendar();

  // Load events when view changes
  useEffect(() => {
    if (googleCalendar.isGoogleConnected) {
      let startDate: Date;
      let endDate: Date;

      if (viewMode === "month") {
        startDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1,
        );
        endDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0,
        );
      } else if (viewMode === "week") {
        startDate = currentWeekStart;
        endDate = endOfWeek(currentWeekStart);
      } else {
        startDate = new Date(currentDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(currentDate);
        endDate.setHours(23, 59, 59, 999);
      }

      googleCalendar.loadEvents(startDate, endDate);
    }
  }, [
    currentDate,
    viewMode,
    currentWeekStart,
    googleCalendar.isGoogleConnected,
  ]);

  const handleWeekChange = (direction: "prev" | "next") => {
    if (viewMode === "month") {
      setCurrentDate(
        direction === "next"
          ? addMonths(currentDate, 1)
          : subMonths(currentDate, 1),
      );
    } else if (viewMode === "week") {
      const newWeekStart =
        direction === "next"
          ? addDays(currentWeekStart, 7)
          : addDays(currentWeekStart, -7);
      setCurrentWeekStart(newWeekStart);
      setCurrentDate(newWeekStart);
    } else {
      setCurrentDate(
        direction === "next"
          ? addDays(currentDate, 1)
          : addDays(currentDate, -1),
      );
    }
  };

  const handleProfileClick = () => {
    // router.push("/instructor-profile");
    navigate("/instructor-profile");
    console.log("Profile clicked");
  };

  const handleEmptyCellClick = (date: Date, hour: number) => {
    if (!googleCalendar.isGoogleConnected) {
      alert("Please connect to Google Calendar first to create events.");
      return;
    }
    // Handle empty cell click for event creation
    console.log("Empty cell clicked", date, hour);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === "day" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("day")}
              className="text-xs"
            >
              Day
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setViewMode("week");
                setCurrentWeekStart(startOfWeek(currentDate));
              }}
              className="text-xs"
            >
              Week
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("month")}
              className="text-xs"
            >
              Month
            </Button>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                setCurrentDate(today);
                setCurrentWeekStart(startOfWeek(today));
              }}
              className="text-xs"
            >
              Today
            </Button>

            <button
              onClick={handleProfileClick}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-purple shadow-lg transition duration-200 hover:bg-purple-600"
            >
              <User className="text-white" size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleWeekChange("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <h2 className="text-lg font-semibold">
              {viewMode === "month" && format(currentDate, "MMMM yyyy")}
              {viewMode === "week" &&
                `${format(currentWeekStart, "MMM d")} - ${format(endOfWeek(currentWeekStart), "MMM d, yyyy")}`}
              {viewMode === "day" && format(currentDate, "EEEE, MMMM d, yyyy")}
            </h2>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleWeekChange("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Google Calendar Status Indicator */}
          {googleCalendar.isGoogleConnected && (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              Google Calendar Connected ({
                googleCalendar.googleEvents.length
              }{" "}
              events)
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === "month" && (
          <MonthView
            currentDate={currentDate}
            instructorData={instructorData}
            googleEvents={googleCalendar.googleEvents}
            isGoogleConnected={googleCalendar.isGoogleConnected}
            onScheduleClick={onScheduleClick}
            onEventClick={onEventClick}
            onEmptyCellClick={handleEmptyCellClick}
          />
        )}
        {viewMode === "week" && (
          <WeekView
            currentWeekStart={currentWeekStart}
            instructorData={instructorData}
            googleEvents={googleCalendar.googleEvents}
            isGoogleConnected={googleCalendar.isGoogleConnected}
            onScheduleClick={onScheduleClick}
            onEventClick={onEventClick}
            onEmptyCellClick={handleEmptyCellClick}
          />
        )}
        {viewMode === "day" && (
          <DayView
            currentDate={currentDate}
            instructorData={instructorData}
            googleEvents={googleCalendar.googleEvents}
            isGoogleConnected={googleCalendar.isGoogleConnected}
            onScheduleClick={onScheduleClick}
            onEventClick={onEventClick}
            onEmptyCellClick={handleEmptyCellClick}
          />
        )}
      </div>
    </div>
  );
};

export default EnhancedCalendarView;
