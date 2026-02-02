import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useUser } from "@/context/auth-context";
import { supabase } from "@/lib/supabaseClient";
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
        .order("created_at", { ascending: false }) // replace created_at with your time column
        .limit(1)
        .maybeSingle();

      if (error) throw new Error("Supabase error");
      if (Learner) {
        console.log(
          "Fetched learner:",
          Learner.onboarding_completed,
          Learner.dob,
        );
      }
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

  // show lessons from the last completed lessons, regardless of date
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
            phone,
            car_make,
            car_number
          ),
          Courses (*)
        `,
        )
        .eq("learner_id", learner.id)
        .neq("status", "completed")
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });
      // .limit(1);

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
      const validSchedules = data;
      // data.filter((item) => {
      //   if (!item.date) return false;
      //   const itemDate = new Date(item.date);

      //   if (itemDate > currentDate) return true;

      //   if (itemDate.toDateString() === currentDate.toDateString()) {
      //     return item.end_time && item.end_time > currentTime;
      //   }

      //   return false;
      // });

      const sortedSchedules = validSchedules;
      // validSchedules.sort((a, b) => {
      //   const dateTimeA = new Date(`${a.date}T${a.start_time}`);
      //   const dateTimeB = new Date(`${b.date}T${b.start_time}`);
      //   return dateTimeA.getTime() - dateTimeB.getTime();
      // });

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
      if (!phone) throw new Error("Phone is required");

      // Check if learner exists
      const { data: existing } = await supabase
        .from("Learner")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();

      let error;
      if (existing) {
        // Update existing record
        const result = await supabase
          .from("Learner")
          .update(data)
          .eq("phone", phone);
        error = result.error;
      } else {
        // Insert new record
        const result = await supabase
          .from("Learner")
          .insert({ ...data, phone });
        error = result.error;
      }

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
      fileName = "ll",
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

export function useLessons({ courseId }: { courseId: string | undefined }) {
  return useQuery({
    queryKey: ["lessons", courseId],
    queryFn: courseId
      ? async () => {
          const { data, error } = await supabase
            .from("Lesson")
            .select("*")
            .eq("course_id", courseId)
            .order("number", { ascending: true });
          if (error) throw new Error(error.message);
          return data;
        }
      : skipToken,
  });
}

// TODO: fix this with lessonId
export function useLesson({
  id,
  refetchInterval = 0,
}: {
  id: string;
  refetchInterval?: number;
}) {
  return useQuery({
    queryKey: ["lesson", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Lesson")
        .select("*")
        .eq("id", id)
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
  const { data: learner } = useLearner();
  return useQuery({
    queryKey: ["lessonSchedule", lessonId],
    queryFn:
      lessonId && learner?.id
        ? async () => {
            const { data, error } = await supabase
              .from("Schedule")
              .select("id, date, start_time, end_time, status")
              .eq("lesson_id", lessonId)
              .eq("learner_id", learner?.id)
              .single();
            if (error) throw error;
            return data;
          }
        : skipToken,
    refetchInterval,
    enabled: !!lessonId && !!learner?.id,
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
          "id, date, start_time, end_time, Instructor (name, phone, car_make, car_number)",
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

export type Schedule = {
  status: string;
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  lessonId: string | null;
  learnerId: string | null;
  lesson: {
    id: string;
    number: number | null;
    description: string | null;
  } | null;
};

export function useLearnerSchedule({
  learnerId,
  courseId,
}: {
  learnerId?: string;
  courseId?: string;
}) {
  return useQuery<Schedule[]>({
    queryKey: ["schedule", learnerId, courseId],
    queryFn: async () => {
      if (!learnerId || !courseId) return [];
      const { data, error } = await supabase
        .from("Schedule")
        .select(
          "id, date, start_time, end_time, lesson_id,status, learner_id, Lesson (id, number, description)",
        )
        .eq("learner_id", learnerId)
        .eq("course_id", courseId)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data.map((lesson) => ({
        id: lesson.id,
        date: lesson.date,
        startTime: lesson.start_time,
        learnerId: lesson.learner_id,
        lessonId: lesson.lesson_id,
        endTime: lesson.end_time,
        lesson: lesson.Lesson,
        status: lesson.status,
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

export function useLearnerEnrollmentCourse({
  learnerId,
}: {
  learnerId: string;
}) {
  return useQuery({
    queryKey: ["course", learnerId],
    queryFn: learnerId
      ? async () => {
          const { data, error } = await supabase
            .from("enrollment")
            .select("*, Courses(*)")
            .eq("learner_id", learnerId)
            .in("status", ["pending", "active"]);

          if (error) throw error;
          return data;
        }
      : skipToken,
  });
}

export function useMutationRescheduleRequest() {
  return useMutation({
    mutationFn: async ({
      learnerId,
      totalFee = 0,
      lessonIds,
      paymentId = null,
      type = "reschedule",
    }: {
      learnerId: string;
      totalFee?: number;
      lessonIds: string[];
      paymentId?: string | null;
      type?: Database["public"]["Tables"]["reschedule_requests"]["Row"]["type"];
    }) => {
      const { data: rescheduleRequest, error: rescheduleError } = await supabase
        .from("reschedule_requests")
        .insert({
          amount: totalFee,
          status: totalFee > 0 ? "pending_payment" : "pending",
          learner_id: learnerId,
          lesson_ids: lessonIds,
          payment_id: paymentId,
          type,
        })
        .select()
        .single();
      if (rescheduleError) throw rescheduleError;
      return rescheduleRequest;
    },
  });
}

export function useMutationCompleteRescheduleRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const { data, error } = await supabase
        .from("reschedule_requests")
        .update({ status: "completed" })
        .eq("id", requestId)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["scheduling-requests"],
      });
    },
  });
}

export function useLearnerEnrollment({ learnerId }: { learnerId?: string }) {
  return useQuery({
    queryKey: ["enrollment", learnerId],
    queryFn: async () => {
      if (!learnerId) return null;
      const { data, error } = await supabase
        .from("enrollment")
        .select("*, Courses(*, Lesson(*))")
        .eq("learner_id", learnerId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      //TODO: fix this
      if (error) throw error;
      // if (data.length === 0) throw new Error("User has no enrollment");
      return data.length > 0 ? data[0] : null;
    },
    staleTime: 0, // Always refetch to get latest enrollment status
    enabled: !!learnerId,
  });
}

// ==================== ADMIN ISSUE FIXER QUERIES ====================

// Fetch all learners with their enrollment and payment data for issue diagnosis
export function useLearnersWithIssues() {
  return useQuery({
    queryKey: ["learners-with-issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Learner")
        .select(
          `
          *,
          enrollment (*, Courses(*)),
          payment (*)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

// Fetch schedules for a specific learner
export function useLearnerSchedulesAdmin({ learnerId }: { learnerId?: string }) {
  return useQuery({
    queryKey: ["learner-schedules-admin", learnerId],
    queryFn: async () => {
      if (!learnerId) return [];
      const { data, error } = await supabase
        .from("Schedule")
        .select(
          `
          *,
          Lesson (*),
          Instructor (id_instructor, name)
        `,
        )
        .eq("learner_id", learnerId)
        .order("date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!learnerId,
  });
}

// Update learner data (admin version)
export function useUpdateLearnerAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Database["public"]["Tables"]["Learner"]["Update"]>;
    }) => {
      const { data, error } = await supabase
        .from("Learner")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learners-with-issues"] });
    },
  });
}

// Update enrollment data
export function useUpdateEnrollmentAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Database["public"]["Tables"]["enrollment"]["Update"]>;
    }) => {
      const { data, error } = await supabase
        .from("enrollment")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learners-with-issues"] });
    },
  });
}

// Create enrollment
export function useCreateEnrollmentAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      enrollment: Database["public"]["Tables"]["enrollment"]["Insert"],
    ) => {
      const { data, error } = await supabase
        .from("enrollment")
        .insert(enrollment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learners-with-issues"] });
    },
  });
}

// Update payment data
export function useUpdatePaymentAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Database["public"]["Tables"]["payment"]["Update"]>;
    }) => {
      const { data, error } = await supabase
        .from("payment")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learners-with-issues"] });
    },
  });
}

// Create payment
export function useCreatePaymentAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payment: Database["public"]["Tables"]["payment"]["Insert"],
    ) => {
      const { data, error } = await supabase
        .from("payment")
        .insert(payment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learners-with-issues"] });
    },
  });
}

// Bulk delete all learner data (schedules, enrollments, payments, learner)
// Order matters due to foreign key constraints:
// - Schedules reference learner_id
// - Enrollments reference payment_id (so enrollments must be deleted before payments)
// - Payments reference learner_id
// - Learner is deleted last
export function useDeleteLearnerAllData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      learnerId,
      counts,
    }: {
      learnerId: string;
      counts: { schedules: number; enrollments: number; payments: number };
    }) => {
      // 1. Delete all schedules for this learner
      const { error: scheduleError } = await supabase
        .from("Schedule")
        .delete()
        .eq("learner_id", learnerId);

      if (scheduleError) throw new Error(`Failed to delete schedules: ${scheduleError.message}`);

      // 2. Delete all enrollments for this learner (must be before payments due to FK)
      const { error: enrollmentError } = await supabase
        .from("enrollment")
        .delete()
        .eq("learner_id", learnerId);

      if (enrollmentError) throw new Error(`Failed to delete enrollments: ${enrollmentError.message}`);

      // 3. Delete all payments for this learner (after enrollments)
      const { error: paymentError } = await supabase
        .from("payment")
        .delete()
        .eq("learner_id", learnerId);

      if (paymentError) throw new Error(`Failed to delete payments: ${paymentError.message}`);

      // 4. Delete the learner record
      const { error: learnerError } = await supabase
        .from("Learner")
        .delete()
        .eq("id", learnerId);

      if (learnerError) throw new Error(`Failed to delete learner: ${learnerError.message}`);

      // Return the counts that were passed in (we know them from the UI)
      return {
        schedules: counts.schedules,
        enrollments: counts.enrollments,
        payments: counts.payments,
        learner: true,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learners-with-issues"] });
      queryClient.invalidateQueries({ queryKey: ["learner-schedules-admin"] });
    },
  });
}
