import "react-big-calendar/lib/css/react-big-calendar.css";

import {
  // googleLogout,
  GoogleOAuthProvider,
  // useGoogleLogin,
} from "@react-oauth/google";
import { useQueryClient } from "@tanstack/react-query";
// import axios from "axios";
import {
  addDays,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  parse,
  startOfWeek,
} from "date-fns";
import enUS from "date-fns/locale/en-US";
import {
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  ExternalLinkIcon,
  PhoneOutgoing,
  UserPen,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { useNavigate } from "react-router-dom";

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
      // Case 1: Single day, all day
      if (u.booked_date && u.all_day) {
        return formattedDate === u.booked_date;
      }

      // Case 2: Single day, specific time slot
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

      // Case 3: Weekly recurring on specific day of week
      if (u.day_of_week && u.booked_start_time && u.booked_end_time) {
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

      // Case 4: Date range
      if (u.start_date && u.end_date) {
        const rangeStart = new Date(u.start_date);
        const rangeEnd = new Date(u.end_date);
        rangeEnd.setHours(23, 59, 59); // Set to end of day
        return currentTime >= rangeStart && currentTime <= rangeEnd;
      }

      return false;
    });
  }

  const [scheduleDetailDialog, setScheduleDetailDialog] = useState({
    open: false,
    schedule: null,
    learner: null,
  });

  const handleScheduleClick = (schedule: any, learner: any) => {
    setScheduleDetailDialog({
      open: true,
      schedule,
      learner,
    });
  };
  const handleFinishLesson = async (scheduleId: string, learnerId: string) => {
    try {
      // First, update the current lesson status to completed
      await updateScheduleStatus.mutateAsync({
        scheduleId,
        status: "completed",
      });

      // Fetch all schedules for this learner
      const { data: learnerSchedules, error: schedulesError } = await supabase
        .from("Schedule")
        .select("id, status")
        .eq("learner_id", learnerId);

      if (schedulesError) {
        console.error("Error fetching learner schedules:", schedulesError);
        return;
      }

      // Check if all lessons are completed
      const totalLessons = learnerSchedules.length;
      const completedLessons = learnerSchedules.filter(
        (schedule) => schedule.status === "completed",
      ).length;

      // If all lessons are completed, send the review request message
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

      // Refresh the instructor schedule data
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
    setCurrentWeekStart((prev) =>
      direction === "next" ? addDays(prev, 7) : addDays(prev, -7),
    );
  };

  if (instructorLoading) return <div>Loading...</div>;
  if (instructorError)
    return <div>An error occurred: {instructorError.message}</div>;

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <div className="flex h-full w-full p-6 pb-20">
        <Tabs defaultValue="calendar" className="flex h-full w-full flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="calendar" className="w-full">
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="schedule" className="w-full">
              Schedule For The Day (
              {instructorData?.instructorScheduleDay.length})
            </TabsTrigger>
            <TabsTrigger value="lesson" className="w-full">
              All Classes
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="calendar"
            className="flex flex-col justify-between gap-2 overflow-y-auto"
          >
            {/* Weekly Schedule View similar to CreateSchedule.tsx */}
            <div>
              {/* Week Navigation */}
              <div className="mb-4 flex items-center justify-between text-center">
                <Button
                  variant="outline"
                  onClick={() => handleWeekChange("prev")}
                  className="text-xs"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                </Button>
                <h3 className="text-xs font-semibold">
                  {format(currentWeekStart, "MMM d")} -{" "}
                  {format(endOfWeek(currentWeekStart), "MMM d, yyyy")}
                </h3>
                <Button
                  variant="outline"
                  onClick={() => handleWeekChange("next")}
                  className="text-xs"
                >
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* Weekly Schedule Table */}
              <div
                className="scrollbar-none max-h-85 h-[calc(100vh-50px)] overflow-x-auto overflow-y-auto p-4"
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
                        return (
                          <th
                            key={index}
                            className="min-w-24 border border-gray-200 p-1 text-xs"
                          >
                            <div>{format(day, "EEE")}</div>
                            <div className="text-xs">
                              {format(day, "MMM d")}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 32 }).map((_, timeIndex) => {
                      const hour = Math.floor(timeIndex / 2) + 6; // Start from 6 AM
                      const minute = timeIndex % 2 === 0 ? 0 : 30; // Alternate between 0 and 30 minutes
                      return (
                        <tr key={timeIndex} className="h-10">
                          <td className="sticky left-0 z-10 border border-gray-200 bg-white px-2 py-0 text-center">
                            <span className="text-xs">
                              {format(
                                new Date().setHours(hour, minute),
                                "h:mm a",
                              )}
                            </span>
                          </td>
                          {Array.from({ length: 7 }).map((_, dayIndex) => {
                            const day = addDays(currentWeekStart, dayIndex);
                            const currentDate = format(day, "yyyy-MM-dd");

                            // Find the schedule for the current day and time
                            const schedule =
                              instructorData?.instructorSchedule.find((s) => {
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

                            // Check if this time is unavailable based on instructor's unavailability
                            const isUnavailable = isTimeUnavailable(
                              instructorData?.unavailability,
                              day,
                              hour,
                              minute,
                            );

                            // Find the corresponding learner for this schedule
                            let learnerName = "";
                            let learnerInfo = null;
                            if (schedule) {
                              const learnerLesson =
                                instructorData?.learnerLesson.find(
                                  (ll) => ll.lesson.id === schedule.lesson_id,
                                );
                              if (learnerLesson) {
                                learnerName = learnerLesson.learner.name;
                                learnerInfo = learnerLesson.learner;
                              }
                            }

                            // Determine if this cell is the start of a schedule
                            const isScheduleStart =
                              schedule &&
                              parseInt(schedule.start_time.split(":")[0]) ===
                                hour &&
                              parseInt(schedule.start_time.split(":")[1]) ===
                                minute;

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
                                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xs">
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
          </TabsContent>

          <TabsContent
            value="schedule"
            className="flex flex-col justify-between gap-2 overflow-y-auto"
          >
            {instructorData?.learnerLessonDay.map(
              ({ learner, lesson }, index) => {
                const currentSchedule =
                  instructorData.instructorScheduleDay[index];
                const isOngoing = currentSchedule.status === "ongoing";
                return (
                  <Card
                    className={
                      instructorData?.learnerLessonDay.length - 1 === index
                        ? `mb-24`
                        : ``
                    }
                    key={index}
                  >
                    <CardHeader>
                      <CardTitle className="flex flex-wrap items-center justify-between gap-4">
                        <div>Lesson {lesson?.number}</div>
                        <div className="text-xs">
                          <div className="text-right text-base">
                            {new Date(
                              instructorData.instructorSchedule[index].date,
                            ).toLocaleDateString()}
                          </div>
                          {formatTimeRange(
                            instructorData.instructorSchedule[index].start_time,
                            instructorData.instructorSchedule[index].end_time,
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
                        <div className="flex flex-row items-center gap-1">
                          <p className="text-nowrap text-muted-foreground">
                            Pick-up Location :
                          </p>
                          <a
                            href={`https://www.google.com/maps?q=${learner.address_lat},${learner.address_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 truncate text-xs underline hover:text-blue-800"
                          >
                            <span className="truncate">
                              {learner.pick_up_location}
                            </span>
                            <ExternalLinkIcon className="h-4 w-4 shrink-0" />
                          </a>
                        </div>
                        <div className="flex flex-row gap-1">
                          <p className="text-muted-foreground">
                            Learner name :
                          </p>
                          <p>{learner.name}</p>
                        </div>
                        <div className="flex flex-row items-center gap-1">
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
                      </div>
                      <Card className="rounded-smb flex flex-row items-center justify-between gap-4 p-2 shadow-md">
                        <div className="flex w-full flex-wrap items-center justify-between gap-2 p-1 text-xs">
                          <p>
                            Lesson status :{" "}
                            {currentSchedule.status?.toUpperCase()}
                          </p>
                          <div className="flex flex-row items-center gap-24">
                            {isOngoing ? (
                              <div className="relative flex items-center justify-center">
                                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                <div className="absolute h-3 w-3 animate-ping rounded-full bg-green-500"></div>
                              </div>
                            ) : null}
                            {currentSchedule.status === "completed" ? (
                              <div className="flex items-center justify-center">
                                <CircleCheckBig
                                  className="rounded-full bg-green-500 text-white"
                                  size={18}
                                />
                              </div>
                            ) : null}
                          </div>
                          {isOngoing && (
                            <Button
                              onClick={() =>
                                handleFinishLesson(
                                  currentSchedule.id.toString(),
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
                          {currentSchedule.status !== "ongoing" &&
                            currentSchedule.status !== "completed" && (
                              <Button
                                onClick={() => {
                                  navigate(
                                    `/otp/${learner.id}/${currentSchedule.id}`,
                                  );
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
              },
            )}
            <div className="fixed bottom-4 right-4">
              <button className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-purple shadow-lg transition duration-200 hover:bg-purple-600">
                <a href="tel:+919748439881">
                  <PhoneOutgoing className="text-white" size={18} />
                </a>
              </button>
            </div>
          </TabsContent>

          <TabsContent
            value="lesson"
            className="flex flex-col justify-between gap-2 overflow-y-scroll"
          >
            {instructorData?.learnerLesson.map(({ learner, lesson }, index) => {
              return (
                <Card
                  className={
                    instructorData?.learnerLesson.length - 1 === index
                      ? `mb-24`
                      : ``
                  }
                  key={index}
                >
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center justify-between gap-4">
                      <div>Lesson {lesson?.number}</div>
                      <div className="text-xs">
                        <div className="text-right text-base">
                          {new Date(
                            instructorData.instructorSchedule[index].date,
                          ).toLocaleDateString()}
                        </div>
                        {formatTimeRange(
                          instructorData.instructorSchedule[index].start_time,
                          instructorData.instructorSchedule[index].end_time,
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
                      <div className="flex flex-row items-center gap-1">
                        <p className="text-nowrap text-muted-foreground">
                          Pick-up Location :
                        </p>
                        <a
                          href={`https://www.google.com/maps?q=${learner.address_lat},${learner.address_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 truncate text-xs underline hover:text-blue-800"
                        >
                          <span className="truncate">
                            {learner.pick_up_location}
                          </span>
                          <ExternalLinkIcon className="h-4 w-4 shrink-0" />
                        </a>
                      </div>
                      <div className="flex flex-row gap-1">
                        <p className="text-muted-foreground">Learner name :</p>
                        <p>{learner.name}</p>
                      </div>
                      <div className="flex flex-row items-center gap-1">
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
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <div className="fixed bottom-4 right-4">
              <button className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-purple shadow-lg transition duration-200 hover:bg-purple-600">
                <a href="/instructor-profile">
                  <UserPen className="text-white" size={24} />
                </a>
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Event Details Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedEvent?.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {selectedEvent && (
                <div className="mt-2 flex flex-col gap-1">
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
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
    </GoogleOAuthProvider>
  );
}
export default Instructor;
