import "react-big-calendar/lib/css/react-big-calendar.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, BookOpen } from "lucide-react";
import { useInstructor, useUpdateScheduleStatus } from "@/queries/instructor";
import { supabase, useUser } from "@/context/auth-context";
import { LESSON_CONTENT } from "@/constants/Lesson";

// Import all modular components
import EnhancedCalendarView from "@/components/instructor/EnhancedCalendarView";
import ScheduleList from "@/components/instructor/ScheduleList";
import LessonList from "@/components/instructor/LessonList";
import EventModal from "@/components/instructor/EventModal";
import ScheduleDetailDialog from "@/components/instructor/ScheduleDetailDialog";
import LessonPlanDialog from "@/components/instructor/LessonPlanDialog";

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

  // Dialog and modal state
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
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

  // Event handlers
  const handleOpenLessonPlan = (lesson: any, learner: any) => {
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

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
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

  if (instructorLoading) return <div>Loading...</div>;
  if (instructorError)
    return <div>An error occurred: {instructorError.message}</div>;

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <div className="flex flex-col w-full h-full">
        <Tabs defaultValue="calendar" className="flex flex-col w-full h-full">
          <div className="overflow-hidden flex-1 p-6 pb-2">
            <TabsContent value="calendar" className="overflow-y-auto m-0 h-full">
              <EnhancedCalendarView
                instructorData={instructorData}
                onScheduleClick={handleScheduleClick}
                onEventClick={handleEventClick}
              />
            </TabsContent>
            <TabsContent value="schedule" className="overflow-y-auto m-0 h-full">
              <ScheduleList
                instructorData={instructorData}
                onOpenLessonPlan={handleOpenLessonPlan}
                onFinishLesson={handleFinishLesson}
                navigate={navigate}
              />
            </TabsContent>
            <TabsContent value="lesson" className="overflow-y-auto m-0 h-full">
              <LessonList
                instructorData={instructorData}
                LESSON_CONTENT={LESSON_CONTENT}
              />
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
        
        {/* Dialogs */}
        <EventModal 
          open={isEventModalOpen} 
          event={selectedEvent} 
          onClose={() => setIsEventModalOpen(false)} 
        />
        <ScheduleDetailDialog 
          open={scheduleDetailDialog.open} 
          schedule={scheduleDetailDialog.schedule} 
          learner={scheduleDetailDialog.learner} 
          onClose={() => setScheduleDetailDialog(prev => ({ ...prev, open: false }))} 
        />
        <LessonPlanDialog 
          open={lessonPlanDialog.open} 
          lesson={lessonPlanDialog.lesson} 
          learner={lessonPlanDialog.learner} 
          onClose={() => setLessonPlanDialog(prev => ({ ...prev, open: false }))} 
        />
      </div>
    </GoogleOAuthProvider>
  );
}

export default Instructor;
