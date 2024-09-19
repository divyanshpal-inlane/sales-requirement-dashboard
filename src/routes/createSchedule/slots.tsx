import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import CalendarTimeSlotSelector from "@/components/lesson/schedule";
import { Button } from "@/components/ui/button";
import { COURSES_DATA } from "@/constants/courses";
import { supabase } from "@/context/auth-context";
import { useLearner, useLessons } from "@/queries/learner";

const courseId = COURSES_DATA["BEGINNER"].id;

export default function ScheduleSlots() {
  const { data: course } = useQuery({
    queryKey: ["courses", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Courses")
        .select("*")
        .eq("id", courseId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: lessons } = useLessons({ courseId });

  const { data: learner } = useLearner();
  if (!learner) {
    return <p>Loading</p>;
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
            <Link to="/createSchedule/details">
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <span className="text-lg font-semibold text-primary-foreground">
            2/3
          </span>
        </div>
        <div className="relative z-10 rounded-b-[40px] bg-primary p-6 text-primary-foreground">
          <h1 className="mb-1 text-xl font-semibold">
            When are you free for the lesson?
          </h1>
          <p className="">We&apos;ll use these slots for your lessons</p>
        </div>
      </div>

      <CalendarTimeSlotSelector
        learnerArea={learner.area}
        learnerId={learner.id}
        totalTime={course?.duration ?? 0}
        lessonIds={lessons ?? []}
        courseId={courseId}
      />
      {/* <ScrollArea className="mt-4 flex grow overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
        </div>
      </ScrollArea> */}
    </div>
  );
}
