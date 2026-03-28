import { useMutation, useQuery } from "@tanstack/react-query";
import { addDays, format, formatDate, parse } from "date-fns";
import { Delete, Mail, RefreshCcw, Search, Send, UserPlus } from "lucide-react";
import { ArrowLeft, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

import Schedule from "../schedule";
import { IncompletePaymentsCard } from "./IncompletePaymentsCard";

export default function NotificationManagement() {
  const [learnerData, setLearnerData] = useState({
    name: "",
    email: "",
    phone: "",
    courseId: "",
    courseName: "",
    amount: 0,
    installmentType: "installment", // Default to installment
    installment1Amount: 0,
    installment2Amount: 0,
    unlockedLessons: [],
    has_a_DL: false,
    address_change_required: false,
  });

  const navigate = useNavigate();

  // There are 3 types of notifications
  // Next day lesson reminder
  // Reschedule closing window time reminder
  // Reminder message to be sent to instructor after reschedule
  return (
    <div
      className="min-h-screen bg-white p-8"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
        backgroundAttachment: "fixed", // This prevents the background from getting cut off
      }}
    >
      <div className="container mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-4xl font-bold tracking-tight">
            Daily Notification Management
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Set reminders and send daily notifications to learners
          </p>
        </div>

        <div className="grid gap-6">
          {/* Individual Notification */}
          <IndividualNotificationCard />
          {/* Class Schedule */}
          <LearnerNotificationCard />
        </div>
      </div>
    </div>
  );
}

// Templates that make sense for individual sending (no extra variables needed beyond learner name)
const LEARNER_TEMPLATES = [
  { key: "SIGN_UP_ON_APP", label: "Sign Up on App Reminder" },
  { key: "LL_DETAILS_BOOK_APPOINTMENT", label: "LL Details - Book Appointment" },
  { key: "LL_APPLICATION_UPDATE", label: "LL Application Update" },
  { key: "LL_RECEIVED", label: "LL Received - Share Availability" },
  { key: "SIGN_UP_DONE_NEED_SCHEDULE", label: "Sign Up Done - Need Schedule" },
  { key: "THANKS_FOR_AVAILABILITY", label: "Thanks for Availability" },
  { key: "WEBAPP_RESCHEDULE_REQUEST", label: "Reschedule Request Received" },
  { key: "WEBAPP_RESCHEDULE_DONE_CHECK_NEW_SCHEDULE", label: "Reschedule Done - Check New Schedule" },
  { key: "WEBAPP_SCHEDULE_LESSON_10", label: "Schedule Lesson 10" },
  { key: "WEBAPP_LESSON_10_SCHEDULED", label: "Lesson 10 Scheduled" },
  { key: "WEBAPP_DL_TEST_NOT_PASSED_IT_IS_ALRIGHT", label: "DL Test Not Passed - Encouragement" },
  { key: "WEBAPP_CONGRATULATIONS_ON_PASSING_THE_DL_TEST", label: "Congratulations on DL Test" },
  { key: "WEBAPP_LESSONS_DONE_REVIEW_PLEASE", label: "Lessons Done - Review Request" },
  { key: "WEBAPP_THANK_YOU_FOR_SIGNING_UP_LL_FIRST", label: "Thank You for Signing Up (LL First)" },
  { key: "WEBAPP_THANK_YOU_SIGNUP_AVAILABILTY_FOR_LESSONS", label: "Thank You - Availability for Lessons" },
  { key: "WEBAPP_RESTEST_LL", label: "LL Retest Encouragement" },
  { key: "WEBAPP_LL_DOCS_APPROVED_TEST_DONE_AND_RESULT", label: "LL Docs Approved - Test Done" },
  { key: "WEBAPP_PLEASE_FILL_LL_FORM_AND_BOOK_APPOINTMENT", label: "Please Fill LL Form & Book Appointment" },
];

function IndividualNotificationCard() {
  const { toast } = useToast();
  const [recipientType, setRecipientType] = useState<"learner" | "instructor">("learner");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, failed: 0, total: 0 });

  // Search learners
  const { data: learnerResults, isLoading: searchingLearners } = useQuery({
    queryKey: ["search-learners", searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Learner")
        .select("id, name, phone")
        .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: recipientType === "learner" && searchQuery.length >= 2,
  });

  // Search instructors
  const { data: instructorResults, isLoading: searchingInstructors } = useQuery({
    queryKey: ["search-instructors", searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Instructor")
        .select("id_instructor, name, phone")
        .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: recipientType === "instructor" && searchQuery.length >= 2,
  });

  const searchResults = recipientType === "learner" ? learnerResults : instructorResults;
  const isSearching = recipientType === "learner" ? searchingLearners : searchingInstructors;

  const getPersonId = (person: any) =>
    recipientType === "learner" ? person.id : person.id_instructor;

  const isAlreadySelected = (person: any) =>
    selectedPeople.some((p) => getPersonId(p) === getPersonId(person));

  const addPerson = (person: any) => {
    if (!isAlreadySelected(person)) {
      setSelectedPeople((prev) => [...prev, person]);
    }
    setSearchQuery("");
  };

  const removePerson = (person: any) => {
    setSelectedPeople((prev) =>
      prev.filter((p) => getPersonId(p) !== getPersonId(person)),
    );
  };

  const handleSendNotification = async () => {
    if (selectedPeople.length === 0 || !selectedTemplate) {
      toast({
        title: "Missing info",
        description: "Please select at least one person and a template",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    const progress = { sent: 0, failed: 0, total: selectedPeople.length };
    setSendProgress(progress);

    for (const person of selectedPeople) {
      try {
        const learnerId = getPersonId(person);
        const { error } = await supabase.functions.invoke("send-message", {
          body: {
            message_type: selectedTemplate,
            learner_id: learnerId,
          },
        });
        if (error) throw error;
        progress.sent++;
      } catch (err) {
        console.error(`Error sending to ${person.name}:`, err);
        progress.failed++;
      }
      setSendProgress({ ...progress });
    }

    setIsSending(false);
    toast({
      title: "Done",
      description: `Sent: ${progress.sent}, Failed: ${progress.failed} out of ${progress.total}`,
      variant: progress.failed > 0 ? "destructive" : undefined,
    });
    setSelectedTemplate("");
  };

  return (
    <Card className="transition-all hover:shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Send Notification</CardTitle>
        <p className="text-sm text-muted-foreground">
          Send a WhatsApp notification to one or more learners / instructors
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recipient type toggle */}
        <div className="flex gap-2">
          <Button
            variant={recipientType === "learner" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setRecipientType("learner");
              setSelectedPeople([]);
              setSearchQuery("");
            }}
          >
            Learner
          </Button>
          <Button
            variant={recipientType === "instructor" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setRecipientType("instructor");
              setSelectedPeople([]);
              setSearchQuery("");
            }}
          >
            Instructor
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search ${recipientType} by name or phone...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Search results dropdown */}
        {searchQuery.length >= 2 && (
          <div className="max-h-48 overflow-y-auto rounded-md border">
            {isSearching ? (
              <div className="flex items-center justify-center p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              searchResults.map((person: any) => {
                const alreadySelected = isAlreadySelected(person);
                return (
                  <button
                    key={person.id || person.id_instructor}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                      alreadySelected
                        ? "bg-green-50 text-green-700"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => !alreadySelected && addPerson(person)}
                    disabled={alreadySelected}
                  >
                    <span className="font-medium">{person.name}</span>
                    <span className="text-muted-foreground">
                      {alreadySelected ? "Added" : person.phone}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="p-3 text-center text-sm text-muted-foreground">
                No results found
              </p>
            )}
          </div>
        )}

        {/* Selected people chips */}
        {selectedPeople.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Selected ({selectedPeople.length})
              </span>
              <button
                className="text-xs text-red-500 hover:text-red-700"
                onClick={() => setSelectedPeople([])}
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedPeople.map((person) => (
                <span
                  key={getPersonId(person)}
                  className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700"
                >
                  {person.name}
                  <button
                    className="ml-1 text-green-500 hover:text-green-800"
                    onClick={() => removePerson(person)}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Template selection */}
        <div>
          <Label className="mb-2 block text-sm font-medium">
            Notification Template
          </Label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger>
              <SelectValue placeholder="Select a template..." />
            </SelectTrigger>
            <SelectContent>
              {LEARNER_TEMPLATES.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Progress bar while sending */}
        {isSending && (
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100}%`,
                }}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {sendProgress.sent + sendProgress.failed} / {sendProgress.total} sent
            </p>
          </div>
        )}

        {/* Send button */}
        <Button
          onClick={handleSendNotification}
          disabled={selectedPeople.length === 0 || !selectedTemplate || isSending}
          className="w-full"
        >
          {isSending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending {sendProgress.sent + sendProgress.failed}/{sendProgress.total}...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Send to {selectedPeople.length || ""} {recipientType}{selectedPeople.length !== 1 ? "s" : ""}
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function LearnerNotificationCard() {
  const [incompletePayments, setIncompletePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schedulesList, setSchedulesList] = useState([]);
  const [reschduleFinalTimeSetDialogOpen, setReschduleFinalTimeSetDialogOpen] =
    useState(false);
  const [rescheduleFinalTime, setRescheduleFinalTime] = useState("");

  const maxDaysWindowToFetch = 1;
  // Array of status of each sending event
  // Each state corresponsds to reminder type
  // Each state's is an array corresponding to the number of schedules
  const [
    sendingLearnerLessonReminderStatuses,
    setSendingLearnerLessonReminderStatuses,
  ] = useState({});
  const [
    sendingLearnerReschdWindowReminderStatuses,
    setSendingLearnerReschdWindowReminderStatuses,
  ] = useState({});
  const [
    sendingInstrLessonReminderStatuses,
    setSendingInstrLessonReminderStatuses,
  ] = useState({});

  const [sendingEmailId, setSendingEmailId] = useState(null);
  const { toast } = useToast();

  const fetchSchedulesForReminder = async () => {
    const startDate = new Date();
    const endDate = addDays(startDate, maxDaysWindowToFetch);
    setLoading(true);
    try {
      // Query to get schedules of next maxDaysWindowToFetch days
      const { data, error } = await supabase
        .from("Schedule")
        .select(
          `
          *,
          Learner(name, phone, email, pick_up_location, address_lat, address_lng),
          Instructor(name, phone, email),
          Courses(name, duration), 
          Lesson(description)`,
        )
        .gte("date", endDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0])
        .or("isTentative.eq.false,isTentative.is.null")
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      // console.log(data);
      if (error) throw error;

      setSchedulesList(data);
      return data;
    } catch (err) {
      console.error("Error fetching schedules:", err);
      toast({
        title: "Error",
        description: "Failed to fetch schedules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedulesForReminder();
  }, []);

  const sendLearnerReminderLesson = async (scheduleData) => {
    if (!scheduleData) {
      alert("No schedules info");
      return;
    }
    for (const schedule of scheduleData) {
      if (!schedule) continue;
      console.log("Sending reminder of schedule:", schedule);
      setSendingLearnerLessonReminderStatuses((prev) => ({
        ...prev,
        [schedule.id]: false,
      }));

      const displayStartTime = schedule.start_time
        ? format(
            parse(schedule.start_time.slice(0, 5), "HH:mm", new Date()), // Parse 'HH:mm'
            "h:mm a", // Format to 12-hour time with AM/PM (e.g., "2:30 PM")
          )
        : "NA";
      console.log("displayStartTime=", displayStartTime);

      try {
        // Query params
        // const dateString = formatDate(schedule.date);
        // const startTimeString = formatDate(schedule.start_time);
        // const learner_id = schedule.Learner?.id;
        const { error } = await supabase.functions.invoke("send-message", {
          body: {
            message_type: "REMINDER_CUSTOMER_FOR_CLASS_FINAL",
            learner_name: schedule.Learner.name,
            learner_phone: schedule.Learner.phone,
            start_time: displayStartTime,
            pickup_location: schedule.Learner.pick_up_location,
            instructor_name: schedule.Instructor.name,
            instructor_phone: schedule.Instructor.phone,
            course_name: schedule.Courses?.name || "Demo Class",
          },
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: `Lesson reminder sent to ${schedule.Learner.name} successfully`,
        });
      } catch (err) {
        console.error("Error sending lesson reminder to learner:", err);
        toast({
          title: "Error",
          description: "Failed to send lesson reminder to learner",
          variant: "destructive",
        });
      } finally {
        setSendingLearnerLessonReminderStatuses((prev) => ({
          ...prev,
          [schedule.id]: false,
        }));
      }
      // break;
    }
  };

  const sendLearnerReminderRescheduleWindow = async (scheduleData) => {
    if (!scheduleData) {
      alert("No schedules info");
      return;
    }
    if (!rescheduleFinalTime) {
      toast.failure("No reschedule window time set");
      return;
    }
    for (const schedule of scheduleData) {
      if (!schedule) continue;
      setSendingLearnerReschdWindowReminderStatuses((prev) => ({
        ...prev,
        [schedule.id]: false,
      }));
      // console.log("Sending Rescheudle reminder for schedule ", schedule, rescheduleFinalTime);
      try {
        const { error } = await supabase.functions.invoke("send-message", {
          body: {
            message_type: "REMINDER_LESSON_RESCHEDULE_WINDOW_TIME",
            learner_name: schedule.Learner.name,
            learner_phone: schedule.Learner.phone,
            final_time: rescheduleFinalTime,
          },
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: `Lesson Reschedule window closing reminder sent to ${schedule.Learner.name} successfully`,
        });
      } catch (err) {
        console.error(
          "Error sending lesson reschedule window closing reminder to learner:",
          err,
        );
        toast({
          title: "Error",
          description:
            "Failed to send lesson reschedule window closing reminder to learner",
          variant: "destructive",
        });
      } finally {
        setSendingLearnerReschdWindowReminderStatuses((prev) => ({
          ...prev,
          [schedule.id]: false,
        }));
      }
      // break;
    }
  };

  const sendInstrReminderLesson = async (scheduleData) => {
    // --- CONFIGURATION ---
    const isTestMode = false; // Toggle this to false for live production
    const maxFields = 5;
    // ---------------------

    if (!scheduleData || scheduleData.length === 0) {
      console.warn("⚠️ No schedule data provided.");
      return;
    }

    console.group("🚀 Instructor Reminder Debugger");
    console.log(
      `Status: ${isTestMode ? "🧪 TEST MODE (API Blocked)" : "🌐 LIVE MODE"}`,
    );

    // 1. Grouping Logic
    const groupedByInstructor = scheduleData.reduce((acc, sch) => {
      const instId = sch.instructor_id || "unknown";
      const instName = sch.Instructor?.name || "Unknown Instructor";

      if (!acc[instId]) {
        acc[instId] = {
          name: instName,
          phone: sch.Instructor?.phone || "",
          schedules: [],
        };
      }

      acc[instId].schedules.push(sch);
      return acc;
    }, {});

    const instructorIds = Object.keys(groupedByInstructor);

    // 2. Iterate through each Instructor Group
    for (const id of instructorIds) {
      const { name, phone, schedules } = groupedByInstructor[id];
      const totalBatches = Math.ceil(schedules.length / maxFields);

      console.group(`👤 Processing: ${name}`);

      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        const batchSchedules = schedules.slice(
          batchIdx * maxFields,
          (batchIdx + 1) * maxFields,
        );
        const schedulePacket = {};

        for (let i = 0; i < maxFields; i++) {
          const sch = batchSchedules[i];
          if (sch) {
            setSendingInstrLessonReminderStatuses?.((prev) => ({
              ...prev,
              [sch.id]: true,
            }));

            const formatTime = (timeStr) => {
              if (!timeStr) return "??";
              return format(
                parse(timeStr.slice(0, 5), "HH:mm", new Date()),
                "h:mm a",
              );
            };

            const startTime = formatTime(sch.start_time);
            const endTime = formatTime(sch.end_time);
            const date = sch.date ? format(new Date(sch.date), "dd MMM") : "NA";
            const learnerName = sch.Learner?.name ?? "Learner";
            const learnerPhone = sch.Learner?.phone ?? "N/A";
            const lessonDesc = sch.Lesson?.description ?? "Lesson";

            const lat = sch.Learner?.address_lat;
            const lng = sch.Learner?.address_lng;

            const mapLink =
              lat && lng ? `http://maps.google.com/maps?q=${lat},${lng}` : "NA";

            schedulePacket[`field${i + 1}`] =
              `${date} | ${startTime}-${endTime} | ${learnerName} ${learnerPhone} (${lessonDesc}) | ${mapLink}`;
          } else {
            schedulePacket[`field${i + 1}`] = " ";
          }
        }

        const payload = {
          message_type: "REMINDER_INSTRUCTOR_FOR_CLASS_FINAL",
          instructor_name: name,
          instructor_phone: phone,
          arg1: schedulePacket.field1,
          arg2: schedulePacket.field2,
          arg3: schedulePacket.field3,
          arg4: schedulePacket.field4,
          arg5: schedulePacket.field5,
        };

        try {
          if (isTestMode) {
            console.log(`🧪 [TEST] Payload for ${name}:`, payload);
          } else {
            const { error } = await supabase.functions.invoke("send-message", {
              body: payload,
            });
            if (error) throw error;
            console.log(`✅ [LIVE] Sent to ${name}`);
          }
        } catch (err) {
          console.error(`❌ Error sending to ${name}:`, err);
        } finally {
          batchSchedules.forEach((sch) => {
            setSendingInstrLessonReminderStatuses?.((prev) => ({
              ...prev,
              [sch.id]: false,
            }));
          });
        }
      }
      console.groupEnd();
    }

    console.groupEnd();
    toast({
      title: isTestMode ? "Test Finished" : "Success",
      description: `Reminders processed for ${instructorIds.length} instructors.`,
    });
  };

  const checkAtleastOneStatusToValue = (statusList, value) => {
    // console.log(statusList);
    if (!statusList) return false;
    return Object.values(statusList).some((status) => status === value);
  };

  // Dialog functionality
  const handleRescheduleFinalTimeSave = async () => {
    // console.log("Rechsdule window time set to  ", rescheduleFinalTime);
    setReschduleFinalTimeSetDialogOpen(false);
    await sendLearnerReminderRescheduleWindow(schedulesList);
    setRescheduleFinalTime("");
    // console.log("Rechsdule window time reset to  ", rescheduleFinalTime);
  };
  const handleRescheduleFinalTimeClose = () => {
    setReschduleFinalTimeSetDialogOpen(false);
  };

  const handleSendScheduleEmail = async (scheduleData) => {
    // Disable button for this specific row
    setSendingEmailId(scheduleData.id);

    // Safely extract values from scheduleData
    const instructorEmail = scheduleData.Instructor?.email || "";
    const learnerEmail = scheduleData.Learner?.email || "";
    const lessonId =
      scheduleData.Lesson?.number || scheduleData.Lesson?.description || "N/A";
    const learnerName = scheduleData.Learner?.name || "Unknown Learner";

    console.log(`[EMAIL_ATTEMPT] Lesson: ${lessonId}, Learner: ${learnerName}`);

    // Validation before calling the Edge Function
    if (!instructorEmail || !learnerEmail) {
      toast({
        title: "Email Failed",
        description: `Missing email for ${!instructorEmail ? "Instructor" : "Learner"}.`,
        variant: "destructive",
      });
      setSendingEmailId(null);
      return;
    }

    try {
      const { error } = await supabase.functions.invoke(
        "send-schedule-emails",
        {
          body: {
            learnerEmail: learnerEmail,
            instructorEmail: instructorEmail,
            instructorName: scheduleData.Instructor?.name || "Instructor",
            learnerName: learnerName,
            learnerPhone: scheduleData.Learner?.phone || "",
            emailType: "schedule",
            batchInfo: ` (Lesson ${lessonId})`,
            learnerId: scheduleData.learner_id,
            isMultiEvent: false,
            events: [
              {
                lessonNumber: scheduleData.Lesson?.number || 1,
                startTime: new Date(
                  `${scheduleData.date}T${scheduleData.start_time}`,
                ).toISOString(),
                endTime: new Date(
                  `${scheduleData.date}T${scheduleData.end_time}`,
                ).toISOString(),
                pickupLocation:
                  scheduleData.Learner?.pick_up_location || "Standard Location",
                uid: `lesson-${scheduleData.id}`,
                isCancellation: false,
                sequence: 0,
              },
            ],
            allEvents: [],
            learnerICSArray: [],
            instructorICSArray: [],
          },
        },
      );

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: `Schedule for Lesson ${lessonId} sent to ${learnerName}`,
        variant: "success",
      });
    } catch (error) {
      console.error(`[EMAIL_ERROR]`, error);
      toast({
        title: "Email Failed",
        description: "Server error while processing email addresses.",
        variant: "destructive",
      });
    } finally {
      // Re-enable the button
      setSendingEmailId(null);
    }
  };
  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
      }}
    >
      <Card className="mt-6 transition-all hover:shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">
              Class schedules for the next {maxDaysWindowToFetch} days
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchSchedulesForReminder}
            disabled={loading}
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
        </CardHeader>
        <CardContent>
          {
            // Add buttons for bulk messaging
            <div className="flex flex-row space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendLearnerReminderLesson(schedulesList)}
                disabled={checkAtleastOneStatusToValue(
                  sendingLearnerLessonReminderStatuses,
                  true,
                )}
                className="whitespace-nowrap"
              >
                {checkAtleastOneStatusToValue(
                  sendingLearnerLessonReminderStatuses,
                  true,
                ) ? (
                  <RefreshCcw size={14} className="mr-1 animate-spin" />
                ) : (
                  <Send size={14} className="mr-1" />
                )}
                Send Lesson reminders to Learners
              </Button>

              {/* // Button 2 - Reschedule window cut-off time reminder */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReschduleFinalTimeSetDialogOpen(true)}
                disabled={checkAtleastOneStatusToValue(
                  sendingLearnerReschdWindowReminderStatuses,
                  true,
                )}
                className="whitespace-nowrap"
              >
                {checkAtleastOneStatusToValue(
                  sendingLearnerReschdWindowReminderStatuses,
                  true,
                ) ? (
                  <RefreshCcw size={14} className="mr-1 animate-spin" />
                ) : (
                  <Send size={14} className="mr-1" />
                )}
                Send Reschedule window reminder to Learners
              </Button>

              {/* // Button 3 - Instuctor reminder after reschedule confirmation */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendInstrReminderLesson(schedulesList)}
                disabled={checkAtleastOneStatusToValue(
                  sendingInstrLessonReminderStatuses,
                  true,
                )}
                className="whitespace-nowrap"
              >
                {checkAtleastOneStatusToValue(
                  sendingInstrLessonReminderStatuses,
                  true,
                ) ? (
                  <RefreshCcw size={14} className="mr-1 animate-spin" />
                ) : (
                  <Send size={14} className="mr-1" />
                )}
                Send Lesson Reminders to Instructors
              </Button>
            </div>
          }
          {schedulesList.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              {loading
                ? "Loading schedules..."
                : `No schedules found for next ${maxDaysWindowToFetch} days`}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase">
                      Learner
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase">
                      Course
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase">
                      Instructor
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-semibold uppercase">
                      Date
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-semibold uppercase">
                      Time
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-semibold uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {schedulesList.map((scheduleData) => (
                    <tr
                      key={scheduleData.id}
                      className="border-b hover:bg-muted/50"
                    >
                      <td className="px-2 py-2">
                        <div className="font-medium">
                          {scheduleData.Learner?.name || "Unknown"}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-sm">
                        <div>
                          {scheduleData.Lesson?.description || "Unknown Lesson"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {scheduleData.Courses?.name || "Demo Class"}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-sm">
                        {scheduleData.Instructor?.name || "Unknown"}
                      </td>
                      <td className="px-2 py-2 text-right text-sm">
                        {scheduleData.date || "Unknown"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-xs">
                          {scheduleData.start_time
                            ? scheduleData.start_time
                                .split(":")
                                .slice(0, 2)
                                .join(":")
                            : "N/A"}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleSendScheduleEmail(scheduleData)}
                          disabled={sendingEmailId === scheduleData.id}
                          className="inline-flex h-auto min-h-[28px] max-w-[120px] items-center justify-center whitespace-normal bg-primary px-2 py-1 text-center text-[9px] leading-[1.1] text-primary-foreground hover:bg-primary/90"
                        >
                          {sendingEmailId === scheduleData.id ? (
                            <span className="flex items-center gap-1">
                              <Loader2 size={8} className="animate-spin" />
                              Sending...
                            </span>
                          ) : (
                            "Send Schedule Email to Learner and Instructor"
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={reschduleFinalTimeSetDialogOpen}
        onOpenChange={setReschduleFinalTimeSetDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter Reschedule Final time</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="app-number" className="text-right">
                Final time
              </Label>
              <Input
                id="app-number"
                value={rescheduleFinalTime}
                onChange={(e) => setRescheduleFinalTime(e.target.value)}
                maxLength={32}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleRescheduleFinalTimeClose}
              variant="secondary"
            >
              Close
            </Button>
            <Button
              onClick={async () => {
                await handleRescheduleFinalTimeSave();
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
