import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/context/auth-context";

const getCurrentDate = () => {
  const date = new Date();
  return date.toISOString().split("T")[0];
};

interface UseVerifyOtpParams {
  scheduleId: string;
  otp: string;
  enabled?: boolean;
}

interface ScheduleWithOtp {
  id: string;
  otp: string;
  // Add other schedule fields as needed
}

interface Learner {
  id: string;
  name: string;
  pick_up_location: string;
  phone: string;
}

interface Schedule {
  id: string;
  status: string;
  learner_id: string;
  otp: string;
}

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

export const useLearner = (learnerId: string) => {
  return useQuery({
    queryKey: ["learner", learnerId],
    queryFn: async () => {
      const { data: learner, error } = await supabase
        .from("Learner")
        .select("*")
        .eq("id", learnerId)
        .single();

      if (error) {
        throw new Error("Failed to fetch learner");
      }

      return learner;
    },
    staleTime: Infinity,
  });
};

export const useLesson = (lessonId: string) => {
  return useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data: lesson, error } = await supabase
        .from("Lesson")
        .select("*")
        .eq("id", lessonId)
        .single();

      if (error) {
        throw new Error("Failed to fetch learner");
      }

      return lesson;
    },
    staleTime: Infinity,
  });
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

      // Fetch learner and lesson data for each schedule (all schedules)
      const learnerLesson = await Promise.all(
        instructorSchedule.map(async (schedule) => {
          const { learner, lesson } = await fetchLearnerAndLesson(
            schedule.learner_id,
            schedule.lesson_id,
          );
          return {
            schedule,
            learner,
            lesson,
          };
        }),
      );

      // Fetch learner and lesson data for current day schedules
      const learnerLessonDay = await Promise.all(
        instructorScheduleDay.map(async (schedule) => {
          const { learner, lesson } = await fetchLearnerAndLesson(
            schedule.learner_id,
            schedule.lesson_id,
          );
          return {
            learner,
            lesson,
          };
        }),
      );

      return {
        instructorInfo,
        instructorSchedule,
        instructorScheduleDay,
        learnerLessonDay,
        learnerLesson, // Added this to include all schedules' learner and lesson data
      };
    },
  });
};

export const useUpdateInstructor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id_instructor,
      name,
      email,
      phone,
      car_make,
      car_mode,
      car_number,
      experience,
    }: {
      id_instructor: string;
      name: string;
      email: string;
      phone: string;
      car_make: string;
      car_mode: string;
      car_number: string;
      experience: number;
    }) => {
      const { data, error } = await supabase
        .from("Instructor")
        .update({
          name,
          email,
          phone,
          car_make,
          car_mode,
          car_number,
          experience,
        })
        .eq("id_instructor", id_instructor)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["instructor", newData.phone],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData([
        "instructor",
        newData.phone,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(["instructor", newData.phone], (old: any) => ({
        ...old,
        instructorInfo: {
          ...old.instructorInfo,
          ...newData,
        },
      }));

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (err, newData, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(
        ["instructor", newData.phone],
        context?.previousData,
      );
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to make sure our optimistic update is correct
      queryClient.invalidateQueries({
        queryKey: ["instructor", variables.phone],
      });
    },
  });
};

export const useVerifyOtp = ({
  scheduleId,
  otp,
  enabled = true,
}: UseVerifyOtpParams) => {
  return useQuery({
    queryKey: ["verify-otp", scheduleId, otp],
    queryFn: async () => {
      if (!scheduleId || !otp) {
        throw new Error("Schedule ID and OTP are required");
      }

      const { data, error } = await supabase
        .from("Schedule")
        .select("id, otp")
        .eq("id", scheduleId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Schedule not found");
      }

      const schedule = data as unknown as ScheduleWithOtp;
      const isValid = schedule.otp === otp;

      return {
        isValid,
        schedule,
      };
    },
    enabled: enabled && Boolean(scheduleId) && Boolean(otp),
    retry: false,
    staleTime: 0, // Don't cache the result
    // Remove from cache immediately
  });
};

// Query to fetch learner details
export const useLearnerDetails = (learnerId: string | undefined) => {
  return useQuery({
    queryKey: ["learner", learnerId],
    queryFn: async () => {
      if (!learnerId) throw new Error("Learner ID is required");

      const { data, error } = await supabase
        .from("Learner")
        .select("id, name, pick_up_location, phone")
        .eq("id", learnerId)
        .single();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Learner not found");

      return data as Learner;
    },
    enabled: Boolean(learnerId),
  });
};

// Mutation to update schedule status
export const useUpdateScheduleStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scheduleId,
      status,
    }: {
      scheduleId: string;
      status: string;
    }) => {
      const { data, error } = await supabase
        .from("Schedule")
        .update({ status })
        .eq("id", scheduleId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as unknown as Schedule;
    },
    onSuccess: (data) => {
      // Invalidate and refetch schedule data
      queryClient.invalidateQueries({ queryKey: ["schedule", data.id] });
    },
  });
};
