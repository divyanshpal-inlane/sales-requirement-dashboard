import "react-big-calendar/lib/css/react-big-calendar.css";

import {
  GoogleOAuthProvider,
} from "@react-oauth/google";
import { useQueryClient } from "@tanstack/react-query";
import {
  addDays,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  parse,
  startOfWeek,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from "date-fns";
import enUS from "date-fns/locale/en-US";
import {
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  ExternalLinkIcon,
  PhoneOutgoing,
  User,
  Calendar,
  Clock,
  BookOpen,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { useNavigate } from "react-router-dom";

import { LessonPlan } from "@/components/lesson/plan";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LESSON_CONTENT } from "@/constants/Lesson";
import { supabase, useUser } from "@/context/auth-context";
import { useInstructor, useUpdateScheduleStatus } from "@/queries/instructor";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

function Instructor() {
  const { phone } = useUser();
  const {
    data: instructorData,
    isLoading: instructorLoading,
    error: instructorError,
  } = useInstructor(phone ?? "");
  const updateScheduleStatus = useUpdateScheduleStatus();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date()),
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week');
  
  const [lessonPlanDialog, setLessonPlanDialog] = useState({
    open: false,
    lesson: null,
    learner: null,
  });

  const [scheduleDetailDialog, setScheduleDetailDialog] = useState({
    open: false,
    schedule: null,
    learner: null,
  });

  function isTimeUnavailable(
    unavailability: any[] | null | undefined,
    day: Date,
    hour: number,
    minute: number,
  ): boolean {
    if (
      !unavailability ||
      !Array.isArray(unavailability) ||
      unavailability.length === 0
    ) {
      return false;
    }

    const currentTime = new Date(day);
    currentTime.setHours(hour, minute);
    const dayOfWeek = format(day, "EEEE").toLowerCase();
    const formattedDate = format(day, "yyyy-MM-dd");

    return unavailability.some((u) => {
      if (u.booked_date && u.all_day) {
        return formattedDate === u.booked_date;
      }

      if (
        u.booked_date &&
        u.booked_start_time &&
        u.booked_end_time &&
        !u.all_day
      ) {
        const unavailableStart = new Date(
          `${u.booked_date}T${u.booked_start_time}`,
        );
        const unavailableEnd = new Date(
          `${u.booked_date}T${u.booked_end_time}`,
        );
        return (
          formattedDate === u.booked_date &&
          currentTime >= unavailableStart &&
          currentTime < unavailableEnd
        );
      }

      if (u.day_of_week && u.all_day) {
        return u.day_of_week === dayOfWeek;
      }

      if (
        u.day_of_week &&
        u.booked_start_time &&
        u.booked_end_time &&
        !u.all_day
      ) {
        if (u.day_of_week === dayOfWeek) {
          const [startHour, startMinute] = u.booked_start_time
            .split(":")
            .map(Number);
          const [endHour, endMinute] = u.booked_end_time.split(":").map(Number);

          const unavailableStart = new Date(day);
          unavailableStart.setHours(startHour, startMinute);

          const unavailableEnd = new Date(day);
          unavailableEnd.setHours(endHour, endMinute);

          return (
            currentTime >= unavailableStart && currentTime < unavailableEnd
          );
        }
      }

      if (u.start_date && u.end_date && u.range_all_day) {
        const rangeStart = new Date(u.start_date);
        const rangeEnd = new Date(u.end_date);
        rangeEnd.setHours(23, 59, 59);
        return currentTime >= rangeStart && currentTime <= rangeEnd;
      }

      if (
        u.start_date &&
        u.end_date &&
        !u.range_all_day &&
        u.range_start_time &&
        u.range_end_time
      ) {
        const rangeStart = new Date(u.start_date);
        const rangeEnd = new Date(u.end_date);
        rangeEnd.setHours(23, 59, 59);

        if (currentTime >= rangeStart && currentTime <= rangeEnd) {
          const [startHour, startMinute] = u.range_start_time
            .split(":")
            .map(Number);
          const [endHour, endMinute] = u.range_end_time.split(":").map(Number);

          const todayStart = new Date(day);
          todayStart.setHours(startHour, startMinute);

          const todayEnd = new Date(day);
          todayEnd.setHours(endHour, endMinute);

          return currentTime >= todayStart && currentTime < todayEnd;
        }
      }

      if (
        u.start_date &&
        u.end_date &&
        !u.range_all_day &&
        !u.range_start_time
      ) {
        const rangeStart = new Date(u.start_date);
        const rangeEnd = new Date(u.end_date);
        rangeEnd.setHours(23, 59, 59);
        return currentTime >= rangeStart && currentTime <= rangeEnd;
      }

      return false;
    });
  }

  const handleOpenLessonPlan = (lesson, learner) => {
    setLessonPlanDialog({
      open: true,
      lesson,
      learner,
    });
  };

  const handleScheduleClick = (schedule: any, learner: any) => {
    setScheduleDetailDialog({
      open: true,
      schedule,
      learner,
    });
  };

  const handleFinishLesson = async (scheduleId: string, learnerId: string) => {
    try {
      await updateScheduleStatus.mutateAsync({
        scheduleId,
        status: "completed",
      });

      const { data: learnerSchedules, error: schedulesError } = await supabase
        .from("Schedule")
        .select("id, status")
        .eq("learner_id", learnerId);

      if (schedulesError) {
        console.error("Error fetching learner schedules:", schedulesError);
        return;
      }

      const totalLessons = learnerSchedules.length;
      const completedLessons = learnerSchedules.filter(
        (schedule) => schedule.status === "completed",
      ).length;

      if (totalLessons > 0 && completedLessons === totalLessons) {
        const { data, error } = await supabase.functions.invoke(
          "send-message",
          {
            body: {
              message_type: "WEBAPP_LESSONS_DONE_REVIEW_PLEASE",
              learner_id: learnerId,
            },
          },
        );

        if (error) {
          console.error("Error sending review request message:", error);
          return;
        }
      }

      queryClient.invalidateQueries(["instructorSchedule"]);
    } catch (error) {
      console.error("Failed to update lesson status:", error);
    }
  };

  function formatTimeRange(start_time: string, end_time: string): string {
    const formatTime = (time: string): string => {
      const [hours, minutes] = time.split(":");
      let period = "AM";
      let hourNum = parseInt(hours, 10);

      if (hourNum >= 12) {
        period = "PM";
        if (hourNum > 12) {
          hourNum -= 12;
        }
      }

      if (hourNum === 0) {
        hourNum = 12;
      }

      return `${hourNum}:${minutes} ${period}`;
    };

    const formattedStartTime = formatTime(start_time);
    const formattedEndTime = formatTime(end_time);

    return `${formattedStartTime} to ${formattedEndTime}`;
  }

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const formatEventTime = (date) => {
    return format(date, "h:mm a");
  };

  const formatEventDate = (date) => {
    return format(date, "EEEE, MMMM d, yyyy");
  };

  const handleWeekChange = (direction: "prev" | "next") => {
    if (viewMode === 'month') {
      setCurrentDate(direction === "next" ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      const newWeekStart = direction === "next" ? addDays(currentWeekStart, 7) : addDays(currentWeekStart, -7);
      setCurrentWeekStart(newWeekStart);
      setCurrentDate(newWeekStart);
    } else {
      setCurrentDate(direction === "next" ? addDays(currentDate, 1) : addDays(currentDate, -1));
    }
  };

  const handleProfileClick = () => {
    navigate('/instructor-profile');
  };

  // Enhanced Calendar Components
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

    return (
      <div className={`
        border-r border-b border-gray-200 p-1 min-h-[80px] relative
        ${!isCurrentMonth ? 'text-gray-400 bg-gray-50' : 'bg-white'}
        ${isToday ? 'bg-blue-50' : ''}`}>
        <div className={`
          text-sm font-medium mb-1
          ${isToday ? 'flex justify-center items-center w-6 h-6 text-xs text-white bg-blue-600 rounded-full' : ''}`}>
          {format(date, 'd')}
        </div>

        <div className="space-y-1">
          {daySchedules.slice(0, 2).map((schedule, idx) => {
            const learnerInfo = instructorData?.learnerLesson.find(
              ll => ll.lesson.id === schedule.lesson_id
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
                onClick={() => handleScheduleClick(schedule, learnerInfo?.learner)}
              >
                {format(new Date(`${schedule.date}T${schedule.start_time}`), 'HH:mm')} {learnerInfo?.learner.name}
              </div>
            );
          })}
          
          {daySchedules.length > 2 && (
            <div className="text-xs font-medium text-gray-500">
              +{daySchedules.length - 2} more
            </div>
          )}
        </div>
      </div>
    );
  };

  const MonthView = () => {
    const calendarDays = generateCalendarDays();
    
    return (
      <div className="flex flex-col h-full">
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-xs font-medium text-center text-gray-600">
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

  const WeekView = () => {
    return (
      <div className="flex flex-col h-full">
        <div
          className="scrollbar-none max-h-85 h-[calc(100vh-200px)] overflow-x-auto overflow-y-auto p-4"
          style={{ scrollbarWidth: "none" }}
        >
          <table className="w-full border border-gray-200 border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 p-1 text-xs bg-white border border-gray-200 min-w-24">
                  Time
                </th>
                {Array.from({ length: 7 }).map((_, index) => {
                  const day = addDays(currentWeekStart, index);
                  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <th
                      key={index}
                      className="p-1 text-xs border border-gray-200 min-w-24"
                    >
                      <div className={`${isToday ? 'font-semibold text-blue-600' : ''}`}>
                        {dayNames[index]}
                      </div>
                      <div className={`text-xs ${isToday ? 'flex justify-center items-center mx-auto w-6 h-6 text-white bg-blue-600 rounded-full' : ''}`}>
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
                    <td className="sticky left-0 z-10 px-2 py-0 text-center bg-white border border-gray-200">
                      <span className="text-xs">
                        {format(
                          new Date().setHours(hour, minute),
                          "h:mm a",
                        )}
                      </span>
                    </td>
                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                      const day = addDays(currentWeekStart, dayIndex);

                      const schedule = instructorData?.instructorSchedule.find((s) => {
                        const scheduleDate = new Date(s.date);
                        const scheduleStart = new Date(
                          `${s.date}T${s.start_time}`,
                        );
                        const scheduleEnd = new Date(
                          `${s.date}T${s.end_time}`,
                        );
                        const currentTime = new Date(day);
                        currentTime.setHours(hour, minute);

                        return (
                          isSameDay(scheduleDate, day) &&
                          currentTime >= scheduleStart &&
                          currentTime < scheduleEnd
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
                              : isUnavailable
                                ? "bg-gray-400 text-red-800"
                                : ""
                          } ${schedule ? "cursor-pointer hover:opacity-80" : ""}`}
                          onClick={() =>
                            schedule &&
                            handleScheduleClick(schedule, learnerInfo)
                          }
                        >
                          <div className="overflow-hidden text-xs whitespace-nowrap text-ellipsis">
                            {isScheduleStart ? (
                              <>
                                <div className="font-semibold">
                                  {learnerName}
                                </div>
                                <div>{`${schedule.start_time.substring(0, 5)} - ${schedule.end_time.substring(0, 5)}`}</div>
                              </>
                            ) : isUnavailable && !schedule ? (
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

  const DayView = () => {
    const daySchedules = instructorData?.instructorSchedule.filter(schedule => 
      isSameDay(new Date(schedule.date), currentDate)
    ) || [];

    return (
      <div className="flex flex-col h-full">
        <div className="overflow-y-auto flex-1">
          {Array.from({ length: 16 }).map((_, timeIndex) => {
            const hour = timeIndex + 6;
            const minute = 0;

            const timeSlotSchedules = daySchedules.filter(schedule => {
              const scheduleStart = new Date(`${schedule.date}T${schedule.start_time}`);
              const scheduleEnd = new Date(`${schedule.date}T${schedule.end_time}`);
              const currentTime = new Date(currentDate);
              currentTime.setHours(hour, minute);

              return currentTime >= scheduleStart && currentTime < scheduleEnd;
            });

            const isUnavailable = isTimeUnavailable(
              instructorData?.unavailability,
              currentDate,
              hour,
              minute,
            );

            return (
              <div key={timeIndex} className="flex border-b border-gray-100 min-h-[60px]">
                <div className="p-2 w-16 text-xs text-gray-600 bg-gray-50 border-r">
                  {format(new Date().setHours(hour, 0), 'HH:mm')}
                </div>
                
                <div className={`flex-1 p-2 relative ${
                  isUnavailable && timeSlotSchedules.length === 0 ? 'bg-gray-400' : ''
                }`}>
                  {timeSlotSchedules.map((schedule, idx) => {
                    const learnerInfo = instructorData?.learnerLesson.find(
                      ll => ll.lesson.id === schedule.lesson_id
                    );

                    const isScheduleStart = 
                      parseInt(schedule.start_time.split(":")[0]) === hour &&
                      parseInt(schedule.start_time.split(":")[1]) === minute;
                    
                    if (!isScheduleStart) return null;
                    
                    return (
                      <div
                        key={idx}
                        className={`
                          p-2 rounded mb-1 cursor-pointer text-sm
                          ${schedule.status === 'completed' ? 'bg-green-200 text-green-800' :
                            schedule.status === 'ongoing' ? 'bg-blue-200 text-blue-800' :
                            'bg-primary text-white'}
                        `}
                        onClick={() => handleScheduleClick(schedule, learnerInfo?.learner)}
                      >
                        <div className="font-medium">{learnerInfo?.learner.name}</div>
                        <div className="text-xs">
                          {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                        </div>
                        <div className="text-xs capitalize">
                          Status: {schedule.status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const EnhancedCalendarView = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex justify-between items-center p-4">
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('day')}
                className="text-xs"
              >
                Day
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode('week');
                  setCurrentWeekStart(startOfWeek(currentDate));
                }}
                className="text-xs"
              >
                Week
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('month')}
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
                className="flex justify-center items-center w-10 h-10 rounded-full shadow-lg transition duration-200 bg-accent-purple hover:bg-purple-600"
              >
                <User className="text-white" size={20} />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center px-4 pb-4">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleWeekChange("prev")}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <h2 className="text-lg font-semibold">
                {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
                {viewMode === 'week' && `${format(currentWeekStart, 'MMM d')} - ${format(endOfWeek(currentWeekStart), 'MMM d, yyyy')}`}
                {viewMode === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
              </h2>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleWeekChange("next")}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden flex-1">
          {viewMode === 'month' && <MonthView />}
          {viewMode === 'week' && <WeekView />}
          {viewMode === 'day' && <DayView />}
        </div>
      </div>
    );
  };

  if (instructorLoading) return <div>Loading...</div>;
  if (instructorError)
    return <div>An error occurred: {instructorError.message}</div>;

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <div className="flex flex-col w-full h-full">
        <Tabs defaultValue="calendar" className="flex flex-col w-full h-full">
          <div className="overflow-hidden flex-1 p-6 pb-2">
            <TabsContent
              value="calendar"
              className="overflow-y-auto m-0 h-full"
            >
              <EnhancedCalendarView />
            </TabsContent>

            <TabsContent
              value="schedule"
              className="overflow-y-auto m-0 h-full"
            >
              <div className="flex flex-col gap-2 pb-4">
                {instructorData?.instructorScheduleDay.map((schedule, index) => {
                  const learnerLessonPair = instructorData?.learnerLessonDay.find(
                    (ll) => ll.lesson.id === schedule.lesson_id,
                  );

                  if (!learnerLessonPair) {
                    return null;
                  }

                  const { learner, lesson } = learnerLessonPair;
                  const isOngoing = schedule.status === "ongoing";

                  return (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="flex flex-wrap gap-4 justify-between items-center">
                          <div>Lesson {lesson?.number}</div>
                          <div className="text-xs">
                            <div className="text-base text-right">
                              {new Date(schedule.date).toLocaleDateString()}
                            </div>
                            {formatTimeRange(
                              schedule.start_time,
                              schedule.end_time,
                            )}
                          </div>
                        </CardTitle>
                        <CardDescription>
                          {lesson?.number &&
                            LESSON_CONTENT[lesson.number]?.content.title}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="flex flex-row gap-1 items-center">
                            <p className="text-nowrap text-muted-foreground">
                              Pick-up Location :
                            </p>
                            <a
                              href={`https://www.google.com/maps?q=${learner.address_lat},${learner.address_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex gap-1 items-center text-xs underline truncate hover:text-blue-800"
                            >
                              <span className="truncate">
                                {learner.pick_up_location}
                              </span>
                              <ExternalLinkIcon className="w-4 h-4 shrink-0" />
                            </a>
                          </div>
                          <div className="flex flex-row gap-1">
                            <p className="text-muted-foreground">Learner name :</p>
                            <p>{learner.name}</p>
                          </div>
                          <div className="flex flex-row gap-1 items-center">
                            <p className="text-muted-foreground">
                              Contact Learner :{" "}
                            </p>
                            <p>{learner.phone}</p>
                            <div className="ml-1">
                              <a href={`tel:+91${learner.phone}`}>
                                <PhoneOutgoing size={14} />
                              </a>
                            </div>
                          </div>

                          <Button
                            onClick={() => handleOpenLessonPlan(lesson, learner)}
                            size="sm"
                            variant="outline"
                            className="mt-2 w-full text-xs"
                          >
                            View Lesson Plan
                          </Button>
                        </div>
                        <Card className="flex flex-row gap-4 justify-between items-center p-2 shadow-md rounded-smb">
                          <div className="flex flex-wrap gap-2 justify-between items-center p-1 w-full text-xs">
                            <p>Lesson status : {schedule.status?.toUpperCase()}</p>
                            <div className="flex flex-row gap-24 items-center">
                              {isOngoing ? (
                                <div className="flex relative justify-center items-center">
                                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                  <div className="absolute w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                                </div>
                              ) : null}
                              {schedule.status === "completed" ? (
                                <div className="flex justify-center items-center">
                                  <CircleCheckBig
                                    className="text-white bg-green-500 rounded-full"
                                    size={18}
                                  />
                                </div>
                              ) : null}
                            </div>
                            {isOngoing && (
                              <Button
                                onClick={() =>
                                  handleFinishLesson(
                                    schedule.id.toString(),
                                    learner.id,
                                  )
                                }
                                size="sm"
                                variant="secondary"
                                className="text-xs"
                              >
                                Finish Lesson
                              </Button>
                            )}
                            {schedule.status !== "ongoing" &&
                              schedule.status !== "completed" && (
                                <Button
                                  onClick={() => {
                                    navigate(`/otp/${learner.id}/${schedule.id}`);
                                  }}
                                  size="sm"
                                  className="text-xs"
                                >
                                  Start
                                </Button>
                              )}
                          </div>
                        </Card>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent
              value="lesson"
              className="overflow-y-auto m-0 h-full"
            >
              <div className="flex flex-col gap-2 pb-4">
                {instructorData?.learnerLesson
                  .sort((a, b) => {
                    const lessonNumberA = a.lesson?.number || 0;
                    const lessonNumberB = b.lesson?.number || 0;

                    if (lessonNumberA !== lessonNumberB) {
                      return lessonNumberA - lessonNumberB;
                    }

                    const dateA = new Date(
                      instructorData.instructorSchedule.find(
                        (s) => s.lesson_id === a.lesson?.id,
                      )?.date || 0,
                    );
                    const dateB = new Date(
                      instructorData.instructorSchedule.find(
                        (s) => s.lesson_id === b.lesson?.id,
                      )?.date || 0,
                    );

                    return dateA.getTime() - dateB.getTime();
                  })
                  .map(({ learner, lesson }, index) => {
                    const lessonSchedule = instructorData.instructorSchedule.find(
                      (s) => s.lesson_id === lesson?.id,
                    );

                    return (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="flex flex-wrap gap-4 justify-between items-center">
                            <div>Lesson {lesson?.number}</div>
                            <div className="text-xs">
                              <div className="text-base text-right">
                                {lessonSchedule
                                  ? new Date(
                                      lessonSchedule.date,
                                    ).toLocaleDateString()
                                  : "No date"}
                              </div>
                              {lessonSchedule
                                ? formatTimeRange(
                                    lessonSchedule.start_time,
                                    lessonSchedule.end_time,
                                  )
                                : "No time scheduled"}
                            </div>
                          </CardTitle>
                          <CardDescription>
                            {lesson?.number &&
                              LESSON_CONTENT[lesson.number]?.content.title}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex flex-row gap-1 items-center">
                              <p className="text-nowrap text-muted-foreground">
                                Pick-up Location :
                              </p>
                              <a
                                href={`https://www.google.com/maps?q=${learner.address_lat},${learner.address_lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex gap-1 items-center text-xs underline truncate hover:text-blue-800"
                              >
                                <span className="truncate">
                                  {learner.pick_up_location}
                                </span>
                                <ExternalLinkIcon className="w-4 h-4 shrink-0" />
                              </a>
                            </div>
                            <div className="flex flex-row gap-1">
                              <p className="text-muted-foreground">
                                Learner name :
                              </p>
                              <p>{learner.name}</p>
                            </div>
                            <div className="flex flex-row gap-1 items-center">
                              <p className="text-muted-foreground">
                                Contact Learner :{" "}
                              </p>
                              <p>{learner.phone}</p>
                              <div className="ml-1">
                                <a href={`tel:+91${learner.phone}`}>
                                  <PhoneOutgoing size={14} />
                                </a>
                              </div>
                            </div>

                            {lessonSchedule && lessonSchedule.status && (
                              <div className="flex gap-2 items-center mt-2">
                                <p className="text-muted-foreground">Status:</p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs ${
                                    lessonSchedule.status === "completed"
                                      ? "bg-green-100 text-green-800"
                                      : lessonSchedule.status === "ongoing"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {lessonSchedule.status.toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </TabsContent>
          </div>

          <div className="sticky bottom-0 z-30 bg-white border-t border-gray-200 shadow-lg">
            <TabsList className="grid grid-cols-3 p-0 w-full h-16 bg-transparent rounded-none">
              <TabsTrigger 
                value="calendar" 
                className="flex flex-col items-center justify-center h-full space-y-1 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 rounded-none border-0"
              >
                <Calendar className="w-5 h-5" />
                <span className="text-xs font-medium">Calendar</span>
              </TabsTrigger>
              <TabsTrigger 
                value="schedule" 
                className="flex flex-col items-center justify-center h-full space-y-1 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 rounded-none border-0"
              >
                <Clock className="w-5 h-5" />
                <span className="text-xs font-medium">Today ({instructorData?.instructorScheduleDay.length || 0})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="lesson" 
                className="flex flex-col items-center justify-center h-full space-y-1 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 rounded-none border-0"
              >
                <BookOpen className="w-5 h-5" />
                <span className="text-xs font-medium">All Classes</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      <Dialog 
        open={scheduleDetailDialog.open} 
        onOpenChange={(open) => setScheduleDetailDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Details</DialogTitle>
            <DialogDescription>
              {scheduleDetailDialog.learner?.name} - Lesson {
                instructorData?.learnerLesson.find(
                  ll => ll.lesson.id === scheduleDetailDialog.schedule?.lesson_id
                )?.lesson.number
              }
            </DialogDescription>
          </DialogHeader>
          {scheduleDetailDialog.schedule && (
            <div className="flex flex-col gap-4 py-2">
              <div>
                <h4 className="mb-1 text-sm font-medium">Date & Time</h4>
                <p className="text-sm text-gray-700">
                  {new Date(scheduleDetailDialog.schedule.date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-700">
                  {formatTimeRange(
                    scheduleDetailDialog.schedule.start_time,
                    scheduleDetailDialog.schedule.end_time
                  )}
                </p>
              </div>
              
              <div>
                <h4 className="mb-1 text-sm font-medium">Status</h4>
                <span className={`
                  rounded-full px-2 py-1 text-xs
                  ${scheduleDetailDialog.schedule.status === 'completed' ? 'bg-green-100 text-green-800' :
                    scheduleDetailDialog.schedule.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'}
                `}>
                  {scheduleDetailDialog.schedule.status?.toUpperCase()}
                </span>
              </div>

              {scheduleDetailDialog.learner && (
                <div>
                  <h4 className="mb-1 text-sm font-medium">Learner Details</h4>
                  <p className="text-sm text-gray-700">
                    Name: {scheduleDetailDialog.learner.name}
                  </p>
                  <p className="text-sm text-gray-700">
                    Phone: {scheduleDetailDialog.learner.phone}
                  </p>
                  <p className="text-sm text-gray-700">
                    Pickup: {scheduleDetailDialog.learner.pick_up_location}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScheduleDetailDialog(prev => ({ ...prev, open: false }))}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedEvent?.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {selectedEvent && (
                <div className="flex flex-col gap-1 mt-2">
                  <p className="font-medium">
                    {formatEventDate(selectedEvent.start)}
                  </p>
                  <p>
                    {formatEventTime(selectedEvent.start)} -{" "}
                    {formatEventTime(selectedEvent.end)}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="flex flex-col gap-4 py-2">
              {selectedEvent.description && (
                <div>
                  <h4 className="mb-1 text-sm font-medium">Description</h4>
                  <p className="text-sm text-gray-700">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {selectedEvent.location && (
                <div>
                  <h4 className="mb-1 text-sm font-medium">Location</h4>
                  <p className="text-sm text-gray-700">
                    {selectedEvent.location}
                  </p>
                </div>
              )}

              {selectedEvent.attendees &&
                selectedEvent.attendees.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-sm font-medium">Attendees</h4>
                    <ul className="text-sm text-gray-700">
                      {selectedEvent.attendees.map((attendee, index) => (
                        <li key={index}>{attendee.email}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}
          <DialogFooter>
            {selectedEvent?.htmlLink && (
              <a
                href={selectedEvent.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                View in Google Calendar
              </a>
            )}
            <Button
              variant="outline"
              onClick={() => setIsEventModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={lessonPlanDialog.open}
        onOpenChange={(open) =>
          setLessonPlanDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="h-[90vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle>Lesson Plan</DialogTitle>
            <DialogDescription>
              Lesson details for {lessonPlanDialog.learner?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto h-full">
            {lessonPlanDialog.lesson && lessonPlanDialog.learner && (
              <LessonPlan
                lesson={lessonPlanDialog.lesson}
                learner={lessonPlanDialog.learner}
                nextLessonId={null}
                prevLessonId={null}
              />
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                setLessonPlanDialog((prev) => ({ ...prev, open: false }))
              }
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GoogleOAuthProvider>
  );
}

export default Instructor;
