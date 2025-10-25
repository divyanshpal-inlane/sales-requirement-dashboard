import { Delete, RefreshCcw, Send, UserPlus } from "lucide-react";
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
import { ArrowLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { addDays, formatDate } from "date-fns";
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
          Learner(name, phone, pick_up_location), 
          Instructor(name, phone),
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
          start_time: schedule.start_time,
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
    for (const schedule of scheduleData) {
      if (!schedule) continue;
      setSendingLearnerReschdWindowReminderStatuses((prev) => ({ ...prev, [schedule.id]: false }));
      console.log("Sending Rescheudle reminder for schedule ", schedule);
        try {
          const { error } = await supabase.functions.invoke("send-message", {
          body: {
            message_type: "REMINDER_LESSON_RESCHEDULE_WINDOW_TIME",
            learner_name: schedule.Learner.name,
            learner_phone: schedule.Learner.phone,
            final_time: "6PM",
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
    // Build schedulePacket with keys field1..field10.
    // If fewer than 9 schedules, remaining fields are "\n".
    // If more than 9 schedules, fill first 10 and then throw an error.
    const maxFields = 9;
    const schedulePacket: Record<string, string> = {};
    const count = Array.isArray(scheduleData) ? scheduleData.length : 0;

    for (let i = 0; i < maxFields; i++) {
      const sch = scheduleData[i];
      if (sch) {
        const startTime = sch.start_time ?? "NA";
        const date = sch.date ?? "NA";
        const learnerName = sch.Learner?.name ?? "NA";
        const learnerPhone = sch.Learner?.phone ?? "NA";
        const pickupLocation = sch.Learner?.pick_up_location ?? "NA";
        const lessonNumber = sch.Lesson?.number ?? "NA";
        schedulePacket[`field${i + 1}`] = `${date} | ${startTime} | ${learnerName}'s ${lessonNumber}th lesson with Lane | ${learnerPhone} | ${pickupLocation}`;
      } else {
        schedulePacket[`field${i + 1}`] = " ";
      }
    }

    const schedulesPacket = JSON.stringify(schedulePacket);
    console.log("schedulePacket:", schedulePacket);

    if (count > maxFields) {
      console.error(`Too many schedules: ${count} > ${maxFields}. Only the first ${maxFields} were used.`);
      // throw new Error(`Cannot process more than ${maxFields} schedules`);
    }
    for (const schedule of scheduleData) {
      if (!schedule) continue;
      setSendingInstrLessonReminderStatuses((prev) => ({ ...prev, [schedule.id]: false }));
      console.log("Sending Instructor reminder for schedule ", schedule);
        try {
          const { error } = await supabase.functions.invoke("send-message", {
            body: {
              message_type: "REMINDER_INSTRUCTOR_FOR_CLASS_FINAL",
              // pull required data from schedule.Instructor
              instructor_name: schedule.Instructor?.name ?? "",
              instructor_phone: schedule.Instructor?.phone ?? "",

              // map the rest of the instructor fields into arg1..arg10
              arg1:  schedulePacket['field1'] ?? " ",
              arg2:  schedulePacket['field2'] ?? " ",
              arg3:  schedulePacket['field3'] ?? " ",
              arg4:  schedulePacket['field4'] ?? " ",
              arg5:  schedulePacket['field5'] ?? " ",
              arg6:  schedulePacket['field6'] ?? " ",
              arg7:  schedulePacket['field7'] ?? " ",
              arg8:  schedulePacket['field8'] ?? " ",
              arg9:  schedulePacket['field9'] ?? " ",
              // arg10: schedulePacket['field10'] ?? " ",
            },
          });


        if (error) throw error;

        toast({
          title: "Success",
          description: `Lesson reminder sent to ${schedule.Learner.name} successfully`,
        });

      } catch (err) {
        console.error("Error sending lesson reminder to instructor:", err);
        toast({
          title: "Error",
          description:  "Failed to send lesson reminder to instructor",
          variant: "destructive",
        });
      } finally {
        setSendingInstrLessonReminderStatuses((prev) => ({ ...prev, [schedule.id]: false }));
      }
      // break;
    }
  };

  const checkAtleastOneStatusToValue = (statusList, value) => {
    // console.log(statusList);
    if (!statusList) return false;
    return Object.values(statusList).some((status) => status === value);
  }
  
  // Dialog functionality
  const handleRescheduleFinalTimeSave = () => {
    console.log("Rechsdule window time set to  ", rescheduleFinalTime);
    sendLearnerReminderRescheduleWindow(schedulesList)
  };
  const handleRescheduleFinalTimeClose = () => {
    setReschduleFinalTimeSetDialogOpen(false);
  }
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
                  <th className="px-2 py-2 text-left">Learner</th>
                  <th className="px-2 py-2 text-left">Course</th>
                  <th className="px-2 py-2 text-left">Instructor</th>
                  <th className="px-2 py-2 text-right">Date</th>
                  <th className="px-2 py-2 text-center">Start time</th>
                </tr>
              </thead>
              <tbody>
                {schedulesList
                  .map((scheduleData) => (
                    <tr
                      key={scheduleData.id}
                      className="border-b hover:bg-muted/50"
                    >
                      <td className="px-2 py-2">
                        <div className="font-medium">
                          {scheduleData.Learner?.name || "Unknown"}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <>
                          {(scheduleData.Lesson?.description || "Unknown Lesson")}
                          <br />
                          {(scheduleData.Courses?.name || "Unknown Course")}
                        </>
                      </td>
                      <td className="px-2 py-2">
                        {scheduleData.Instructor.name || "Unknown"}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {scheduleData.date || "Unknown"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium`}
                          >
                          {
                              // Check if start_time exists before processing
                              scheduleData.start_time 
                                  // Split by colon, take the first two elements (HH and MM), and rejoin.
                                  ? scheduleData.start_time.split(':').slice(0, 2).join(':') 
                                  : "Unknown"
                          }
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>

    // Reschedule window time dialog
    
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
        <Button onClick={handleRescheduleFinalTimeSave}>Save</Button>
      </DialogFooter>
    </DialogContent>
      
    </Dialog>
    </div>
  );
}
