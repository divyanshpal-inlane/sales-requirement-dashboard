import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import invariant from "tiny-invariant";

import RescheduleConfirmationSheet from "@/components/lesson/RescheduleConfirmationSheet";
import RescheduleSelector from "@/components/lesson/RescheduleSelector";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // Import Dialog components
import { supabase } from "@/lib/supabaseClient";
import {
  Schedule,
  useLearner,
  useLearnerEnrollment,
  useLearnerSchedule,
} from "@/queries/learner";

interface Lesson {
  id: string;
  number: number;
  course_id: string;
  Courses: {
    id: string;
    name: string | null;
  };
}

function RescheduleView() {
  const { lessonId } = useParams<{ lessonId: string }>();
  invariant(lessonId, "lessonId is required");
  const { data: learner } = useLearner();
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false); // State for policy dialog
  const [selectedSchedules, setSelectedSchedules] = useState<Schedule[]>([]);
  const { data: enrolledCourse } = useLearnerEnrollment({ learnerId: learner?.id });

  const { data: lesson } = useQuery<Lesson>({
    queryKey: ["lesson", lessonId, enrolledCourse?.course_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Lesson")
        .select("*, Courses(*)")
        .eq("id", lessonId)
        .eq("course_id", enrolledCourse?.course_id)
        .single();
      if (error) throw error;
      if (!data) throw new Error("Lesson not found");
      return data as Lesson;
    },
    enabled: !!enrolledCourse?.course_id, // Only run the query if course_id is available
  });

  const { data: schedules } = useLearnerSchedule({
    learnerId: learner?.id || "",
    courseId: enrolledCourse?.course_id,
  });

  const handleLessonsSelected = (schedules: Schedule[]) => {
    setSelectedSchedules(schedules);
    setIsConfirmationOpen(true);
  };

  const calculateTotalFee = () => {
    if (!schedules) return 0;

    // Group schedules by date
    const groupedByDate = schedules.reduce(
      (groups: { [key: string]: Schedule[] }, schedule) => {
        const date = schedule.date;
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(schedule);
        return groups;
      },
      {},
    );

    // Calculate fee for each day that has selected lessons
    return Object.entries(groupedByDate).reduce(
      (total, [date, daySchedules]) => {
        const hasSelectedLessonInDay = daySchedules.some((schedule) =>
          selectedSchedules.some((s) => s.id === schedule.id),
        );
        if (hasSelectedLessonInDay) {
          const scheduleDate = new Date(`${date}T00:00:00`);
          const now = new Date();
          const diffHours =
            (scheduleDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          return total + (diffHours < 24 ? 300 : 0);
        }
        return total;
      },
      0,
    );
  };

  if (!learner || !lesson || !schedules) {
    return <p>Loading...</p>;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col rounded-b-[40px] bg-primary">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
            asChild
          >
            <Link to={`/home`}>
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <span className="text-lg font-semibold text-primary-foreground">
            Reschedule
          </span>
        </div>
        <div className="relative z-10 rounded-b-[40px] bg-primary p-6 text-primary-foreground">
          <h1 className="mb-1 text-xl font-semibold">
            Reschedule upcoming lessons
          </h1>
          <p className="">Select new time slots for your lessons</p>
          <p
            className="mt-2 text-sm underline cursor-pointer"
            onClick={() => setIsPolicyDialogOpen(true)} // Open policy dialog
          >
            View Reschedule Policy
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <RescheduleSelector
          learnerId={learner.id}
          courseId={enrolledCourse?.course_id}
          onLessonsSelected={handleLessonsSelected}
        />
      </div>

      <RescheduleConfirmationSheet
        isOpen={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
        selectedSchedules={selectedSchedules || []}
        totalFee={calculateTotalFee()}
        learnerId={learner.id}
        courseId={enrolledCourse?.course_id}
      />

      {/* Reschedule Policy Dialog */}
      <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lesson Reschedule Policy</DialogTitle>
          </DialogHeader>
          <div className="text-sm">
            <ul className="list-disc pl-5">
              <li>Lessons rescheduled within 24 hours will incur a nominal fee of ₹300.</li>
              <li>A ₹300 charge applies for missed lessons (no-show).</li>
              <li>To avoid fees, please provide at least 24 hours' notice for rescheduling.</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RescheduleView;
