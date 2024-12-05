import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { COURSES_DATA } from "@/constants/courses";
import { supabase, useUser } from "@/context/auth-context";
import { Database } from "@/types/database.types";

export function useLearner() {
  const { phone } = useUser();
  return useQuery({
    queryKey: ["learner", phone],
    queryFn: async () => {
      if (!phone) throw new Error("phone is required");
      const { data: Learner, error } = await supabase
        .from("Learner")
        .select()
        .eq("phone", phone)
        .single();

      if (error) throw new Error("Supabase error");
      return Learner;
    },
    staleTime: Infinity,
    enabled: !!phone,
  });
}

export function useLearnerId() {
  const queryClient = useQueryClient();
  const { phone } = useUser();

  const learnerData:
    | Database["public"]["Tables"]["Learner"]["Row"]
    | undefined = queryClient.getQueryData(["learner", phone]);

  if (!learnerData) {
    throw new Error("Learner data not found in cache");
  }

  return learnerData.id;
}

export function useSetLLTestDate() {
  const { phone } = useUser();
  return useMutation({
    mutationFn: async ({ LL_test_date }: { LL_test_date: Date }) => {
      const { data, error } = await supabase
        .from("Learner")
        .update({ LL_test_date: LL_test_date.toDateString() })
        .eq("phone", phone);
      if (error) throw new Error("Supabase error");
      return data;
    },
  });
}

export function useSetLLResult() {
  const { phone } = useUser();
  return useMutation({
    mutationFn: async ({
      LL_result,
    }: {
      LL_result: boolean | null | undefined;
    }) => {
      console.log("Phone:", phone);
      console.log("LL_result:", LL_result);

      const { error } = await supabase
        .from("Learner")
        .update({ LL_result: LL_result })
        .eq("phone", phone)
        .select();

      if (error) {
        console.error("Supabase error:", error);
        throw new Error("Supabase error");
      }
    },
  });
}

export function useUpcomingLesson() {
  const { phone } = useUser();
  const { data: learner } = useLearner();

  return useQuery({
    queryKey: ["schedule", "upcomingLesson", phone, learner?.id],
    queryFn: async () => {
      if (!learner?.id) {
        return {
          upcomingSchedule: null,
          upcomingLesson: null,
          instructor: null,
          course: null,
        };
      }
      const currentDate = new Date();
      const currentTime = currentDate.toTimeString().split(" ")[0];

      const { data, error } = await supabase
        .from("Schedule")
        .select(
          `
          *,
          Lesson (*),
          Instructor (
            id_instructor,
            name,
            car_make,
            car_number
          ),
          Courses (*)
        `,
        )
        .eq("learner_id", learner.id);

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return {
          upcomingSchedule: null,
          upcomingLesson: null,
          instructor: null,
          course: null,
        };
      }

      // Filter and sort upcoming schedules
      const validSchedules = data.filter((item) => {
        if (!item.date) return false;
        const itemDate = new Date(item.date);

        if (itemDate > currentDate) return true;

        if (itemDate.toDateString() === currentDate.toDateString()) {
          return item.end_time && item.end_time > currentTime;
        }

        return false;
      });

      const sortedSchedules = validSchedules.sort((a, b) => {
        const dateTimeA = new Date(`${a.date}T${a.start_time}`);
        const dateTimeB = new Date(`${b.date}T${b.start_time}`);
        return dateTimeA.getTime() - dateTimeB.getTime();
      });

      if (sortedSchedules.length === 0) {
        return {
          upcomingSchedule: null,
          upcomingLesson: null,
          instructor: null,
          course: null,
        };
      }

      const nextSchedule = sortedSchedules[0];

      return {
        upcomingSchedule: nextSchedule,
        upcomingLesson: nextSchedule.Lesson,
        instructor: nextSchedule.Instructor,
        course: nextSchedule.Courses,
      };
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!phone,
  });
}
type PartialLearner = Omit<
  Partial<Database["public"]["Tables"]["Learner"]["Row"]>,
  "phone"
>;

export function useLearnerUpdate() {
  const { phone } = useUser();
  const queryClient = useQueryClient();
  const mutate = useMutation({
    mutationFn: async (data: PartialLearner) => {
      const { error } = await supabase
        .from("Learner")
        .update(data)
        .eq("phone", phone);
      if (error) throw new Error(error.message);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["learner", phone],
      });
    },
  });
  return mutate;
}

export function useUploadLLMutation() {
  const { phone } = useUser();
  return useMutation({
    mutationFn: async ({
      file,
      fileName = "LL",
    }: {
      file: File;
      fileName?: string;
    }) => {
      const { data, error } = await supabase.storage
        .from("LL")
        .upload(`${phone}/${fileName}.${file.type.split("/")[1]}`, file, {
          cacheControl: "3600",
          upsert: true,
        });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useLessons({ courseId }: { courseId: string }) {
  return useQuery({
    queryKey: ["lessons", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Lesson")
        .select("*")
        .eq("course_id", courseId)
        .order("number", { ascending: true });
      if (error) throw new Error(error.message);
      return data.map((lesson) => lesson.id);
    },
  });
}

export function useLesson({
  number,
  courseId = COURSES_DATA["BEGINNER"].id,
  refetchInterval = 0,
}: {
  number: number;
  courseId?: string;
  refetchInterval?: number;
}) {
  return useQuery({
    queryKey: ["lesson", courseId, number],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Lesson")
        .select("*")
        .eq("number", number)
        .eq("course_id", courseId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    refetchInterval,
  });
}

export function useLessonSchedule({
  lessonId,
  refetchInterval = 0,
}: {
  lessonId: string | undefined;
  refetchInterval?: number;
}) {
  return useQuery({
    queryKey: ["lessonSchedule", lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      const { data, error } = await supabase
        .from("Schedule")
        .select("id, date, start_time, end_time, status")
        .eq("lesson_id", lessonId)
        .single();
      if (error) throw error;
      return data;
    },
    refetchInterval,
    enabled: !!lessonId,
  });
}

export function useSchedule({
  lessonId,
  learnerId,
}: {
  lessonId: string;
  learnerId: string;
}) {
  return useQuery({
    queryKey: ["schedule", lessonId, learnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Schedule")
        .select(
          "id, date, start_time, end_time, Instructor (name, car_make, car_number)",
        )
        .eq("lesson_id", lessonId)
        .eq("learner_id", learnerId)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
    enabled: !!learnerId,
  });
}

export function useLearnerSchedule({ learnerId }: { learnerId: string }) {
  return useQuery({
    queryKey: ["schedule", learnerId],
    queryFn: async () => {
      if (!learnerId) return [];
      const { data, error } = await supabase
        .from("Schedule")
        .select(
          "id, date, start_time, end_time, lesson_id, Lesson (id, number, description)",
        )
        .eq("learner_id", learnerId)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data.map((lesson) => ({
        id: lesson.id,
        date: lesson.date,
        startTime: lesson.start_time,
        endTime: lesson.end_time,
        lesson: lesson.Lesson,
      }));
    },
    staleTime: Infinity,
    enabled: !!learnerId,
  });
}
export function useUpdateScheduleStatus() {
  return useMutation({
    mutationFn: async ({
      scheduleId,
      status,
    }: {
      scheduleId: number;
      status: string;
    }) => {
      const { data, error } = await supabase
        .from("Schedule")
        .update({ status: status })
        .eq("id", scheduleId)
        .select();

      if (error) {
        console.error("Supabase error:", error);
        throw new Error("Failed to update schedule status");
      }

      return data;
    },
    onSuccess: () => {
      // Optionally, you can invalidate and refetch related queries here
      // queryClient.invalidateQueries(["schedule"]);
    },
  });
}
