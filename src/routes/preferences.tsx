import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import PreferenceSelector from "@/components/lesson/PreferenceSelector";
import { Button } from "@/components/ui/button";
import {
  useLearner,
  useLearnerEnrollmentCourse,
  useLessons,
} from "@/queries/learner";

function Preferences() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") as "new" | "reschedule" | "lesson10";
  const { data: learner, isLoading } = useLearner();
  const { data: enrolledCourse, isLoading: enrolledCourseLoading } =
    useLearnerEnrollmentCourse({
      learnerId: learner?.id ?? "",
    });

  const { data: lessons, isLoading: lessonsLoading } = useLessons({
    courseId: enrolledCourse?.[0]?.course_id,
  });

  // Determine lessons to schedule based on has_a_DL
  const lessonsToSchedule =
    type === "new" && learner?.has_a_DL
      ? lessons
      : type === "new"
        ? lessons?.slice(0, 9)
        : type === "lesson10"
          ? lessons?.slice(9, 10)
          : lessons;

  if (enrolledCourseLoading || lessonsLoading) {
    return <div>Loading...</div>;
  }

  if (enrolledCourse && enrolledCourse.length === 0) {
    return <div>No enrolled course</div>;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto">
      <div className="flex flex-col rounded-b-[40px] bg-primary">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
            asChild
          >
            <Link to="/home">
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <span className="text-lg font-semibold text-primary-foreground">
            {type === "new"
              ? "Schedule Preferences"
              : type === "lesson10"
                ? "Schedule Lesson 10"
                : "Reschedule Preferences"}
          </span>
        </div>
        <div className="relative z-10 rounded-b-[40px] bg-primary p-6 text-primary-foreground">
          <h1 className="mb-1 text-xl font-semibold">
            When are you available for lessons?
          </h1>
          <p>Set your preferences for each time slot</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-2 py-4">
          {learner && lessonsToSchedule ? (
            <PreferenceSelector
              type={type}
              lessons={lessonsToSchedule.map((l) => l.id)}
              learnerId={learner.id}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default Preferences;
