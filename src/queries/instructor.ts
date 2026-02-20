import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format, subDays } from "date-fns";

import { supabase } from "@/lib/supabaseClient";

const getCurrentDate = () => {
  const date = subDays(new Date(), 0);
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
  otp_end: string;
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
          if (!schedule.isTentative) {
            const { learner, lesson } = await fetchLearnerAndLesson(
              schedule.learner_id,
              schedule.lesson_id,
            );
            return {
              schedule,
              learner,
              lesson,
            };
          }
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

      console.log("T2_1 learnerLessonDay", learnerLessonDay);
      return {
        instructorInfo,
        instructorSchedule,
        instructorScheduleDay,
        learnerLessonDay,
        learnerLesson,
        unavailability: instructorInfo.unavailability, // Added this to include all schedules' learner and lesson data
      };
    },
  });
};

export const useInstructorScheduleData = (phone: string) => {
  return useQuery({
    queryKey: ["instructor", phone],
    queryFn: async () => {
      const maxInstrScheduleWindow = 15;
      const startDate = subDays(new Date(), 2);
      const endDate = addDays(new Date(), maxInstrScheduleWindow);
      const currentDate = getCurrentDate();

      const startDateStr = format(startDate, "yyyy-MM-dd");
      const endDateStr = format(endDate, "yyyy-MM-dd");

      // Fetch instructor info, with schedules
      const { data: instructorSchedules, error: instructorError } =
        await supabase
          .from("Schedule")
          .select(
            "*, Learner!inner(*), Instructor!inner(name, phone, email, unavailability), Lesson!inner(*), Courses!inner(total_lessons)",
          )
          .eq("Instructor.phone", phone)
          .gte("date", startDateStr)
          .lte("date", endDateStr)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true });

      if (instructorError) {
        console.error(instructorError);
        throw new Error("Failed to fetch instructor info");
      }
      if (!instructorSchedules) throw new Error("Instructor not found");

      console.log(
        "schedule data from",
        startDate,
        " to ",
        endDate,
        instructorSchedules,
      );

      // Get unique learner+course combinations from visible schedules
      const learnerCoursePairs = new Set(
        instructorSchedules.map((s) => `${s.learner_id}|${s.course_id}`),
      );

      // Fetch ALL schedules for these learner+course combinations to calculate correct lesson numbers
      const scheduleToLessonNumber: Record<string, number> = {};

      await Promise.all(
        Array.from(learnerCoursePairs).map(async (pair) => {
          const [learnerId, courseId] = pair.split("|");

          // Fetch all schedules for this learner+course (no date restrictions)
          const { data: allLearnerSchedules, error } = await supabase
            .from("Schedule")
            .select("id, date, start_time")
            .eq("learner_id", learnerId)
            .eq("course_id", courseId)
            .order("date", { ascending: true })
            .order("start_time", { ascending: true });

          if (error || !allLearnerSchedules) return;

          // Sort by date and time
          const sorted = [...allLearnerSchedules].sort((a, b) => {
            const dateTimeA = new Date(
              `${a.date}T${a.start_time || "00:00:00"}`,
            ).getTime();
            const dateTimeB = new Date(
              `${b.date}T${b.start_time || "00:00:00"}`,
            ).getTime();
            return dateTimeA - dateTimeB;
          });

          // Assign chronological lesson numbers
          sorted.forEach((schedule, index) => {
            scheduleToLessonNumber[schedule.id] = index + 1;
          });
        }),
      );

      // Update each schedule's Lesson.number with the calculated chronological number
      const schedulesWithCorrectNumbers = instructorSchedules.map(
        (schedule) => ({
          ...schedule,
          Lesson: schedule.Lesson
            ? {
                ...schedule.Lesson,
                number:
                  scheduleToLessonNumber[schedule.id] || schedule.Lesson.number,
              }
            : null,
        }),
      );

      // Filter schedules for the current date
      const instructorScheduleDay = schedulesWithCorrectNumbers.filter(
        (schedule) => schedule.date === currentDate,
      );

      // Fetch learner and lesson data for each schedule (all schedules)
      const learnerLesson = await Promise.all(
        schedulesWithCorrectNumbers.map(async (scheduleData) => {
          if (!scheduleData.isTentative) {
            return {
              learner: scheduleData.Learner,
              lesson: scheduleData.Lesson,
            };
          }
          return null; // Ensure the map always returns something
        }),
      ).then((results) => results.filter((item) => item !== null)); // Filter out nulls

      // Fetch learner and lesson data for current day schedules
      const learnerLessonDay = await Promise.all(
        instructorScheduleDay.map(async (scheduleData) => {
          if (!scheduleData.isTentative) {
            return {
              learner: scheduleData.Learner,
              lesson: scheduleData.Lesson,
            };
          }
          return null; // Ensure the map always returns something
        }),
      ).then((results) => results.filter((item) => item !== null)); // Filter out nulls

      console.log("T2_1 learnerLessonDay", learnerLessonDay);

      // --- FIX APPLIED HERE ---
      const instructorData = schedulesWithCorrectNumbers?.[0]?.Instructor;

      return {
        // You must assign the expression to a key
        instructor: instructorData,
        instructorSchedules: schedulesWithCorrectNumbers,
        instructorScheduleDay,
        learnerLessonDay,
        learnerLesson,
        unavailability: instructorData?.unavailability,
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
  isVerifyStartLesson,
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
        .select("id, otp, otp_end")
        .eq("id", scheduleId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Schedule not found");
      }

      const schedule = data as unknown as ScheduleWithOtp;

      // For start lesson, verify against otp field
      // For end lesson, verify against otp_end field
      // If otp_end is null (legacy schedules), use the start otp as fallback
      const expectedOtp = isVerifyStartLesson
        ? schedule.otp
        : schedule.otp_end || schedule.otp; // Fallback to start OTP for legacy schedules

      const isValid = expectedOtp === otp;

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
      started_at,
      ended_at,
    }: {
      scheduleId: string;
      status: string;
      started_at: string;
      ended_at: string;
    }) => {
      // Assuming it's required to update status AND either started_at OR ended_at
      const updatePayload = {
        status,
        ...(started_at && { started_at }), // Include started_at if it exists
        ...(started_at ? { ended_at: null } : ended_at && { ended_at }), // Include ended_at if it exists
      };
      const { data, error } = await supabase
        .from("Schedule")
        .update(updatePayload)
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

// Check the list of sorted schedules matches any of the instructor schedules or overlaps unavailability slots
// returns a list of json, where key=> (slot time) and value => string (name of the learner blocking the schedule if not tentative
// and name of the tentative_details if tentative schedule blocks the slot)
export const checkInstructorAvailability = async (
  schedulesToCheck: any[],
  instructorId: string,
) => {
  if (!schedulesToCheck.length || !instructorId) return {};

  console.group("🚀 Strict Instructor Availability Validation");

  const dates = schedulesToCheck.map((s) => s.date);
  const minDate = dates.reduce((a, b) => (a < b ? a : b));
  const maxDate = dates.reduce((a, b) => (a > b ? a : b));

  console.log(
    `📅 Instructor ID: ${instructorId} | Range: ${minDate} to ${maxDate}`,
  );

  // QUERY FIX: We only fetch schedules for THIS specific instructor
  // or tentative schedules that might create a global conflict
  const { data: existingSchedules, error } = await supabase
    .from("Schedule")
    .select(
      "id, date, start_time, end_time, isTentative, instructor_id, tentative_details",
    )
    .gte("date", minDate)
    .lte("date", maxDate)
    .eq("instructor_id", instructorId); // STRICT FILTER BY INSTRUCTOR

  if (error) {
    console.error("❌ DB Error:", error);
    console.groupEnd();
    throw error;
  }

  console.log(
    "Schedules for this Instructor and tentative:",
    existingSchedules,
  );

  const map: Record<string, { available: boolean; reason: string }> = {};

  schedulesToCheck.forEach((newSlot) => {
    const key = `${newSlot.date}-${newSlot.start_time}`;

    const toMins = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const newStart = toMins(newSlot.start_time);
    const newEnd = toMins(newSlot.end_time);

    // Conflict check against instructor 377c's existing timeline
    const conflict = existingSchedules?.find((dbRow) => {
      if (dbRow.date !== newSlot.date) return false;

      const dbStart = toMins(dbRow.start_time);
      const dbEnd = toMins(dbRow.end_time);

      // Interval Overlap Logic
      return newStart < dbEnd && newEnd > dbStart;
    });

    if (conflict) {
      const blockerName =
        conflict.tentative_details?.name || "Confirmed Lesson";
      const blockerTime = `${conflict.start_time.substring(0, 5)} - ${conflict.end_time.substring(0, 5)}`;

      map[key] = {
        available: false,
        reason: `Instructor Busy: ${blockerName} (${blockerTime})`,
      };
      console.warn(
        `⚠️ BLOCKED: ${key} overlaps with instructor's existing slot: ${blockerTime}`,
      );
    } else {
      map[key] = { available: true, reason: "" };
    }
  });

  console.log("🏁 Final Availability Map:", map);
  console.groupEnd();
  return map;
};
