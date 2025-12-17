import { Delete, Mail, RefreshCcw, Send, UserPlus } from "lucide-react";
import React, { useEffect, useState } from "react";

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
import { IncompletePaymentsCard } from "./IncompletePaymentsCard";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { addDays, format, formatDate, parse } from "date-fns";
import Schedule from "../schedule";

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
          {/* Class Schedule */}
          <LearnerNotificationCard />
        </div>
      </div>
    </div>
  );
}

function LearnerNotificationCard() {
  const [incompletePayments, setIncompletePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schedulesList, setSchedulesList] = useState([]);
  const [reschduleFinalTimeSetDialogOpen, setReschduleFinalTimeSetDialogOpen] = useState(false);
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
      setSendingLearnerLessonReminderStatuses((prev) => ({ ...prev, [schedule.id]: false }));
      
      const displayStartTime = schedule.start_time 
                                ? format(
                                    parse(schedule.start_time.slice(0, 5), 'HH:mm', new Date()), // Parse 'HH:mm'
                                    'h:mm a' // Format to 12-hour time with AM/PM (e.g., "2:30 PM")
                                  )
                                : 'NA';
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
          course_name: schedule.Courses.name,
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
          description:  "Failed to send lesson reminder to learner",
          variant: "destructive",
        });
      } finally {
        setSendingLearnerLessonReminderStatuses((prev) => ({ ...prev, [schedule.id]: false }));
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
      setSendingLearnerReschdWindowReminderStatuses((prev) => ({ ...prev, [schedule.id]: false }));
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
        console.error("Error sending lesson reschedule window closing reminder to learner:", err);
        toast({
          title: "Error",
          description:  "Failed to send lesson reschedule window closing reminder to learner",
          variant: "destructive",
        });
      } finally {
        setSendingLearnerReschdWindowReminderStatuses((prev) => ({ ...prev, [schedule.id]: false }));
      }
      // break;
    }
  };

  const sendInstrReminderLesson = async (scheduleData) => {
    if (!scheduleData) {
      alert("No schedules info");
      return;
    }
    console.log("All schedules to be sent", scheduleData);
    // The max number of schedules to include in one bulk message (field1 to field9)
    const maxFields = 5;
    const count = Array.isArray(scheduleData) ? scheduleData.length : 0;
    
    // --- Start Batch Processing ---

    // Iterate through the scheduleData in batches of size maxFields
    for (let batchStart = 0; batchStart < count; batchStart += maxFields) {
      const batchSchedules = scheduleData.slice(batchStart, batchStart + maxFields);
      
      const schedulePacket: Record<string, string> = {};

      // 1. Build schedulePacket for the current batch
      for (let i = 0; i < maxFields; i++) {
        const sch = batchSchedules[i]; // Use the schedule from the current batch
        
        if (sch) {
          // Construct the detailed schedule string for this field
          const startTime = sch.start_time 
                              ? format(
                                  parse(sch.start_time.slice(0, 5), 'HH:mm', new Date()), // Parse the 'HH:mm' part of the string
                                  'h:mm a' // Format to 12-hour time with AM/PM (e.g., "2:30 PM")
                                )
                              : startTime;
          const date = sch.date 
                  ? format(sch.date, 'dd MMM, yyyy') // Transformation: '2025-12-15' -> '15 Dec, 2025'
                  : date;
          const learnerName = sch.Learner?.name ?? "NA";
          const learnerPhone = sch.Learner?.phone ?? "NA";
          const pickupLocation = (sch.Learner?.address_lat && sch.Learner?.address_lng)
            ? `https://maps.google.com/maps?q=${sch.Learner?.address_lat},${sch.Learner?.address_lng}`
            : "NA";
          const lessonNumber = sch.Lesson?.number ?? "NA";
          
          schedulePacket[`field${i + 1}`] = 
            `${date} | ${startTime} | ${learnerName}'s ${lessonNumber}th lesson with Lane | ${learnerPhone} | ${pickupLocation}`;
            
          // Reset status for all schedules in the current batch before trying to send
          // Assuming setSendingInstrLessonReminderStatuses is meant to track 
          // the sending status of each individual schedule ID, we only do this 
          // for schedules actually included in the batch.
          setSendingInstrLessonReminderStatuses((prev) => ({ ...prev, [sch.id]: false }));
        } else {
          // Fill remaining fields in the packet with a space/empty line
          schedulePacket[`field${i + 1}`] = " ";
        }
      }
      
      // Check if the current batch is empty (shouldn't happen if batchStart < count)
      if (Object.keys(schedulePacket).length === 0) continue; 
      
      const schedulesPacket = JSON.stringify(schedulePacket);
      console.log(`schedulePacket for batch starting at index ${batchStart}:`, schedulePacket);

      // Send the bulk message for the current batch
      // We assume all schedules in a batch are for the SAME Instructor
      // and use the Instructor details from the first schedule in the batch.
      const firstScheduleInBatch = batchSchedules[0];

      if (!firstScheduleInBatch || !firstScheduleInBatch.Instructor) {
          console.error(`Missing instructor data for batch starting at index ${batchStart}. Skipping batch.`);
          continue;
      }
      
      console.log(`Sending Instructor reminder for batch (schedules ${batchStart + 1} to ${batchStart + batchSchedules.length})`);

      try {
          const { error } = await supabase.functions.invoke("send-message", {
            body: {
              message_type: "REMINDER_INSTRUCTOR_FOR_CLASS_FINAL",
              // Pull required data from the Instructor of the first schedule in the batch
              instructor_name: firstScheduleInBatch.Instructor?.name ?? "",
              instructor_phone: firstScheduleInBatch.Instructor?.phone ?? "",

              // Map the schedule fields from the current schedulePacket
              arg1: schedulePacket['field1'] ?? " ",
              arg2: schedulePacket['field2'] ?? " ",
              arg3: schedulePacket['field3'] ?? " ",
              arg4: schedulePacket['field4'] ?? " ",
              arg5: schedulePacket['field5'] ?? " ",
              // arg6: schedulePacket['field6'] ?? " ",
              // arg7: schedulePacket['field7'] ?? " ",
              // arg8: schedulePacket['field8'] ?? " ",
              // arg9: schedulePacket['field9'] ?? " ",
              // arg10 is not used as maxFields is 9
            },
          });

          if (error) throw error;
          
          // Success Toast for the whole batch
          const learnersInBatch = batchSchedules.map(sch => sch?.Learner?.name).filter(name => name);
          toast({
            title: "Success",
            description: `Lesson reminder sent to instructor for ${learnersInBatch.length} schedules.`,
          });

        } catch (err) {
          console.error("Error sending lesson reminder to instructor for batch:", err);
          toast({
            title: "Error",
            description: "Failed to send lesson reminder to instructor for a batch",
            variant: "destructive",
          });
        } finally {
          // Update statuses for all schedules in the current batch
          batchSchedules.filter(sch => sch).forEach(sch => {
              setSendingInstrLessonReminderStatuses((prev) => ({ ...prev, [sch.id]: false }));
          });
        }
    } // --- End Batch Processing ---
  };

  const checkAtleastOneStatusToValue = (statusList, value) => {
    // console.log(statusList);
    if (!statusList) return false;
    return Object.values(statusList).some((status) => status === value);
  }
  
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
  }

  const handleSendScheduleEmail = async (scheduleData) => {
    // Disable button for this specific row
    setSendingEmailId(scheduleData.id);

    // Safely extract values from scheduleData
    const instructorEmail = scheduleData.Instructor?.email || "";
    const learnerEmail = scheduleData.Learner?.email || "";
    const lessonId = scheduleData.Lesson?.number || scheduleData.Lesson?.description || "N/A";
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
      const { error } = await supabase.functions.invoke("send-schedule-emails", {
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
          events: [{
            lessonNumber: scheduleData.Lesson?.number || 1,
            startTime: new Date(`${scheduleData.date}T${scheduleData.start_time}`).toISOString(),
            endTime: new Date(`${scheduleData.date}T${scheduleData.end_time}`).toISOString(),
            pickupLocation: scheduleData.Learner?.pick_up_location || "Standard Location",
            uid: `lesson-${scheduleData.id}`,
            isCancellation: false,
            sequence: 0,
          }],
          allEvents: [],
          learnerICSArray: [],
          instructorICSArray: [],
        },
      });

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
          <CardTitle className="text-xl">Class schedules for the next {maxDaysWindowToFetch} days</CardTitle>
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
              disabled={
                  checkAtleastOneStatusToValue(sendingLearnerLessonReminderStatuses, true)
              }
              className="whitespace-nowrap"
              >
              {checkAtleastOneStatusToValue(sendingLearnerLessonReminderStatuses, true) ? (
                  <RefreshCcw
                      size={14}
                      className="mr-1 animate-spin"
                  />
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
              disabled={checkAtleastOneStatusToValue(sendingLearnerReschdWindowReminderStatuses, true)}
              className="whitespace-nowrap"
          >
              {checkAtleastOneStatusToValue(sendingLearnerReschdWindowReminderStatuses, true) ? (
                  <RefreshCcw
                      size={14}
                      className="mr-1 animate-spin"
                  />
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
              disabled={checkAtleastOneStatusToValue(sendingInstrLessonReminderStatuses, true)}
              className="whitespace-nowrap"
          >
              {checkAtleastOneStatusToValue(sendingInstrLessonReminderStatuses, true) ? (
                  <RefreshCcw
                      size={14}
                      className="mr-1 animate-spin"
                  />
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
              : `No schedules found for next ${maxDaysWindowToFetch} days`
            }
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left text-xs font-semibold uppercase">Learner</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold uppercase">Course</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold uppercase">Instructor</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold uppercase">Date</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold uppercase">Time</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {schedulesList.map((scheduleData) => (
                  <tr key={scheduleData.id} className="border-b hover:bg-muted/50">
                    <td className="px-2 py-2">
                      <div className="font-medium">{scheduleData.Learner?.name || "Unknown"}</div>
                    </td>
                    <td className="px-2 py-2 text-sm">
                      <div>{scheduleData.Lesson?.description || "Unknown Lesson"}</div>
                      <div className="text-xs text-gray-500">{scheduleData.Courses?.name || "Unknown Course"}</div>
                    </td>
                    <td className="px-2 py-2 text-sm">
                      {scheduleData.Instructor?.name || "Unknown"}
                    </td>
                    <td className="px-2 py-2 text-right text-sm">
                      {scheduleData.date || "Unknown"}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className="text-xs">
                        {scheduleData.start_time ? scheduleData.start_time.split(':').slice(0, 2).join(':') : "N/A"}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right">
                    <Button
                      size="sm"
                      onClick={() => handleSendScheduleEmail(scheduleData)}
                      disabled={sendingEmailId === scheduleData.id}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 text-[9px] py-1 px-2 h-auto min-h-[28px] whitespace-normal leading-[1.1] text-center inline-flex items-center justify-center max-w-[120px]"
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
        <Button onClick={handleRescheduleFinalTimeClose} variant="secondary">
          Close
        </Button>
        <Button onClick={async () => {await handleRescheduleFinalTimeSave() ;}}>Save</Button>
      </DialogFooter>
    </DialogContent>
      
    </Dialog>
    </div>
  );
}
