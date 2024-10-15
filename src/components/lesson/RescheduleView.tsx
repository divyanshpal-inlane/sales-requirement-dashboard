import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import React from "react";
import { Link, useParams } from "react-router-dom";
import invariant from "tiny-invariant";

import CalendarTimeSlotSelector from "@/components/lesson/schedule";
import { Button } from "@/components/ui/button";
import { supabase } from "@/context/auth-context";
import { useLearner } from "@/queries/learner";

function RescheduleView() {
  const { lessonId } = useParams<{ lessonId: string }>();
  invariant(lessonId, "lessonId is required");
  const { data: learner } = useLearner();

  const { data: lesson } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Lesson")
        .select("*, Courses(*)")
        .eq("id", lessonId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: allLessons } = useQuery({
    queryKey: ["allLessons", lesson?.course_id],
    queryFn: async () => {
      if (!lesson) throw new Error("Lesson not found");
      const { data, error } = await supabase
        .from("Lesson")
        .select("*")
        .eq("course_id", lesson.course_id)
        .order("number", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!lesson,
  });

  const upcomingLessonIds = React.useMemo(() => {
    if (!allLessons || !lesson) return [];
    return allLessons.filter((l) => l.number >= lesson.number).map((l) => l.id);
  }, [allLessons, lesson]);

  if (!learner || !lesson || !allLessons) {
    return <p>Loading...</p>;
  }

  return (
    <div className="flex h-full w-full flex-col rounded-md">
      <div className="flex flex-col rounded-b-[40px] bg-primary">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
            asChild
          >
            <Link to={`/lesson/${lesson.number}`}>
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <span className="text-lg font-semibold text-primary-foreground">
            Reschedule
          </span>
        </div>
        <div className="relative z-10 rounded-b-[40px] bg-primary p-6 text-primary-foreground">
          <h1 className="mb-1 text-xl font-semibold">
            Reschedule Lesson {lesson.number} and upcoming lessons
          </h1>
          <p className="">Select new time slots for your lessons</p>
        </div>
      </div>

      <CalendarTimeSlotSelector
        learnerArea={learner.area}
        learnerId={learner.id}
        totalTime={upcomingLessonIds.length}
        lessonIds={upcomingLessonIds}
        courseId={lesson.course_id}
        startFromLessonId={lessonId}
      />
    </div>
  );
}

export default RescheduleView;
