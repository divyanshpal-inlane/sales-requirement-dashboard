import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

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
  return useMutation({
    mutationFn: async ({
      phone,
      LL_test_date,
    }: {
      phone: string | null | undefined;
      LL_test_date: Date | null | undefined;
    }) => {
      const { data, error } = await supabase
        .from("Learner")
        .update({ LL_test_date: LL_test_date })
        .eq("phone", phone);
      if (error) throw new Error("Supabase error");
      return data;
    },
  });
}

export function useSetLLResult() {
  return useMutation({
    mutationFn: async ({
      phone,
      LL_result,
    }: {
      phone: string | null | undefined;
      LL_result: boolean | null | undefined;
    }) => {
      console.log("Phone:", phone);
      console.log("LL_result:", LL_result);

      const { data, error } = await supabase
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
  return useQuery({
    queryKey: ["upcomingLesson", phone],
    queryFn: async () => {
      if (!phone) throw new Error("Phone number is required");

      // Query the Learner table to find the learner_id
      const { data: learner, error: learnerError } = await supabase
        .from("Learner")
        .select("id")
        .eq("phone", phone)
        .single();

      if (learnerError) {
        throw new Error("Supabase error while fetching learner");
      }

      if (!learner) {
        throw new Error("No learner found with the given phone number");
      }

      const learner_id = learner.id;

      // Query the Schedule table
      const { data: schedule, error: scheduleError } = await supabase
        .from("Schedule")
        .select()
        .eq("learner_id", learner_id);

      if (scheduleError) {
        throw new Error("Supabase error while fetching schedule");
      }

      const currentDate = new Date();
      const currentTime = currentDate.toTimeString().split(" ")[0]; // Get current time as string in HH:MM:SS format

      // Filter out invalid or null dates and find the closest upcoming schedule
      const validSchedules = schedule.filter((item) => {
        if (!item.date) return false;
        const itemDate = new Date(item.date);

        // If the date is in the future, include it
        if (itemDate > currentDate) return true;

        // If the date is today, check the end_time
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

      const upcomingSchedule = sortedSchedules.length
        ? sortedSchedules[0]
        : null;

      if (!upcomingSchedule) {
        return {
          upcomingSchedule: null,
          upcomingLesson: null,
          instructor: null,
          course: null,
        };
      }

      const { lesson_id, instructor_id, course_id } = upcomingSchedule;

      // Query the Lesson table
      const { data: lesson, error: lessonError } = await supabase
        .from("Lesson")
        .select()
        .eq("id", lesson_id!)
        .single();

      if (lessonError) throw new Error("Supabase error while fetching lesson");

      // Query the Instructor table
      const { data: instructor, error: instructorError } = await supabase
        .from("Instructor")
        .select()
        .eq("id_instructor", instructor_id!)
        .single();

      if (instructorError) {
        throw new Error("Supabase error while fetching instructor");
      }

      // Query the Courses table
      const { data: course, error: courseError } = await supabase
        .from("Courses")
        .select()
        .eq("id", course_id!)
        .single();

      if (courseError) throw new Error("Supabase error while fetching course");

      return {
        upcomingSchedule,
        upcomingLesson: lesson || null,
        instructor: instructor || null,
        course: course || null,
      };
    },
    staleTime: Infinity,
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

export function useSchedule() {
  return useQuery({
    queryKey: ["schedule", "2024-09-11"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Schedule")
        .select("*")
        .gte("date", "2024-09-11")
        .lte("date", "2024-09-20");
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useUploadLLMutation() {
  return useMutation({
    mutationFn: async ({ file, phone }: { file: File; phone: string }) => {
      const { data, error } = await supabase.storage
        .from("LL")
        .upload(`${phone}/${file.name}`, file, {
          cacheControl: "3600",
          upsert: true,
        });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useSlotMutation() {
  const { phone } = useUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ newSlots }: { newSlots: SelectedSlot[] }) => {
      const { data, error } = await supabase.from("Schedule").upsert(
        newSlots.map((slot) =>
          slot.slots
            .map((timeSlot) => ({
              learner_id: "30fde0da-377d-47da-9b09-e608db215349",
              start_time: timeSlot.start,
              date: format(slot.date, "yyyy-MM-dd"),
            }))
            .flatMap()
        ),
      );
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["upcomingLesson", phone],
      });
      queryClient.invalidateQueries({
        queryKey: ["schedule", phone],
      });
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
        .eq("course_id", courseId);
      if (error) throw new Error(error.message);
      return data.map((lesson) => lesson.id);
    },
  });
}

export function useLesson({ lessonId }: { lessonId: string }) {
  return useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Lesson")
        .select("*")
        .eq("id", lessonId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
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
