import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/context/auth-context";

const getCurrentDate = () => {
  const date = new Date();
  return date.toISOString().split("T")[0];
};

const fetchLearnerAndLesson = async (
  learnerId: string | null,
  lessonId: string | null,
) => {
  const [learnerResponse, lessonResponse] = await Promise.all([
    supabase.from("Learner").select("*").eq("id", learnerId).single(),
    supabase.from("Lesson").select("*").eq("id", lessonId).single(),
  ]);

  if (learnerResponse.error) throw new Error(learnerResponse.error.message);
  if (lessonResponse.error) throw new Error(lessonResponse.error.message);

  return {
    learner: learnerResponse.data,
    lesson: lessonResponse.data,
  };
};

export const useInstructor = (phone: string) => {
  return useQuery({
    queryKey: ["instructor", phone],
    queryFn: async () => {
      const currentDate = getCurrentDate();

      // Fetch instructor info
      const { data: instructorInfo, error: instructorError } = await supabase
        .from("Instructor")
        .select("*")
        .eq("phone", phone)
        .single();

      if (instructorError) {
        throw new Error("Failed to fetch instructor info");
      }
      if (!instructorInfo) throw new Error("Instructor not found");

      // Fetch all schedules for the instructor
      const { data: instructorSchedule, error: scheduleError } = await supabase
        .from("Schedule")
        .select("*")
        .eq("instructor_id", instructorInfo.id_instructor);

      if (scheduleError) {
        throw new Error("Failed to fetch instructor schedule");
      }

      // Filter schedules for the current date
      const instructorScheduleDay = instructorSchedule.filter(
        (schedule) => schedule.date === currentDate,
      );

      // Fetch learner and lesson data for each schedule
      const learnerLessonDay = await Promise.all(
        instructorScheduleDay.map(async (schedule) => {
          const { learner, lesson } = await fetchLearnerAndLesson(
            schedule.learner_id,
            schedule.lesson_id,
          );
          return { learner, lesson };
        }),
      );

      return {
        instructorInfo,
        instructorSchedule,
        instructorScheduleDay,
        learnerLessonDay, // This will contain the array of { learner, lesson } objects
      };
    },
  });
};
