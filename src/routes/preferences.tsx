import { ArrowLeft } from "lucide-react";
import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import PreferenceSelector from "@/components/lesson/PreferenceSelector";
import { Button } from "@/components/ui/button";
import {
  useLearner,
  useLearnerEnrollment,
  useLearnerEnrollmentCourse,
  useLessons,
} from "@/queries/learner";

function Preferences() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") as "new" | "reschedule" | "lesson10";
  const [isFlexible, setIsFlexible] = useState(false);
  const { data: learner } = useLearner();
  const { data: enrolledCourse, isLoading: enrolledCourseLoading } =
    useLearnerEnrollmentCourse({
      learnerId: learner?.id ?? "",
    });

  // Also fetch enrollment details for demo/custom courses
  const { data: enrollment, isLoading: enrollmentLoading } =
    useLearnerEnrollment({
      learnerId: learner?.id,
    });

  const courseId = enrolledCourse?.[0]?.course_id;
  const courseTotalLessons = enrolledCourse?.[0]?.Courses?.total_lessons;
  const isDemo = enrollment?.progress?.type === "demo";
  const isCustom = enrollment?.progress?.type === "custom";

  const { data: lessons, isLoading: lessonsLoading } = useLessons({
    courseId: courseId,
  });

  // Determine lessons to schedule
  // For demo/custom courses without course_id, create virtual lesson IDs
  let lessonsToSchedule: string[] | undefined;

  if (isDemo || isCustom || !courseId) {
    // Demo/custom: use unlocked_lessons from enrollment or calculate from total_hours
    const unlockedLessons = enrollment?.unlocked_lessons || [];
    const totalHours = enrollment?.progress?.total_hours || 1;

    if (unlockedLessons.length > 0) {
      // Use unlocked_lessons array - create virtual lesson IDs
      lessonsToSchedule = unlockedLessons.map(
        (num: number) => `virtual-lesson-${num}`,
      );
    } else {
      // Fallback: create virtual lessons based on total_hours
      lessonsToSchedule = Array.from(
        { length: totalHours },
        (_, i) => `virtual-lesson-${i + 1}`,
      );
    }
  } else if (lessons) {
    // Regular course with lessons
    // Limit lessons to match course's total_lessons (handles cases where DB has extra lesson records)
    const limitedLessons = courseTotalLessons
      ? lessons.slice(0, courseTotalLessons)
      : lessons;

    // Always pass ALL lesson IDs for new schedules - lesson 10 locking is handled in admin CreateSchedule
    lessonsToSchedule =
      type === "new"
        ? limitedLessons.map((l) => l.id) // Always include all lessons (including lesson 10)
        : type === "lesson10"
          ? limitedLessons.slice(9, 10).map((l) => l.id)
          : limitedLessons.map((l) => l.id);
  }

  if (enrolledCourseLoading || lessonsLoading || enrollmentLoading) {
    return <div>Loading...</div>;
  }

  if (!enrollment && enrolledCourse && enrolledCourse.length === 0) {
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
          <div className="mt-4 flex items-center px-2">
            <input
              type="checkbox"
              id="flexible"
              checked={isFlexible}
              onChange={() => setIsFlexible((prev) => !prev)}
              className="mr-2"
            />
            <label htmlFor="flexible" className="text-sm text-gray-700">
              I am flexible with my time slot selection
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-2 py-4">
          {learner && lessonsToSchedule && lessonsToSchedule.length > 0 ? (
            <PreferenceSelector
              type={type}
              lessons={lessonsToSchedule}
              learnerId={learner.id}
            />
          ) : (
            <div className="text-center text-muted-foreground">
              No lessons available to schedule
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Preferences;
