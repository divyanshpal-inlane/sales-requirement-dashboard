import { Delete, RefreshCcw, Send, UserPlus } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { addDays } from "date-fns";

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
  const maxDaysWindowToFetch = 2;
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
        .gte("date", startDate.toISOString().split("T")[0])
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
      alert("No schedule info");
    }
    setSendingLearnerLessonReminderStatuses((prev) => ({ ...prev, [scheduleData.id]: false }));
    try {
      // Query params
      const dateString = formatDate(scheduleData.date);
      const startTimeString = formatTime(scheduleData.start_time);
      const learner_id = scheduleData.Learner?.id;
      const { error } = await supabase.functions.invoke("send-message", {
        body: {
          message_type: "REMINDER_CUSTOMER_FOR_CLASS",
          learner_id: scheduleData.learner_id,
          schedule_id: scheduleData.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Lesson reminder sent to ${scheduleData.Learner.name} successfully!`,
      });

    } catch (err) {
      console.error("Error sending lesson reminder to learner:", err);
      toast({
        title: "Error",
        description:  "Failed to send lesson reminder to learner",
        variant: "destructive",
      });
    } finally {
      setSendingLearnerLessonReminderStatuses((prev) => ({ ...prev, [scheduleData.id]: false }));
    }
  };

  const sendLearnerReminderRescheduleWindow = async (scheduleData) => {
    setSendingLearnerReschdWindowReminderStatuses((prev) => ({ ...prev, [scheduleData.id]: false }));
    try {
      const { error } = await supabase.functions.invoke("send-message", {
        body: {
          message_type: "LESSON_RESCHEDULE_WINDOW_REMINDER_VARIABLE_TIME",
          learner_id: scheduleData.learner_id,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Lesson Reschedule window closing reminder sent to ${scheduleData.Learner.name} successfully!`,
      });

    } catch (err) {
      console.error("Error sending lesson reschedule window closing reminder to learner:", err);
      toast({
        title: "Error",
        description:  "Failed to send lesson reschedule window closing reminder to learne",
        variant: "destructive",
      });
    } finally {
      setSendingLearnerReschdWindowReminderStatuses((prev) => ({ ...prev, [scheduleData.id]: false }));
    }
  };

    const sendInstrReminderLesson = async (scheduleData) => {
    setSendingInstrLessonReminderStatuses((prev) => ({ ...prev, [scheduleData.id]: false }));
    try {
      const { error } = await supabase.functions.invoke("send-message", {
        body: {
          message_type: "REMINDER_INSTRUCTOR_FOR_CLASS_1DAY_BEFORE",
          learner_id: scheduleData.learner_id,
          course_name: enrollment.Courses.name,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Lesson reminder sent to ${enrollment.Learner.name} successfully!`,
      });

    } catch (err) {
      console.error("Error sending lesson reminder to instructor:", err);
      toast({
        title: "Error",
        description:  "Failed to send lesson reminder to instructor",
        variant: "destructive",
      });
    } finally {
      setSendingInstrLessonReminderStatuses((prev) => ({ ...prev, [enrollment.id]: false }));
    }
  };



  return (
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
                  <th className="px-2 py-2 text-center">Notify</th>
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
                      <td className="px-2 py-2 text-center">
                        {/* Button 1 - Lesson reminder */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendLearnerReminderLesson(scheduleData.Learner.name)}
                        disabled={
                          sendingLearnerLessonReminderStatuses[scheduleData.id] 
                        }
                          className="whitespace-nowrap"
                        >
                          {sendingLearnerLessonReminderStatuses[scheduleData.id] ? (
                            <RefreshCcw
                              size={14}
                              className="mr-1 animate-spin"
                            />
                          ) : (
                            <Send size={14} className="mr-1" />
                          )}
                          Send Lesson reminder to Learner
                        </Button>

                        {/* Button 2 - Reschedule window cut-off time reminder */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendLearnerReminderRescheduleWindow(scheduleData.Learner.name)}
                          disabled={sendingLearnerReschdWindowReminderStatuses[scheduleData.id]}
                          className="whitespace-nowrap"
                        >
                          {sendingLearnerReschdWindowReminderStatuses[scheduleData.id] ? (
                            <RefreshCcw
                              size={14}
                              className="mr-1 animate-spin"
                            />
                          ) : (
                            <Send size={14} className="mr-1" />
                          )}
                          Send Reschedule window reminder to Learner
                        </Button>

                        {/* Button 3 - Instuctor reminder after reschedule confirmation */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendInstrReminderLesson(scheduleData.Learner.name)}
                          disabled={sendingInstrLessonReminderStatuses[scheduleData.id]}
                          className="whitespace-nowrap"
                        >
                          {sendingInstrLessonReminderStatuses[scheduleData.id] ? (
                            <RefreshCcw
                              size={14}
                              className="mr-1 animate-spin"
                            />
                          ) : (
                            <Send size={14} className="mr-1" />
                          )}
                          Send Lesson Reminder to Instructor
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
  );
}
