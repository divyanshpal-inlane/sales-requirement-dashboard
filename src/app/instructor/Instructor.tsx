import "react-big-calendar/lib/css/react-big-calendar.css";

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
import { Checkbox } from "@/components/ui/checkbox";
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
  Link,
  Unlink,
  Plus,
  Save,
  X,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LESSON_CONTENT } from "@/constants/Lesson";
import { supabase, useUser } from "@/context/auth-context";
import { useInstructor, useInstructorScheduleData, useUpdateScheduleStatus } from "@/queries/instructor";

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

// Google Calendar Integration - Enhanced with Event Creation
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

let gapiInited = false;
let gisInited = false;
let tokenClient: any;

const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";
const SCOPES = "https://www.googleapis.com/auth/calendar"; // Updated scope for write access

const loadGoogleAPIs = () => {
  return new Promise((resolve, reject) => {
    // Load GAPI
    if (
      !document.querySelector('script[src="https://apis.google.com/js/api.js"]')
    ) {
      const gapiScript = document.createElement("script");
      gapiScript.src = "https://apis.google.com/js/api.js";
      gapiScript.onload = () => {
        window.gapi.load("client", async () => {
          try {
            await window.gapi.client.init({
              apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
              discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInited = true;
            // console.log("GAPI initialized");
            if (gisInited) resolve(true);
          } catch (error) {
            reject(error);
          }
        });
      };
      gapiScript.onerror = reject;
      document.head.appendChild(gapiScript);
    }

    // Load GIS
    if (
      !document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]',
      )
    ) {
      const gisScript = document.createElement("script");
      gisScript.src = "https://accounts.google.com/gsi/client";
      gisScript.onload = () => {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: "", // Will be set later
        });
        gisInited = true;
        // console.log("GIS initialized");
        if (gapiInited) resolve(true);
      };
      gisScript.onerror = reject;
      document.head.appendChild(gisScript);
    }
  });
};

const authenticateGoogle = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        reject(resp);
        return;
      }
      console.log("Google authentication successful");
      resolve(true);
    };

    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: "consent" });
    } else {
      tokenClient.requestAccessToken({ prompt: "" });
    }
  });
};

const fetchGoogleCalendarEvents = async (startDate: Date, endDate: Date) => {
  try {
    console.log(
      "Fetching Google Calendar events from",
      startDate,
      "to",
      endDate,
    );

    const request = {
      calendarId: "primary",
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 250,
      orderBy: "startTime",
    };

    console.log("API Request:", request);

    const response = await window.gapi.client.calendar.events.list(request);
    console.log("Google Calendar API Response:", response);

    const events = response.result.items || [];
    console.log("Parsed events:", events);

    return events;
  } catch (error) {
    console.error("Error fetching Google Calendar events:", error);
    return [];
  }
};

// New function to create Google Calendar event
const createGoogleCalendarEvent = async (eventData: any) => {
  try {
    console.log("Creating Google Calendar event:", eventData);

    const event = {
      summary: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start: {
        dateTime: eventData.startDateTime,
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: eventData.endDateTime,
        timeZone: "Asia/Kolkata",
      },
    };

    const response = await window.gapi.client.calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });

    console.log("Google Calendar event created:", response);
    return response.result;
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    throw error;
  }
};

const signOutGoogle = () => {
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken("");
  }
};

function Instructor() {
  const { phone } = useUser();
  const {
    data: instructorData,
    isLoading: instructorLoading,
    error: instructorError,
  } = useInstructorScheduleData(phone ?? "");
  const updateScheduleStatus = useUpdateScheduleStatus();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date()),
  );
  const processUnavailability = (unavailability) => {
    if (!unavailability || !Array.isArray(unavailability)) return [];

    return unavailability
      .map((block, index) => {
        let start,
          end,
          allDay = false;

        if (block.start_date && block.end_date) {
          // Multi-day range
          start = new Date(
            `${block.start_date}T${block.range_start_time || "00:00"}:00`,
          );
          end = new Date(
            `${block.end_date}T${block.range_end_time || "23:59"}:00`,
          );
          allDay = !!block.range_all_day;
        } else if (block.booked_date) {
          // Single day
          start = new Date(
            `${block.booked_date}T${block.booked_start_time || "00:00"}:00`,
          );
          end = new Date(
            `${block.booked_date}T${block.booked_end_time || "23:59"}:00`,
          );
          allDay = !!block.all_day;
        } else {
          return null;
        }

        return {
          id: `unavail-${index}`,
          title: block.reason || "Unavailable",
          summary: block.reason || "Unavailable",
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
          allDay,
          type: "unavailability",
          description: block.description || "",
        };
      })
      .filter(Boolean);
  };
  useEffect(() => {
    if (!instructorLoading)
      console.log("T2 CalendarDay Instructor Data:", instructorData);
    // console.log("Day Schedules:", daySchedules);
  }, [instructorData, instructorLoading]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [calendarEvents, setCalendarEvents] = useState([]);

  // Google Calendar Integration State
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [googleAPIReady, setGoogleAPIReady] = useState(false);

  // Event Creation State
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [newEventData, setNewEventData] = useState({
    title: "",
    description: "",
    location: "",
    startDate: "",
    endDate: "",
    date: "",
    startTime: "",
    endTime: "",
    allDay: false,
  });

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
  useEffect(() => {
    const unavailabilityEvents = processUnavailability(
      instructorData?.unavailability,
    );
    const combinedEvents = [...googleEvents, ...unavailabilityEvents];
    setCalendarEvents(combinedEvents);
  }, [googleEvents, instructorData?.unavailability]);

  // Initialize Google APIs
  useEffect(() => {
    const initGoogle = async () => {
      try {
        // console.log("Initializing Google APIs...");
        await loadGoogleAPIs();
        setGoogleAPIReady(true);
        // console.log("Google APIs ready");

        // Check if already authenticated
        if (window.gapi?.client?.getToken()) {
          setIsGoogleConnected(true);
          if (isGoogleConnected) {
            await loadGoogleCalendarEvents();
          }
        }
      } catch (error) {
        console.error("Failed to initialize Google APIs:", error);
      }
    };

    initGoogle();
  }, []);

  // Load events when view changes
  useEffect(() => {
    if (isGoogleConnected && googleAPIReady) {
      loadGoogleCalendarEvents();
    }
  }, [
    currentDate,
    viewMode,
    currentWeekStart,
    isGoogleConnected,
    googleAPIReady,
  ]);

  const loadGoogleCalendarEvents = async () => {
    try {
      console.log("Loading Google Calendar events...");

      let startDate: Date;
      let endDate: Date;

      if (viewMode === "month") {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      } else if (viewMode === "week") {
        startDate = currentWeekStart;
        endDate = endOfWeek(currentWeekStart);
      } else {
        startDate = new Date(currentDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(currentDate);
        endDate.setHours(23, 59, 59, 999);
      }

      console.log("Date range for events:", { startDate, endDate });

      const events = await fetchGoogleCalendarEvents(startDate, endDate);
      console.log("Setting Google events:", events);
      setGoogleEvents(events);
    } catch (error) {
      console.error("Error loading Google Calendar events:", error);
    }
  };

  const handleGoogleConnect = async () => {
    if (!googleAPIReady) {
      console.error("Google APIs not ready yet");
      return;
    }

    setIsConnecting(true);
    try {
      console.log("Attempting to connect to Google...");

      const success = await authenticateGoogle();
      if (success) {
        console.log("Google authentication successful");
        setIsGoogleConnected(true);
        if (isGoogleConnected) {
          await loadGoogleCalendarEvents();
        }
      }
    } catch (error) {
      console.error("Failed to connect to Google Calendar:", error);
      alert("Failed to connect to Google Calendar. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      signOutGoogle();
      setIsGoogleConnected(false);
      setGoogleEvents([]);
      console.log("Disconnected from Google Calendar");
    } catch (error) {
      console.error("Failed to disconnect from Google Calendar:", error);
    }
  };

  // Handle slot selection for event creation
  const handleSlotSelect = (slotInfo: any) => {
    const startDate = new Date(slotInfo.start);
    const endDate = new Date(slotInfo.end);

    setSelectedSlot(slotInfo);
    setNewEventData({
      title: "",
      description: "",
      location: "",
      date: format(startDate, "yyyy-MM-dd"),
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      startTime: format(startDate, "HH:mm"),
      endTime: format(endDate, "HH:mm"),
      allDay: false, // <-- Add this line
    });
    setIsCreateEventOpen(true);
  };

  // Handle empty cell click for event creation
  const handleEmptyCellClick = (date: Date, hour: number) => {
    const startDate = new Date(date);
    startDate.setHours(hour, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(hour + 1, 0, 0, 0);

    setSelectedSlot({ start: startDate, end: endDate });
    setNewEventData({
      title: "",
      description: "",
      location: "",
      date: format(startDate, "yyyy-MM-dd"),
      startDate: format(startDate, "yyyy-MM-dd"), // Ensure string value
      endDate: format(endDate, "yyyy-MM-dd"), // Ensure string value
      startTime: format(startDate, "HH:mm"),
      endTime: format(endDate, "HH:mm"),
      allDay: false,
    });

    setIsCreateEventOpen(true);
  };

  // Create event function
  const handleCreateEvent = async () => {
    if (!newEventData.title.trim()) {
      alert("Please enter an event title.");
      return;
    }

    setIsCreatingEvent(true);
    let googleEventId = null;

    try {
      // Prepare event data
      const startDateTime = new Date(
        `${newEventData.date}T${newEventData.startTime}:00`,
      );
      const endDateTime = new Date(
        `${newEventData.date}T${newEventData.endTime}:00`,
      );

      // Try to create Google Calendar event if connected
      if (isGoogleConnected) {
        try {
          const googleEvent = await createGoogleCalendarEvent({
            title: newEventData.title,
            description: newEventData.description,
            location: newEventData.location,
            startDateTime: startDateTime.toISOString(),
            endDateTime: endDateTime.toISOString(),
          });
          googleEventId = googleEvent?.id;
        } catch (error) {
          console.error("Google Calendar error:", error);
        }
      }

      // Update unavailability
      const { data: instructorRow, error: fetchError } = await supabase
        .from("Instructor")
        .select("unavailability")
        .eq("phone", phone)
        .single();

      if (!fetchError) {
        const newBlock = {
          all_day: newEventData.allDay,
          booked_date: newEventData.date,
          booked_start_time: newEventData.startTime,
          booked_end_time: newEventData.endTime,
          reason: newEventData.title,
          description: newEventData.description,
        };

        const updatedUnavailability = [
          ...(instructorRow.unavailability || []),
          newBlock,
        ];

        await supabase
          .from("Instructor")
          .update({ unavailability: updatedUnavailability })
          .eq("phone", phone);
      }

      // Refresh Google events only if connected
      if (isGoogleConnected) await loadGoogleCalendarEvents();

      // Reset form
      setIsCreateEventOpen(false);
      setNewEventData({
        title: "",
        description: "",
        location: "",
        date: format(startDateTime, "yyyy-MM-dd"),
        startDate: format(startDateTime, "yyyy-MM-dd"), // Ensure string value
        endDate: format(endDateTime, "yyyy-MM-dd"), // Ensure string value
        startTime: format(startDateTime, "HH:mm"),
        endTime: format(endDateTime, "HH:mm"),
        allDay: false,
      });

      alert("Event created successfully!");
    } catch (error) {
      console.error("Event creation failed:", error);
      alert("Failed to create event");
    } finally {
      setIsCreatingEvent(false);
    }
  };

  // Rest of your existing functions remain the same...
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
    navigate("/instructor-profile");
  };

  // Enhanced Calendar Components with Event Creation
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

  const CalendarDay = ({ date }) => {
    const isToday = isSameDay(date, new Date());
    const isCurrentMonth = isSameMonth(date, currentDate);

    const daySchedules =
      instructorData?.instructorSchedule.filter((schedule) =>
        isSameDay(new Date(schedule.date), date),
      ) || [];

    // Use calendarEvents instead of googleEvents
    const dayEvents = calendarEvents.filter((event) => {
      if (event.start?.dateTime) {
        const eventStart = new Date(event.start.dateTime);
        return isSameDay(eventStart, date);
      } else if (event.start?.date) {
        const eventStart = new Date(event.start.date);
        return isSameDay(eventStart, date);
      }
      return false;
    });

    return (
      <div
        className={`relative min-h-[80px] cursor-pointer border-b border-r border-gray-200 p-1 hover:bg-gray-50 ${!isCurrentMonth ? "bg-gray-50 text-gray-400" : "bg-white"} ${isToday ? "bg-blue-50" : ""}`}
        onClick={() => handleEmptyCellClick(date, 9)}
      >
        <div
          className={`mb-1 text-sm font-medium ${isToday ? "flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white" : ""}`}
        >
          {format(date, "d")}
        </div>

        <div className="space-y-1">
          {/* Instructor Schedules */}
          {daySchedules.slice(0, 1).map((schedule, idx) => {
            const learnerInfo = instructorData?.learnerLesson.find(
              (ll) => (ll?.lesson?.id && 
                (ll.lesson.id === schedule.lesson_id)),
            );

            return (
              <div
                key={`schedule-${idx}`}
                className={`cursor-pointer truncate rounded p-1 text-xs ${
                  schedule.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : schedule.status === "ongoing"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-purple-100 text-purple-800"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleScheduleClick(schedule, learnerInfo?.learner);
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

          {/* Calendar Events (Google + Unavailability) */}
          {dayEvents
            .slice(0, 2 - Math.min(daySchedules.length, 1))
            .map((event, idx) => (
              <div
                key={`event-${idx}`}
                className={`cursor-pointer truncate rounded p-1 text-xs ${
                  event.type === "unavailability"
                    ? "bg-red-100 text-red-800"
                    : "bg-orange-100 text-orange-800"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEventClick(event);
                }}
              >
                {event.start?.dateTime
                  ? format(new Date(event.start.dateTime), "HH:mm")
                  : "All day"}{" "}
                {event.summary || event.title}
              </div>
            ))}

          {daySchedules.length + dayEvents.length > 2 && (
            <div className="text-xs font-medium text-gray-500">
              +{daySchedules.length + dayEvents.length - 2} more
            </div>
          )}
        </div>
      </div>
    );
  };

  const MonthView = () => {
    const calendarDays = generateCalendarDays();

    return (
      <div className="flex h-full flex-col">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-2 text-center text-xs font-medium text-gray-600"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid flex-1 auto-rows-fr grid-cols-7">
          {calendarDays.map((day, index) => (
            <CalendarDay key={index} date={day} />
          ))}
        </div>
      </div>
    );
  };

  // Enhanced WeekView with click-to-create functionality
  const WeekView = () => {
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

                      // Check for instructor schedules
                      const schedule = instructorData?.instructorSchedule.find(
                        (s) => {
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
                        },
                      );

                      // Check for Combined Calendar events
                      const calendarEvent = calendarEvents.find((event) => {
                        if (!event.start?.dateTime) return false;

                        const eventStart = new Date(event.start.dateTime);
                        const eventEnd = new Date(event.end.dateTime);
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
                        const learnerLesson =
                          instructorData?.learnerLesson.find(
                          (ll) => (ll?.lesson?.id && 
                              (ll.lesson.id === schedule.lesson_id)),
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
                        calendarEvent &&
                        new Date(calendarEvent.start.dateTime).getHours() ===
                          hour &&
                        new Date(calendarEvent.start.dateTime).getMinutes() ===
                          minute;
                      const isEmpty =
                        !schedule && !calendarEvent && !isUnavailable;

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
                              : calendarEvent
                                ? "bg-orange-200 text-orange-800"
                                : isUnavailable
                                  ? "bg-gray-400 text-red-800"
                                  : isEmpty
                                    ? "cursor-pointer hover:bg-blue-50"
                                    : ""
                          } ${schedule || calendarEvent ? "cursor-pointer hover:opacity-80" : ""}`}
                          onClick={() => {
                            if (schedule) {
                              handleScheduleClick(schedule, learnerInfo);
                            } else if (calendarEvent) {
                              handleEventClick(calendarEvent);
                            } else if (isEmpty) {
                              handleEmptyCellClick(day, hour); // <-- use day here
                            }
                          }}
                        >
                          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xs">
                            {isScheduleStart ? (
                              <>
                                <div className="font-semibold">
                                  {learnerName}
                                </div>
                                <div>{`${schedule.start_time.substring(0, 5)} - ${schedule.end_time.substring(0, 5)}`}</div>
                              </>
                            ) : isGoogleEventStart ? (
                              <>
                                <div className="font-semibold">
                                  {calendarEvent.summary}
                                </div>
                                <div>
                                  {format(
                                    new Date(calendarEvent.start.dateTime),
                                    "HH:mm",
                                  )}{" "}
                                  -{" "}
                                  {format(
                                    new Date(calendarEvent.end.dateTime),
                                    "HH:mm",
                                  )}
                                </div>
                              </>
                            ) : isEmpty ? (
                              <div className="text-xs text-gray-400">
                                <Plus className="mx-auto h-3 w-3" />
                              </div>
                            ) : isUnavailable && !schedule && !calendarEvent ? (
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

  // Enhanced DayView with click-to-create functionality
  const DayView = () => {
    const daySchedules =
      instructorData?.instructorSchedule.filter((schedule) =>
        isSameDay(new Date(schedule.date), currentDate),
      ) || [];

    const dayCalendarEvents = calendarEvents.filter((event) => {
      if (!event.start?.dateTime) return false;
      const eventStart = new Date(event.start.dateTime);
      return isSameDay(eventStart, currentDate);
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

            const timeSlotGoogleEvents = dayCalendarEvents.filter((event) => {
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
                  isEmpty ? "cursor-pointer hover:bg-blue-50" : ""
                }`}
                onClick={() => {
                  if (isEmpty) {
                    handleEmptyCellClick(currentDate, hour);
                  }
                }}
              >
                <div className="w-16 border-r bg-gray-50 p-2 text-xs text-gray-600">
                  {format(new Date().setHours(hour, 0), "HH:mm")}
                </div>

                <div
                  className={`relative flex-1 p-2 ${
                    // CONDITION 1: Unavailable AND no schedules or Google events (The initial check is fine, but can be simplified)
                    isUnavailable &&
                    timeSlotSchedules.length === 0 &&
                    timeSlotGoogleEvents.length === 0
                      ? "bg-gray-400"
                      : timeSlotSchedules.length > 0
                      ? timeSlotSchedules[0].status === "completed"
                        ? "bg-green-200 text-green-800"
                        : timeSlotSchedules[0].status === "ongoing"
                        ? "bg-blue-200 text-blue-800"
                        : "bg-primary text-white"
                      : timeSlotGoogleEvents.length > 0
                      ? "bg-orange-200 text-orange-800"
                      : isUnavailable
                      ? "bg-gray-400 text-red-800"
                      : isEmpty
                      ? "cursor-pointer hover:bg-blue-50"
                      : ""
                  }`}
>
                  {/* Instructor Schedules */}
                  {timeSlotSchedules.map((schedule, idx) => {
                    const learnerInfo = instructorData?.learnerLesson.find(
                      (ll) => (ll?.lesson?.id && 
                        (ll.lesson.id === schedule.lesson_id)),
                    );

                    const isScheduleStart =
                      parseInt(schedule.start_time.split(":")[0]) === hour &&
                      parseInt(schedule.start_time.split(":")[1]) === minute;

                    if (!isScheduleStart) return null;

                    return (
                      <div
                        key={`schedule-${idx}`}
                        className={`mb-1 cursor-pointer rounded p-2 text-sm ${
                          schedule.status === "completed"
                            ? "bg-green-200 text-green-800"
                            : schedule.status === "ongoing"
                              ? "bg-blue-200 text-blue-800"
                              : "bg-primary text-white"
                        } `}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleScheduleClick(schedule, learnerInfo?.learner);
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
                  {/* Calendar Events */}
                  {
                    timeSlotGoogleEvents.length > 0 && (
                      <>
                        <div className="text-center font-semibold">
                          {timeSlotGoogleEvents[0]?.summary}
                        </div>
                        <div className="text-center">
                          {format(
                            new Date(timeSlotGoogleEvents[0]?.start?.dateTime),
                            "HH:mm",
                          )}{" "}
                          -{" "}
                          {format(
                            new Date(timeSlotGoogleEvents[0]?.end?.dateTime),
                            "HH:mm",
                          )}
                        </div>
                      </>
                    )
                  }
                  {/* Empty slot indicator */}
                  {isEmpty ? (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        <span className="text-sm">Click to add event</span>
                      </div>
                    </div>
                  ): ""}
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
      <div className="flex h-full flex-col">
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col items-center justify-between p-4">
            <div className="-mt-4 mb-2 ml-2 flex items-center space-x-3">
              {/* Create Event Button */}
              {isGoogleConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later

                    setNewEventData({
                      title: "",
                      description: "",
                      location: "",
                      date: format(startDate, "yyyy-MM-dd"),
                      startDate: format(startDate, "yyyy-MM-dd"), // Ensure string value
                      endDate: format(endDate, "yyyy-MM-dd"), // Ensure string value
                      startTime: format(startDate, "HH:mm"),
                      endTime: format(endDate, "HH:mm"),
                      allDay: false,
                    });
                    setIsCreateEventOpen(true);
                  }}
                  className="flex items-center gap-1 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  Create Event
                </Button>
              )}

              <button
                onClick={handleProfileClick}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-purple shadow-lg transition duration-200 hover:bg-purple-600"
              >
                <User className="text-white" size={20} />
              </button>
            </div>

            <div className="mt-2 flex items-center space-x-2">
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
              {/* <Button
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
              </Button> */}
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
                {viewMode === "day" &&
                  format(currentDate, "EEEE, MMMM d, yyyy")}
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
            {isGoogleConnected && (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                Google Calendar Connected ({calendarEvents.length} events)
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {viewMode === "month" && <MonthView />}
          {viewMode === "week" && <WeekView />}
          {viewMode === "day" && <DayView />}
        </div>
      </div>
    );
  };

  if (instructorLoading) return <div>Loading...</div>;
  if (instructorError)
    return <div>An error occurred: {instructorError.message}</div>;

  return (
    <div className="flex h-full w-full flex-col">
      <Tabs defaultValue="schedule" className="flex h-full w-full flex-col">
        <div className="flex-1 overflow-hidden p-6 pb-2">
          <TabsContent value="calendar" className="m-0 h-full overflow-y-auto">
            <EnhancedCalendarView />
          </TabsContent>

          {/* Rest of your existing TabsContent components remain the same... */}
          <TabsContent value="schedule" className="m-0 h-full overflow-y-auto">
            <div className="flex flex-col gap-2 pb-4">
              {instructorData?.instructorScheduleDay.length === 0
              ? <div className="text-center text-gray-500"> No schedules today </div>
              : instructorData?.instructorScheduleDay.map((schedule, index) => {
                // to be fixed
                // for every schedule
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
                      <CardTitle className="flex flex-wrap items-center justify-between gap-4 text-sm">
                        <div className="text-base">Lesson {lesson?.number}</div>
                        <div className="text-sm">
                          <div className="text-right text-base">
                            {new Date(schedule.date).toLocaleDateString()}
                          </div>
                          {formatTimeRange(
                            schedule.start_time,
                            schedule.end_time,
                          )}
                        </div>
                      </CardTitle>
                      <CardDescription className="text-base">
                        {lesson?.number &&
                          LESSON_CONTENT[lesson.number]?.content.title}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2 text-base">
                        <div className="flex flex-row items-center gap-2">
                          <p className="text-nowrap text-muted-foreground">
                            Pick-up Location :
                          </p>
                          <a
                            href={`https://www.google.com/maps?q=${learner.address_lat},${learner.address_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 truncate text-base underline hover:text-blue-800"
                          >
                            <span className="truncate">
                              {learner.pick_up_location}
                            </span>
                            <ExternalLinkIcon className="h-4 w-4 shrink-0" />
                          </a>
                        </div>
                        <div className="flex flex-row gap-2">
                          <p className="text-muted-foreground">
                            Learner name :
                          </p>
                          <p>{learner.name}</p>
                        </div>
                        <div className="flex flex-row items-center gap-2">
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
                          className="mt-2 w-full text-sm"
                        >
                          View Lesson Plan
                        </Button>
                      </div>
                      <Card className="rounded-smb flex flex-row items-center justify-between gap-4 p-2 shadow-md">
                        <div className="flex w-full flex-wrap items-center justify-between gap-2 p-1 text-sm">
                          <p>
                            Lesson status : {schedule.status?.toUpperCase()}
                          </p>
                          <div className="flex flex-row items-center gap-24">
                            {isOngoing ? (
                              <div className="relative flex items-center justify-center">
                                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                <div className="absolute h-3 w-3 animate-ping rounded-full bg-green-500"></div>
                              </div>
                            ) : null}
                            {schedule.status === "completed" ? (
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
                              onClick={() => {
                                  // alert("Lesson to be ended by customer");
                                  navigate(`/otp/end/${learner.id}/${schedule.id}`);
                                }
                                // handleFinishLesson(
                                //   schedule.id.toString(),
                                //   learner.id,
                                // )
                              }
                              size="sm"
                              variant="secondary"
                              className="text-sm"
                            >
                              Finish Lesson
                            </Button>
                          )}
                          {schedule.status !== "ongoing" &&
                            schedule.status !== "completed" && (
                              <Button
                                onClick={() => {
                                  navigate(`/otp/start/${learner.id}/${schedule.id}`);
                                }}
                                size="sm"
                                className="text-sm"
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

          <TabsContent value="lesson" className="m-0 h-full overflow-y-auto">
            <div className="flex flex-col gap-2 pb-4">
              { !instructorData && (
                <div className="text-center text-gray-500"> No lessons scheduled </div>
                )
              }
              {instructorData?.learnerLesson
                .map((item, index) => {
                  if (!item) {
                    console.warn(`Skipping null/undefined item at index ${index}.`);
                    return null;
                  }

                  const { learner, lesson } = item;

                  if (!lesson || !lesson.id) {
                    console.warn(`Skipping item at index ${index}: lesson or lesson ID is missing.`);
                    return null;
                  }
                  
                  const lessonSchedule = instructorData.instructorSchedules.find(
                  (s) => s.lesson_id === lesson.id,
                  );

                  // Existing check for lessonSchedule
                  if (!lessonSchedule) {
                    console.error(`Missing schedule for lesson ID: ${lesson.id}`);
                    return null;
                  }

                  return (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="flex flex-wrap items-center justify-between gap-4 text-sm">
                          <div className="text-base">Lesson {lesson.number}</div>
                          <div className="text-sm">
                            <div className="text-right text-base">
                              {lessonSchedule.date
                                ? new Date(lessonSchedule.date).toLocaleDateString()
                                : "No date"}
                            </div>
                            {formatTimeRange(
                                lessonSchedule.start_time,
                                lessonSchedule.end_time,
                              )}
                          </div>
                        </CardTitle>
                        <CardDescription className="text-base">
                          {lesson.number &&
                            LESSON_CONTENT[lesson.number]?.content.title}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1 text-lg">
                          <div className="flex flex-row items-center gap-1">
                            <p className="text-nowrap text-muted-foreground">
                              Pick-up Location :
                            </p>
                            {/* Added defensive access for learner properties like address_lat/lng */}
                            <a
                              href={`https://www.google.com/maps?q=$$${learner?.address_lat},${learner?.address_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 truncate text-base underline hover:text-blue-800"
                            >
                              <span className="truncate">
                                {learner?.pick_up_location}
                              </span>
                              <ExternalLinkIcon className="h-4 w-4 shrink-0" />
                            </a>
                          </div>
                          <div className="flex flex-row gap-1">
                            <p className="text-muted-foreground">
                              Learner name :
                            </p>
                            <p>{learner?.name}</p>
                          </div>
                          <div className="flex flex-row items-center gap-1">
                            <p className="text-muted-foreground">
                              Contact Learner :{" "}
                            </p>
                            <p>{learner?.phone}</p>
                            <div className="ml-1">
                              <a href={`tel:+91${learner?.phone}`}>
                                <PhoneOutgoing size={14} />
                              </a>
                            </div>
                          </div>

                          {lessonSchedule.status && (
                            <div className="mt-2 flex items-center gap-2">
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

        <div className="sticky bottom-0 z-30 border-t border-gray-200 bg-white shadow-lg">
          <TabsList className="grid h-16 w-full grid-cols-3 rounded-none bg-transparent p-0">
            <TabsTrigger
              value="calendar"
              className="flex h-full flex-col items-center justify-center space-y-1 rounded-none border-0 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs font-medium">Calendar</span>
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="flex h-full flex-col items-center justify-center space-y-1 rounded-none border-0 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
            >
              <Clock className="h-5 w-5" />
              <span className="text-xs font-medium">
                Today ({instructorData?.instructorScheduleDay.length || 0})
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="lesson"
              className="flex h-full flex-col items-center justify-center space-y-1 rounded-none border-0 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-xs font-medium">All Classes</span>
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* Create Event Dialog */}
      <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Block Your Calendar
            </DialogTitle>
            <DialogDescription className="sr-only">
              Create new calendar event
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {/* Title Input */}
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                placeholder="Meeting, Appointment, etc."
                value={newEventData.title}
                onChange={(e) =>
                  setNewEventData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newEventData.startDate || ""}
                  onChange={(e) =>
                    setNewEventData((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                      endDate: e.target.value, // Default end date to start date
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newEventData.endDate || ""}
                  min={newEventData.startDate || ""}
                  onChange={(e) =>
                    setNewEventData((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* All Day Checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="allDay"
                checked={newEventData.allDay}
                onCheckedChange={(checked) =>
                  setNewEventData((prev) => ({
                    ...prev,
                    allDay: !!checked,
                    startTime: checked ? "" : prev.startTime,
                    endTime: checked ? "" : prev.endTime,
                  }))
                }
              />
              <Label htmlFor="allDay">All Day Event</Label>
            </div>

            {/* Time Inputs (Conditional) */}
            {!newEventData.allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newEventData.startTime || ""}
                    onChange={(e) =>
                      setNewEventData((prev) => ({
                        ...prev,
                        startTime: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newEventData.endTime || ""}
                    onChange={(e) =>
                      setNewEventData((prev) => ({
                        ...prev,
                        endTime: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add event details..."
                value={newEventData.description}
                onChange={(e) =>
                  setNewEventData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateEventOpen(false);
                setNewEventData({
                  title: "",
                  description: "",
                  location: "",
                  date: format(startDate, "yyyy-MM-dd"),
                  startDate: format(startDate, "yyyy-MM-dd"), // Ensure string value
                  endDate: format(endDate, "yyyy-MM-dd"), // Ensure string value
                  startTime: format(startDate, "HH:mm"),
                  endTime: format(endDate, "HH:mm"),
                  allDay: false,
                });
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleCreateEvent}
              disabled={isCreatingEvent || !newEventData.title.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCreatingEvent ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Event
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Event Modal for Google Calendar Events */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Calendar className="h-5 w-5 text-orange-600" />
              {selectedEvent?.summary || selectedEvent?.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {selectedEvent && (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      {selectedEvent.start?.dateTime
                        ? formatEventDate(
                            new Date(selectedEvent.start.dateTime),
                          )
                        : selectedEvent.start?.date
                          ? format(
                              new Date(selectedEvent.start.date),
                              "EEEE, MMMM d, yyyy",
                            )
                          : formatEventDate(selectedEvent.start)}
                    </span>
                  </div>
                  {selectedEvent.start?.dateTime &&
                    selectedEvent.end?.dateTime && (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4"></div>
                        <span>
                          {format(
                            new Date(selectedEvent.start.dateTime),
                            "h:mm a",
                          )}{" "}
                          -{" "}
                          {format(
                            new Date(selectedEvent.end.dateTime),
                            "h:mm a",
                          )}
                        </span>
                      </div>
                    )}
                  {selectedEvent.start?.date &&
                    !selectedEvent.start?.dateTime && (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4"></div>
                        <span>All Day Event</span>
                      </div>
                    )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="flex flex-col gap-4 py-2">
              {selectedEvent.description && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <BookOpen className="h-4 w-4" />
                    Description
                  </h4>
                  <p className="pl-6 text-sm text-gray-700">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {selectedEvent.location && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <ExternalLinkIcon className="h-4 w-4" />
                    Location
                  </h4>
                  <p className="pl-6 text-sm text-gray-700">
                    {selectedEvent.location}
                  </p>
                </div>
              )}

              {selectedEvent.attendees &&
                selectedEvent.attendees.length > 0 && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <User className="h-4 w-4" />
                      Attendees
                    </h4>
                    <ul className="space-y-1 pl-6 text-sm text-gray-700">
                      {selectedEvent.attendees.map((attendee, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                          {attendee.email}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {selectedEvent.creator && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4" />
                    Organizer
                  </h4>
                  <p className="pl-6 text-sm text-gray-700">
                    {selectedEvent.creator.email}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            {selectedEvent?.htmlLink && (
              <a
                href={selectedEvent.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <ExternalLinkIcon className="mr-2 h-4 w-4" />
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

      {/* Schedule Detail Dialog */}
      <Dialog
        open={scheduleDetailDialog.open}
        onOpenChange={(open) =>
          setScheduleDetailDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              Schedule Details
            </DialogTitle>
            <DialogDescription>
              {scheduleDetailDialog.learner?.name} - Lesson{" "}
              {
                instructorData?.learnerLesson.find(
                  (ll) =>
                    ll?.lesson?.id && 
                  (ll.lesson.id === scheduleDetailDialog.schedule?.lesson_id),
                )?.lesson.number
              }
            </DialogDescription>
          </DialogHeader>
          {scheduleDetailDialog.schedule && (
            <div className="flex flex-col gap-4 py-2">
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Date & Time
                </h4>
                <div className="space-y-1 pl-6">
                  <p className="text-sm text-gray-700">
                    {new Date(
                      scheduleDetailDialog.schedule.date,
                    ).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-gray-700">
                    {formatTimeRange(
                      scheduleDetailDialog.schedule.start_time,
                      scheduleDetailDialog.schedule.end_time,
                    )}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  Status
                </h4>
                <div className="pl-6">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      scheduleDetailDialog.schedule.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : scheduleDetailDialog.schedule.status === "ongoing"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                    } `}
                  >
                    {scheduleDetailDialog.schedule.status?.toUpperCase()}
                  </span>
                </div>
              </div>

              {scheduleDetailDialog.learner && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4" />
                    Learner Details
                  </h4>
                  <div className="space-y-2 pl-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">
                        Name:
                      </span>
                      <span className="text-sm text-gray-700">
                        {scheduleDetailDialog.learner.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">
                        Phone:
                      </span>
                      <span className="text-sm text-gray-700">
                        {scheduleDetailDialog.learner.phone}
                      </span>
                      <a
                        href={`tel:+91${scheduleDetailDialog.learner.phone}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <PhoneOutgoing className="h-4 w-4" />
                      </a>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-gray-500">
                        Pickup:
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${scheduleDetailDialog.learner.address_lat},${scheduleDetailDialog.learner.address_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 underline hover:text-blue-800"
                      >
                        {scheduleDetailDialog.learner.pick_up_location}
                        <ExternalLinkIcon className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setScheduleDetailDialog((prev) => ({ ...prev, open: false }))
              }
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson Plan Dialog */}
      <Dialog
        open={lessonPlanDialog.open}
        onOpenChange={(open) =>
          setLessonPlanDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="h-[90vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              Lesson Plan
            </DialogTitle>
            <DialogDescription>
              Detailed lesson plan for {lessonPlanDialog.learner?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="h-full overflow-auto">
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
    </div>
  );
}

export default Instructor;
