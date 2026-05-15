import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  Download,
  Loader2,
  MoreHorizontal,
  RefreshCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import InstructorAnalytics from "@/components/admin/InstructorAnalytics";
import {
  LearnerInfo,
  LearnerInfoCard,
  LearnerInfoDialog,
} from "@/components/admin/LearnerInfoCard";
import LessonRouteMap from "@/components/admin/LessonRouteMap";
import CreateSchedule from "@/components/lesson/CreateSchedule";
import CreateScheduleWithInstructor from "@/components/lesson/CreateSchedule";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { sendMultiEventCalendarInvite } from "@/lib/calendarUtils";
import { supabase } from "@/lib/supabaseClient";
import { generateRandomOTP } from "@/lib/utils";
import { useMutationCompleteRescheduleRequest } from "@/queries/learner";
import {
  SchedulingRequests,
  useEnrollmentTypesByLearner,
  useSchedulingRequests,
} from "@/queries/preferences";
import {
  DAYS_OF_WEEK,
  TIME_SLOT_LABELS,
  TIME_SLOTS,
  TimeSlot,
} from "@/types/schedule";
import {
  checkScheduleConflict,
  formatConflictMessage,
} from "@/utils/scheduleConflict";

export type Schedule = {
  date: Date;
  hour: number;
  instructorId: string;
  lessonId: string;
  lessonNumber: number;
  start_time: string;
  end_time: string;
  otp: string;
  calendar_uid?: string;
  calendar_sequence?: number;
  duration?: number; // 1 or 2 hours (defaults to 1)
};

type RequestType = "new" | "reschedule" | "lesson10";

// Extend the SchedulingRequests type to include lesson10
declare module "@/queries/preferences" {
  interface SchedulingRequests {
    type: RequestType;
  }
}

const PREDEFINED_COURSES = [
  {
    id: "e129f667-0510-4f07-9847-edb58356dc74",
    name: "Beginner Course",
    duration: 10,
  },
  { id: "f60e5fdb-787a-4b40-844d-4e66416a6c8f", name: "Flyover", duration: 2 },
  { id: "0ce6680f-6e12-49d7-8cf9-4388e81d2e27", name: "Parking", duration: 2 },
  { id: "cc5fb06a-419f-4766-a79b-221c81bf9826", name: "Slopes", duration: 2 },
  { id: "7ff8818e-5b52-4030-bc2d-f54071e8ed7f", name: "Traffic", duration: 4 },
  {
    id: "05a5f57f-c3e2-48ac-b29f-4299e30442eb",
    name: "Parking + Flyover",
    duration: 4,
  },
  {
    id: "abddddb8-3f54-41ea-a64b-5ba55988b12a",
    name: "Slopes + Parking",
    duration: 4,
  },
  {
    id: "ddbbfbbf-2222-4742-947b-ccd4e25e7936",
    name: "Traffic + Parking",
    duration: 6,
  },
  {
    id: "14552c29-e7e5-4e76-a350-1ae7d8ffc7f3",
    name: "Traffic + Flyover",
    duration: 6,
  },
  {
    id: "b991363c-6791-411e-9cb8-6723e40d0a0a",
    name: "Traffic + Parking + Flyover",
    duration: 8,
  },
];
const DEMO_CREDIT = 1;

export default function AdminSchedules() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: requests, isLoading, isRefetching } = useSchedulingRequests();
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [isInstructorChangeModalOpen, setIsInstructorChangeModalOpen] =
    useState(false);
  const [selectedRequest, setSelectedRequest] = useState<
    SchedulingRequests[number] | null
  >(null);
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLearnerForDialog, setSelectedLearnerForDialog] =
    useState<LearnerInfo | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [newRequestFilter, setNewRequestFilter] = useState<
    "all" | "course" | "demo" | "topup"
  >("all");

  useEffect(() => {
    if (!isRefetching) {
      setSelectedRequest(null);
    }
  }, [isRefetching]);

  const completeRescheduleRequestMutation =
    useMutationCompleteRescheduleRequest();

  const createScheduleMutation = useMutation({
    mutationFn: async ({
      learnerId,
      schedules,
      courseId,
      rescheduleLessonNumber,
    }: {
      learnerId: string;
      schedules: Schedule[];
      courseId: string | null;
      rescheduleLessonNumber?: number;
    }) => {
      // Check if this is a demo/custom course (virtual lessons)
      const isVirtualLessons =
        schedules.length > 0 &&
        schedules[0]?.lessonId?.startsWith?.("virtual-lesson-");
      console.log("=== CREATE SCHEDULE MUTATION ===");
      console.log("learnerId:", learnerId);
      console.log("schedules:", schedules);
      console.log("courseId:", courseId);
      console.log("schedules.length:", schedules.length);

      if (schedules.length === 0) {
        console.warn("WARNING: No schedules to create/update!");
      }

      // Step 1: Delete existing schedules for these lessons.
      // Skip for virtual lessons (demo/custom courses): the lesson_id values
      // are synthetic strings like "virtual-lesson-XXX" which Postgres rejects
      // against the UUID lesson_id column, and there's nothing to delete
      // anyway because virtual lessons never persist as real Schedule rows.
      if (!isVirtualLessons) {
        const { error: deleteError } = await supabase
          .from("Schedule")
          .delete()
          .eq("learner_id", learnerId)
          .eq("course_id", courseId)
          .in(
            "lesson_id",
            schedules.map((s) => s.lessonId),
          );

        if (deleteError) throw deleteError;
      }

      // Step 2: Conflict check — one query per unique instructor (not per schedule)
      const instructorDates = new Map<string, Set<string>>();
      for (const schedule of schedules) {
        const dateStr = schedule.date.toISOString().split("T")[0];
        if (!instructorDates.has(schedule.instructorId)) {
          instructorDates.set(schedule.instructorId, new Set());
        }
        instructorDates.get(schedule.instructorId)!.add(dateStr);
      }

      // Fetch all instructors' schedules in parallel
      const conflictResults = await Promise.all(
        Array.from(instructorDates).map(([instructorId, dates]) =>
          supabase
            .from("Schedule")
            .select(
              "id, date, start_time, end_time, instructor_id, Learner(name)",
            )
            .eq("instructor_id", instructorId)
            .in("date", Array.from(dates))
            .neq("status", "paused")
            .not("isTentative", "eq", true),
        ),
      );

      const allExistingSchedules: any[] = [];
      for (const result of conflictResults) {
        if (!result.error && result.data) {
          allExistingSchedules.push(...result.data);
        }
      }

      // Check conflicts in memory
      const conflicts: string[] = [];
      for (const schedule of schedules) {
        const dateStr = schedule.date.toISOString().split("T")[0];
        const endTime = schedule.end_time;

        for (const existing of allExistingSchedules) {
          if (
            existing.instructor_id !== schedule.instructorId ||
            existing.date !== dateStr
          )
            continue;

          if (
            (schedule.start_time >= existing.start_time &&
              schedule.start_time < existing.end_time) ||
            (endTime > existing.start_time && endTime <= existing.end_time) ||
            (schedule.start_time <= existing.start_time &&
              endTime >= existing.end_time)
          ) {
            const learnerName = (existing.Learner as any)?.name || "Unknown";
            conflicts.push(
              `Instructor already booked on ${dateStr} at ${existing.start_time} for ${learnerName}`,
            );
          }
        }
      }

      if (conflicts.length > 0) {
        throw new Error(
          `Scheduling conflicts detected:\n${conflicts.join("\n")}`,
        );
      }

      // Step 3: Batch insert all schedules
      const { error } = await supabase.from("Schedule").insert(
        schedules.map((schedule) => {
          const lessonId = schedule.lessonId?.startsWith?.("virtual-lesson-")
            ? null
            : schedule.lessonId;

          return {
            learner_id: learnerId,
            course_id: courseId,
            lesson_id: lessonId,
            instructor_id: schedule.instructorId,
            date: schedule.date.toISOString().split("T")[0],
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            enabled: true,
            otp: schedule.otp,
            otp_end: schedule.otp_end,
            calendar_uid: schedule.calendar_uid || "",
            calendar_sequence: schedule.calendar_sequence || 0,
          };
        }),
      );

      if (error) throw error;

      // Step 4: Renumber lessons (only for new schedules, not reschedules)
      if (!rescheduleLessonNumber && !isVirtualLessons && courseId) {
        const { data: allSchedules, error: fetchError } = await supabase
          .from("Schedule")
          .select("id, date, start_time, Lesson!inner(id, number)")
          .eq("learner_id", learnerId)
          .eq("course_id", courseId)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true });

        if (!fetchError && allSchedules && allSchedules.length > 0) {
          const sortedSchedules = [...allSchedules].sort(
            (a, b) =>
              new Date(`${a.date}T${a.start_time}`).getTime() -
              new Date(`${b.date}T${b.start_time}`).getTime(),
          );

          const updates = sortedSchedules
            .map((s, i) => ({
              lessonId: s.Lesson?.id,
              current: s.Lesson?.number,
              next: i + 1,
            }))
            .filter((u) => u.lessonId && u.current !== u.next);

          if (updates.length > 0) {
            // Two-pass update to avoid unique constraint (course_id, number) conflicts:
            // Pass 1: Set all to temporary high numbers
            await Promise.all(
              updates.map((u, i) =>
                supabase
                  .from("Lesson")
                  .update({ number: 1000 + i })
                  .eq("id", u.lessonId),
              ),
            );
            // Pass 2: Set to final correct numbers
            await Promise.all(
              updates.map((u) =>
                supabase
                  .from("Lesson")
                  .update({ number: u.next })
                  .eq("id", u.lessonId),
              ),
            );
          }
        }
      }
    },
    onSuccess: () => {
      // Invalidate every place a freshly-created schedule could surface, so
      // the just-scheduled learner appears immediately in Active Learners
      // and the New Schedule list refreshes. The bare refetchActiveLearners
      // call in handleScheduleCreate is kept as a belt-and-suspenders.
      queryClient.invalidateQueries({ queryKey: ["activeLearners"] });
      queryClient.invalidateQueries({ queryKey: ["scheduling-requests"] });
    },
  });

  const handleActiveLearnerSelect = (learner: any) => {
    console.log("Selected active Learner:", learner);
    if (selectedRequest?.id === learner.id) {
      handleOpenLearnerInfo({
        id: learner.id || "",
        name: learner.name || "",
        phone: learner.phone || "",
        email: learner.email || "",
        area: learner.area || "",
        pick_up_location: learner.pick_up_location,
        pincode: learner.pincode,
        signed_up: learner.signed_up,
        created_at: learner.created_at,
        address_lat: learner.address_lat,
        address_lng: learner.address_lng,
        preferred_start_date: learner.preferred_start_date,
        preferred_completion_days: learner.preferred_completion_days,
        prefers_two_hour_classes: learner.prefers_two_hour_classes,
        preferred_two_hour_days: learner.two_hour_days,
        DL_test_date: learner.DL_test_date,
      });
    } else {
      // Otherwise, just select the learner
      setSelectedRequest(learner);
      // reset instructor selection
      setSelectedInstructorId("");
    }
  };

  const handleRequestSelect = (request: SchedulingRequests[number]) => {
    // If this request is already selected, open the dialog
    if (selectedRequest?.id === request.id) {
      handleOpenLearnerInfo({
        id: request.Learner?.id || "",
        name: request.Learner?.name || "",
        phone: request.Learner?.phone || "",
        email: request.Learner?.email || "",
        area: request.Learner?.area || "",
        pick_up_location: request.Learner?.pick_up_location,
        pincode: request.Learner?.pincode,
        signed_up: request.Learner?.signed_up,
        created_at: request.Learner?.created_at,
        address_lat: request.Learner?.address_lat,
        address_lng: request.Learner?.address_lng,
        preferred_start_date: request.Learner?.preferred_start_date,
        preferred_completion_days: request.Learner?.preferred_completion_days,
        prefers_two_hour_classes: request.Learner?.prefers_two_hour_classes,
        preferred_two_hour_days: request.Learner?.two_hour_days,
        DL_test_date: request.Learner?.DL_test_date,
      });
    } else {
      // Otherwise, just select the request
      setSelectedRequest(request);
    }
  };
  const handleOpenLearnerInfo = (learner: LearnerInfo) => {
    setSelectedLearnerForDialog(learner);
    setDialogOpen(true);
  };

  const handleScheduleCreate = async (
    schedules: Schedule[],
    courseId: string | null,
  ) => {
    if (!selectedRequest) return;

    // For lesson10 requests, only allow one lesson and ensure it's lesson 10
    if ((selectedRequest.type as string) === "lesson10") {
      if (schedules.length > 1) {
        toast({
          title: "Error",
          description:
            "Only one lesson can be scheduled for 10th lesson requests",
          variant: "destructive",
        });
        return;
      }

      if (schedules[0]?.lessonNumber !== 10) {
        toast({
          title: "Error",
          description: "You can only schedule lesson 10 for this request",
          variant: "destructive",
        });
        return;
      }
    }

    const rescheduleLessonNumber =
      (selectedRequest.type as string) === "reschedule" ||
      (selectedRequest.type as string) === "lesson10"
        ? Math.min(...schedules.map((s) => s.lessonNumber))
        : 1;

    // Capture the request at mutation time to avoid race conditions
    // (selectedRequest can be cleared by useEffect before onSuccess runs)
    const currentRequest = selectedRequest;

    try {
      await createScheduleMutation.mutateAsync({
        learnerId: selectedRequest.learner_id,
        schedules,
        courseId,
        rescheduleLessonNumber,
      });

      // Refetch the Active Learners list — its 30s staleTime would otherwise
      // hide the just-scheduled learner until the cache expired.
      refetchActiveLearners();

      toast({
        title: "Schedule created",
        description: "The schedule has been created successfully.",
      });
      console.log(
        "Schedule mutation succeeded, completing reschedule request:",
        currentRequest?.id,
      );

      if (currentRequest) {
        // Complete request + send notification in parallel (fire-and-forget notification)
        const notificationBody =
          currentRequest.type === "new"
            ? {
                message_type: "SCHEDULE_PREPARED",
                learner_id: currentRequest.learner_id,
                start_date: format(new Date(schedules[0].date), "dd/MM/yyyy"),
                start_time: schedules[0].start_time,
              }
            : currentRequest.type === "reschedule"
              ? {
                  message_type: "WEBAPP_RESCHEDULE_DONE_CHECK_NEW_SCHEDULE",
                  learner_id: currentRequest.learner_id,
                }
              : currentRequest.type === "lesson10"
                ? {
                    message_type: "WEBAPP_LESSON_10_SCHEDULED",
                    learner_id: currentRequest.learner_id,
                  }
                : null;

        try {
          await Promise.all([
            completeRescheduleRequestMutation.mutateAsync({
              requestId: currentRequest.id,
            }),
            notificationBody
              ? supabase.functions.invoke("send-message", {
                  body: notificationBody,
                })
              : Promise.resolve(),
          ]);
        } catch (error) {
          console.error("Error completing reschedule request:", error);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const newRequests = useMemo(
    () => requests?.filter((r) => (r.type as string) === "new"),
    [requests],
  );
  const newRequestLearnerIds = useMemo(
    () =>
      Array.from(
        new Set(
          (newRequests || [])
            .map((r) => r.learner_id)
            .filter((id): id is string => !!id),
        ),
      ),
    [newRequests],
  );
  const { data: enrollmentTypeMap } =
    useEnrollmentTypesByLearner(newRequestLearnerIds);
  const getEnrollmentType = (learnerId: string | null | undefined) =>
    (learnerId && enrollmentTypeMap?.get(learnerId)?.type) || null;
  const getEnrollmentHours = (learnerId: string | null | undefined) =>
    (learnerId && enrollmentTypeMap?.get(learnerId)?.hours) || null;
  const newCourseRequests = useMemo(
    () =>
      newRequests?.filter((r) => {
        const t = getEnrollmentType(r.learner_id);
        return t !== "demo" && t !== "topup";
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [newRequests, enrollmentTypeMap],
  );
  const newDemoRequests = useMemo(
    () =>
      newRequests?.filter((r) => getEnrollmentType(r.learner_id) === "demo"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [newRequests, enrollmentTypeMap],
  );
  const newTopupRequests = useMemo(
    () =>
      newRequests?.filter((r) => getEnrollmentType(r.learner_id) === "topup"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [newRequests, enrollmentTypeMap],
  );
  const filteredNewRequests = useMemo(() => {
    if (!newRequests) return newRequests;
    if (newRequestFilter === "course") return newCourseRequests;
    if (newRequestFilter === "demo") return newDemoRequests;
    if (newRequestFilter === "topup") return newTopupRequests;
    return newRequests;
  }, [
    newRequestFilter,
    newRequests,
    newCourseRequests,
    newDemoRequests,
    newTopupRequests,
  ]);
  const rescheduleRequests = useMemo(
    () => requests?.filter((r) => (r.type as string) === "reschedule"),
    [requests],
  );

  const tenthLessonRequests = useMemo(
    () => requests?.filter((r) => (r.type as string) === "lesson10"),
    [requests],
  );

  const [instructorData, setInstructorData] = useState<any[]>([]);

  // Fetch learners with active enrollment and their schedules
  // Fetch instructors separately (they rarely change)
  const { data: fetchedInstructorData } = useQuery({
    queryKey: ["all-instructors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Instructor").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (fetchedInstructorData) {
      setInstructorData(fetchedInstructorData);
    }
  }, [fetchedInstructorData]);

  // Fetch learners with active enrollment and their schedules
  const {
    data: activeLearners,
    isLoading: isLoadingActiveLearners,
    refetch: refetchActiveLearners,
  } = useQuery({
    queryKey: ["activeLearners"],
    queryFn: async () => {
      // First, get active enrollment learner IDs with progress info.
      // PostgREST defaults to 1000 rows per response; with growing learner
      // counts that silently truncates the result and the most recently
      // paid learners can fall off the list. Page through in chunks of
      // 1000 to make sure we get everything.
      const enrollmentData: Array<{
        learner_id: string;
        progress: any;
        Courses: {
          total_lessons: number | null;
          duration: number | null;
        } | null;
      }> = [];
      const ENROLLMENT_PAGE = 1000;
      for (let page = 0; ; page++) {
        const from = page * ENROLLMENT_PAGE;
        const to = from + ENROLLMENT_PAGE - 1;
        const { data, error } = await supabase
          .from("enrollment")
          .select("learner_id, progress, Courses(total_lessons, duration)")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .range(from, to);
        if (error) throw error;
        if (!data || data.length === 0) break;
        enrollmentData.push(...(data as any));
        if (data.length < ENROLLMENT_PAGE) break;
      }

      // Deduplicate learner IDs (a learner may have multiple enrollments)
      const learnerIds = [...new Set(enrollmentData.map((e) => e.learner_id))];
      console.log(
        `[activeLearners] enrollments=${enrollmentData.length}, unique learners=${learnerIds.length}`,
      );

      // Batch learner IDs into chunks to avoid URL length limits
      const BATCH_SIZE = 50;
      const batches: string[][] = [];
      for (let i = 0; i < learnerIds.length; i += BATCH_SIZE) {
        batches.push(learnerIds.slice(i, i + BATCH_SIZE));
      }

      // Use allSettled so one failed batch can't wipe out the entire list.
      // A single batch erroring out previously caused Promise.all to reject,
      // which left activeLearners empty even when most batches succeeded.
      const batchResults = await Promise.allSettled(
        batches.map(async (batch) => {
          const { data, error } = await supabase
            .from("Learner")
            .select(
              `
              id,
              name,
              area,
              phone,
              email,
              preferred_start_date,
              preferred_completion_days,
              prefers_two_hour_classes,
              two_hour_days,
              DL_test_date,
              pick_up_location,
              created_at,
              address_lat,
              address_lng,

              schedules:Schedule(
                id,
                date,
                start_time,
                end_time,
                instructor_id,
                lesson_id,
                course_id,
                learner_id,
                status,
                started_at,
                ended_at,
                Lesson(
                  id,
                  number
                ),
                Instructor(
                  name
                )
              )
            `,
            )
            .in("id", batch)
            .order("created_at", { ascending: false });

          if (error) throw error;
          return data ?? [];
        }),
      );

      const learnersData = batchResults.flatMap((r, i) => {
        if (r.status === "fulfilled") return r.value;
        console.error(
          `[activeLearners] batch ${i} failed (${batches[i].length} learners dropped):`,
          r.reason,
        );
        return [];
      });
      console.log(
        `[activeLearners] fetched ${learnersData.length} learners across ${batches.length} batches`,
      );

      // Build a set of demo learner IDs
      const demoLearnerIds = new Set(
        enrollmentData
          .filter((e: any) => e.progress?.type === "demo")
          .map((e: any) => e.learner_id),
      );

      // Build map of learner_id -> total allotted lessons
      const learnerTotalLessons: Record<string, number> = {};
      enrollmentData.forEach((e: any) => {
        const total =
          e.Courses?.total_lessons ||
          e.Courses?.duration ||
          e.progress?.total_hours ||
          10;
        // Use the max if learner has multiple enrollments
        learnerTotalLessons[e.learner_id] = Math.max(
          learnerTotalLessons[e.learner_id] || 0,
          total,
        );
      });

      // Show every learner with an active enrollment. The earlier filter
      // required learner.schedules.length > 0 OR demo, which dropped course
      // learners whose schedule join silently came back empty (e.g. response
      // size truncation when many learners × many schedules are joined in
      // one batched query). learnersData is already scoped to active
      // enrollments, so no further filter is needed.
      const learnersWithSchedules = learnersData;

      // Tag demo learners, completion status, and topup payment status
      learnersWithSchedules.forEach((learner: any) => {
        learner.isDemo = demoLearnerIds.has(learner.id);
        const totalLessons = learnerTotalLessons[learner.id] || 10;
        const completedCount =
          learner.schedules?.filter((s: any) => s.status === "completed")
            .length || 0;
        learner.totalLessons = totalLessons;
        learner.completedLessons = completedCount;
        learner.isAllCompleted = completedCount >= totalLessons;
        learner.hasTopupPending =
          learner.schedules?.some((s: any) => s.status === "pending_payment") ||
          false;
      });

      // Sort by created_at descending (since batching may lose overall order)
      learnersWithSchedules.sort((a, b) =>
        (b.created_at ?? "").localeCompare(a.created_at ?? ""),
      );

      return learnersWithSchedules;
    },
    keepPreviousData: true,
    staleTime: 30 * 1000, // 30 seconds - avoid unnecessary refetches
  });

  //useEffect(() => {
  //console.log('Active Learners updated:', activeLearners);
  //}, [activeLearners]);

  const handleTabChange = (value: string) => {
    // Reset selectedRequest when changing tabs
    setSelectedRequest(null);
  };

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedInstructorId, setSelectedInstructorId] = useState<
    string | null
  >(null);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(
    null,
  );

  // Inside your main Dashboard/Tabs component
  const [selectedFilterInstructorId, setSelectedFilterInstructorId] =
    useState<string>("");

  // This handles the "Clearing" logic
  const handleInstructorChange = (id: string) => {
    setSelectedInstructorId(id);
    setSelectedLearnerId(null); // Clear the right bar (Schedules)
    // The left bar (Learner List) will automatically filter based on this ID
  };
  console.log(activeLearners);
  const filteredLearners = activeLearners?.filter((learner) => {
    const search = searchTerm.toLowerCase();
    const learnerMatches =
      learner.name?.toLowerCase().includes(search) ||
      learner.email?.toLowerCase().includes(search) ||
      learner.phone?.includes(searchTerm);
    return learnerMatches;
  });

  // Split into active (still in progress) vs completed (all lessons done)
  const activeOnlyLearners = filteredLearners?.filter(
    (l: any) => !l.isAllCompleted,
  );
  const completedLearners = filteredLearners?.filter(
    (l: any) => l.isAllCompleted,
  );

  // Export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportLearnerCount, setExportLearnerCount] = useState<string>("all");
  const [exportSchedulePeriod, setExportSchedulePeriod] =
    useState<string>("all");
  const [exportStatuses, setExportStatuses] = useState<string[]>([
    "booked",
    "ongoing",
    "completed",
    "cancelled",
  ]);

  const toggleExportStatus = (status: string) => {
    setExportStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const handleExportActiveLearnersCsv = () => {
    if (!activeLearners || activeLearners.length === 0) return;

    // 1. Apply instructor filter from the main UI
    let learnersToExport = activeLearners.filter((learner) => {
      if (!selectedFilterInstructorId) return true;
      return learner.schedules?.some(
        (s) => s.instructor_id === selectedFilterInstructorId,
      );
    });

    // 2. Apply learner count limit
    if (exportLearnerCount !== "all") {
      const count = parseInt(exportLearnerCount, 10);
      learnersToExport = learnersToExport.slice(0, count);
    }

    // 3. Determine schedule date cutoff
    let dateCutoff: Date | null = null;
    if (exportSchedulePeriod !== "all") {
      dateCutoff = new Date();
      dateCutoff.setDate(
        dateCutoff.getDate() - parseInt(exportSchedulePeriod, 10),
      );
    }

    // Build one row per schedule entry so each lesson is its own row
    const rows: string[][] = [];
    const headers = [
      "Learner Name",
      "Email",
      "Phone",
      "Area",
      "Pick-up Location",
      "Preferred Start Date",
      "Preferred Completion Days",
      "Prefers 2-Hour Classes",
      "2-Hour Days",
      "DL Test Date",
      "Created At",
      "Lesson Number",
      "Schedule Date",
      "Start Time",
      "End Time",
      "Schedule Status",
      "Instructor Name",
    ];
    rows.push(headers);

    const buildLearnerCells = (learner: (typeof learnersToExport)[0]) => [
      learner.name || "",
      learner.email || "",
      learner.phone || "",
      learner.area || "",
      learner.pick_up_location || "",
      learner.preferred_start_date || "",
      learner.preferred_completion_days?.toString() || "",
      learner.prefers_two_hour_classes ? "Yes" : "No",
      learner.two_hour_days || "",
      learner.DL_test_date || "",
      learner.created_at || "",
    ];

    for (const learner of learnersToExport) {
      // Filter schedules by status and date period
      const filteredSchedules = [...(learner.schedules || [])]
        .filter((s) => {
          if (
            exportStatuses.length > 0 &&
            !exportStatuses.includes(s.status || "")
          )
            return false;
          if (dateCutoff && s.date) {
            const scheduleDate = new Date(s.date);
            if (scheduleDate < dateCutoff) return false;
          }
          return true;
        })
        .sort((a, b) => (a.Lesson?.number ?? 0) - (b.Lesson?.number ?? 0));

      if (filteredSchedules.length === 0) {
        // Still include learner row with empty schedule columns
        rows.push([...buildLearnerCells(learner), "", "", "", "", "", ""]);
      } else {
        for (const schedule of filteredSchedules) {
          rows.push([
            ...buildLearnerCells(learner),
            schedule.Lesson?.number?.toString() || "",
            schedule.date || "",
            schedule.start_time || "",
            schedule.end_time || "",
            schedule.status || "",
            schedule.Instructor?.name || "",
          ]);
        }
      }
    }

    // Convert to CSV string with proper escaping
    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `active_learners_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportDialog(false);
  };

  return (
    <div
      className="h-flex flex min-h-screen flex-col bg-white p-4"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="border-b bg-white px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Schedule Management</h1>
          </div>
        </div>
      </div>

      <Tabs
        defaultValue="active"
        className="flex h-[calc(100%-73px)] flex-col"
        onValueChange={handleTabChange}
      >
        <div className="border-b px-4">
          <TabsList>
            <TabsTrigger value="new">
              New Schedules {newRequests?.length || 0}
            </TabsTrigger>
            <TabsTrigger value="reschedule">
              Reschedule Requests {rescheduleRequests?.length || 0}
            </TabsTrigger>
            <TabsTrigger value="lesson10">
              10th Lesson Requests {tenthLessonRequests?.length || 0}
            </TabsTrigger>
            <TabsTrigger value="active">
              Active Learners {activeOnlyLearners?.length || 0}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed Learners {completedLearners?.length || 0}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="new" className="h-full">
            <div className="grid h-full grid-cols-12 gap-2 p-4">
              {/* Learners List */}
              <Card className="col-span-2">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">
                    Learners Needing Schedule
                  </CardTitle>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(
                      [
                        ["all", newRequests?.length ?? 0],
                        ["course", newCourseRequests?.length ?? 0],
                        ["demo", newDemoRequests?.length ?? 0],
                        ["topup", newTopupRequests?.length ?? 0],
                      ] as const
                    ).map(([key, count]) => (
                      <button
                        key={key}
                        onClick={() => setNewRequestFilter(key)}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide transition ${
                          newRequestFilter === key
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                      >
                        {key} {count}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    {filteredNewRequests?.map((request) => {
                      const enrollmentType = getEnrollmentType(
                        request.learner_id,
                      );
                      const enrollmentHours = getEnrollmentHours(
                        request.learner_id,
                      );
                      return (
                        <div key={request.id} className="relative mb-2">
                          {(enrollmentType === "demo" ||
                            enrollmentType === "topup") && (
                            <span
                              className={`absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                                enrollmentType === "demo"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-purple-100 text-purple-700"
                              }`}
                            >
                              {enrollmentType === "topup"
                                ? `Topup${enrollmentHours ? ` ${enrollmentHours}h` : ""}`
                                : "Demo"}
                            </span>
                          )}
                          <LearnerInfoCard
                            learner={{
                              id: request.Learner?.id || "",
                              name: request.Learner?.name || "",
                              phone: request.Learner?.phone || "",
                              email: request.Learner?.email || "",
                              area: request.Learner?.area || "",
                              pick_up_location:
                                request.Learner?.pick_up_location,
                              pincode: request.Learner?.pincode,
                              signed_up: request.Learner?.signed_up,
                              created_at: request.Learner?.created_at,
                              address_lat: request.Learner?.address_lat,
                              address_lng: request.Learner?.address_lng,
                              preferred_start_date:
                                request.Learner?.preferred_start_date,
                              preferred_completion_days:
                                request.Learner?.preferred_completion_days,
                              prefers_two_hour_classes:
                                request.Learner?.prefers_two_hour_classes,
                              preferred_two_hour_days:
                                request.Learner?.two_hour_days,
                              DL_test_date: request.Learner?.DL_test_date,
                            }}
                            compact={true}
                            onClick={(learner) => {
                              handleRequestSelect(request);
                            }}
                          />
                        </div>
                      );
                    })}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Schedule Creation */}
              <Card className="col-span-10">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">
                    {selectedRequest
                      ? `${selectedRequest.Learner?.name}'s Schedule`
                      : "Select a Learner"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {selectedRequest ? (
                    <p className="mb-2 text-sm text-gray-500">
                      Distance measured from Instructor's base location to the
                      selected learner location
                      <br />
                      Click on a slot to measure distances from previous booking
                      of Instructor to learner
                    </p>
                  ) : (
                    ""
                  )}

                  {selectedRequest ? (
                    <CreateScheduleWithInstructor
                      learnerId={selectedRequest.Learner?.id || ""}
                      learnerArea={
                        selectedRequest.Learner?.area || "Indiranagar"
                      }
                      request={selectedRequest}
                      onScheduleCreate={handleScheduleCreate}
                    />
                  ) : (
                    <div className="flex h-[calc(100vh-280px)] items-center justify-center text-gray-500">
                      Select a learner to create their schedule
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reschedule" className="h-full">
            <div className="grid h-full grid-cols-12 gap-2 p-4">
              {/* Learners List */}
              <Card className="md:col-span-2">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">Reschedule Requests</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <ScrollArea className="h-[calc(100vh-240px)]">
                    {rescheduleRequests?.map((request) => (
                      <div key={request.id} className="mb-2">
                        <LearnerInfoCard
                          learner={{
                            id: request.Learner?.id || "",
                            name: request.Learner?.name || "",
                            phone: request.Learner?.phone || "",
                            email: request.Learner?.email || "",
                            area: request.Learner?.area || "",
                            pick_up_location: request.Learner?.pick_up_location,
                            pincode: request.Learner?.pincode,
                            signed_up: request.Learner?.signed_up,
                            created_at: request.Learner?.created_at,
                            address_lat: request.Learner?.address_lat,
                            address_lng: request.Learner?.address_lng,
                            preferred_start_date:
                              request.Learner?.preferred_start_date,
                            preferred_completion_days:
                              request.Learner?.preferred_completion_days,
                            prefers_two_hour_classes:
                              request.Learner?.prefers_two_hour_classes,
                            preferred_two_hour_days:
                              request?.Learner?.two_hour_days,
                            DL_test_date: request.Learner?.DL_test_date,
                          }}
                          compact={true}
                          onClick={(learner) => {
                            handleRequestSelect(request);
                          }}
                        />
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Schedule Creation */}
              <Card className="md:col-span-10">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">
                    {selectedRequest
                      ? `${selectedRequest.Learner?.name}'s Schedule`
                      : "Select a Learner"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {selectedRequest ? (
                    <CreateSchedule
                      request={selectedRequest}
                      learnerId={selectedRequest.Learner?.id || ""}
                      learnerArea={
                        selectedRequest.Learner?.area || "Indiranagar"
                      }
                      onScheduleCreate={handleScheduleCreate}
                    />
                  ) : (
                    <div className="flex h-[calc(100vh-240px)] items-center justify-center text-gray-500">
                      Select a learner to create their schedule
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="lesson10" className="h-full">
            <div className="grid h-full grid-cols-12 gap-2 p-4">
              {/* Learners List */}
              <Card className="md:col-span-2">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">
                    10th Lesson Requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <ScrollArea className="h-[calc(100vh-240px)]">
                    {tenthLessonRequests?.map((request) => (
                      <div key={request.id} className="mb-2">
                        <LearnerInfoCard
                          learner={{
                            id: request.Learner?.id || "",
                            name: request.Learner?.name || "",
                            phone: request.Learner?.phone || "",
                            email: request.Learner?.email || "",
                            area: request.Learner?.area || "",
                            pick_up_location: request.Learner?.pick_up_location,
                            pincode: request.Learner?.pincode,
                            signed_up: request.Learner?.signed_up,
                            created_at: request.Learner?.created_at,
                            address_lat: request.Learner?.address_lat,
                            address_lng: request.Learner?.address_lng,
                            preferred_start_date:
                              request.Learner?.preferred_start_date,
                            preferred_completion_days:
                              request.Learner?.preferred_completion_days,
                            prefers_two_hour_classes:
                              request.Learner?.prefers_two_hour_classes,
                            preferred_two_hour_days:
                              request.Learner?.two_hour_days,
                            DL_test_date: request.Learner?.DL_test_date,
                          }}
                          compact={true}
                          onClick={(learner) => {
                            handleRequestSelect(request);
                          }}
                        />
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Schedule Creation */}
              <Card className="md:col-span-10">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">
                    {selectedRequest
                      ? `${selectedRequest.Learner?.name}'s Schedule`
                      : "Select a Learner"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {selectedRequest ? (
                    <CreateSchedule
                      request={selectedRequest}
                      learnerId={selectedRequest.Learner?.id || ""}
                      learnerArea={
                        selectedRequest.Learner?.area || "Indiranagar"
                      }
                      onScheduleCreate={handleScheduleCreate}
                    />
                  ) : (
                    <div className="flex h-[calc(100vh-240px)] items-center justify-center text-gray-500">
                      Select a learner to create their schedule
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="active" className="h-full space-y-2">
            {/* TOP BAR: Instructor Filter */}
            <div className="px-4 pt-2">
              <div className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Users size={18} className="text-indigo-600" />
                  <span>Filter by Instructor:</span>
                </div>
                <Select
                  value={selectedFilterInstructorId || "all"}
                  onValueChange={(val) => {
                    setSelectedFilterInstructorId(val === "all" ? "" : val);
                    setSelectedRequest(null); // Clear right bar when instructor changes
                  }}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="All Instructors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Instructors</SelectItem>
                    {instructorData?.map((ins) => (
                      <SelectItem
                        key={ins.id_instructor}
                        value={ins.id_instructor}
                      >
                        {ins.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExportDialog(true)}
                    disabled={!activeLearners || activeLearners.length === 0}
                  >
                    <Download size={16} className="mr-2" />
                    Export CSV
                  </Button>
                </div>

                {/* Export Filters Dialog */}
                <Dialog
                  open={showExportDialog}
                  onOpenChange={setShowExportDialog}
                >
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Export Active Learners</DialogTitle>
                      <DialogDescription>
                        Choose filters to customize your CSV export.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                      {/* Learner Count */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Number of Learners
                        </label>
                        <Select
                          value={exportLearnerCount}
                          onValueChange={setExportLearnerCount}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">
                              Latest 10 Learners
                            </SelectItem>
                            <SelectItem value="25">
                              Latest 25 Learners
                            </SelectItem>
                            <SelectItem value="50">
                              Latest 50 Learners
                            </SelectItem>
                            <SelectItem value="100">
                              Latest 100 Learners
                            </SelectItem>
                            <SelectItem value="all">All Learners</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Schedule Date Period */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Schedule Period
                        </label>
                        <Select
                          value={exportSchedulePeriod}
                          onValueChange={setExportSchedulePeriod}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">Last 7 Days</SelectItem>
                            <SelectItem value="10">Last 10 Days</SelectItem>
                            <SelectItem value="30">Last 30 Days</SelectItem>
                            <SelectItem value="60">Last 60 Days</SelectItem>
                            <SelectItem value="90">Last 90 Days</SelectItem>
                            <SelectItem value="all">All Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Lesson Status Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Lesson Status
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: "booked", label: "Booked" },
                            { value: "ongoing", label: "Ongoing" },
                            { value: "completed", label: "Completed" },
                            { value: "cancelled", label: "Cancelled" },
                          ].map((status) => (
                            <label
                              key={status.value}
                              className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              <input
                                type="checkbox"
                                checked={exportStatuses.includes(status.value)}
                                onChange={() =>
                                  toggleExportStatus(status.value)
                                }
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                              />
                              {status.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">
                        Export{" "}
                        <span className="font-medium">
                          {exportLearnerCount === "all"
                            ? `all ${activeLearners?.length || 0}`
                            : `latest ${exportLearnerCount}`}
                        </span>{" "}
                        learners with{" "}
                        <span className="font-medium">
                          {exportStatuses.length === 4
                            ? "all"
                            : exportStatuses.length === 0
                              ? "no"
                              : exportStatuses.join(", ")}
                        </span>{" "}
                        lesson statuses from{" "}
                        <span className="font-medium">
                          {exportSchedulePeriod === "all"
                            ? "all time"
                            : `last ${exportSchedulePeriod} days`}
                        </span>
                        {selectedFilterInstructorId && (
                          <>
                            , filtered by{" "}
                            <span className="font-medium">
                              {instructorData?.find(
                                (i) =>
                                  i.id_instructor ===
                                  selectedFilterInstructorId,
                              )?.name || "selected instructor"}
                            </span>
                          </>
                        )}
                        .
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowExportDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleExportActiveLearnersCsv}
                        disabled={exportStatuses.length === 0}
                      >
                        <Download size={16} className="mr-2" />
                        Download CSV
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* MAIN CONTENT: Left and Right Bars */}
            <div className="grid h-full grid-cols-1 gap-2 p-4 pt-0 md:grid-cols-3">
              {/* LEFT BAR: Learners List */}
              <Card className="md:col-span-1">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm">Active Learners</CardTitle>
                  <div className="mt-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search..."
                        className="h-8 pl-8 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    {isLoadingActiveLearners ? (
                      <div className="flex items-center justify-center py-10 text-gray-500">
                        <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </div>
                    ) : activeOnlyLearners?.length === 0 ? (
                      <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                        No learners found matching "{searchTerm}"
                      </div>
                    ) : (
                      activeOnlyLearners
                        // Filter learners locally if an instructor is selected
                        ?.filter((learner) => {
                          if (!selectedFilterInstructorId) return true;
                          // Assumes learner object has a schedule join or instructor_id reference
                          return learner.schedules?.some(
                            (s) =>
                              s.instructor_id === selectedFilterInstructorId,
                          );
                        })
                        .map((learner) => (
                          <div key={learner.id} className="mb-2">
                            <div className="relative">
                              {(learner as any).isDemo && (
                                <span className="absolute -top-1 right-1 z-10 rounded bg-purple-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                  DEMO
                                </span>
                              )}
                              {(learner as any).hasTopupPending && (
                                <span className="absolute -top-1 left-1 z-10 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                  ₹ PENDING
                                </span>
                              )}
                              <LearnerInfoCard
                                learner={{
                                  id: learner.id || "",
                                  name: learner.name || "",
                                }}
                                // Highlight the selected learner
                                className={
                                  selectedRequest?.id === learner.id
                                    ? "border-indigo-500 bg-indigo-50"
                                    : (learner as any).isDemo
                                      ? "border-purple-300"
                                      : ""
                                }
                                compact={true}
                                onClick={() =>
                                  handleActiveLearnerSelect(learner)
                                }
                              />
                            </div>
                          </div>
                        ))
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* RIGHT BAR: Schedule Management Integrated Component */}
              <div className="md:col-span-2">
                {selectedRequest ? (
                  <LearnerSchedulesManager
                    key={selectedRequest.id} // Key ensures component re-mounts/refreshes for new learner
                    learnerId={selectedRequest.id}
                    instructorData={instructorData}
                    isDemo={(selectedRequest as any).isDemo || false}
                  />
                ) : (
                  <Card className="h-full border-dashed">
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm text-gray-400">
                        Schedule Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="flex h-[calc(100vh-280px)] flex-col items-center justify-center text-center text-gray-400">
                        <div className="mb-3 rounded-full bg-gray-50 p-4">
                          <Users size={36} className="text-gray-200" />
                        </div>
                        <p className="max-w-[250px] text-sm">
                          Select a learner from the list to manage their
                          schedule and instructor assignments.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Completed Learners Tab */}
          <TabsContent value="completed" className="h-full space-y-2">
            <div className="grid h-full grid-cols-1 gap-2 p-4 md:grid-cols-3">
              {/* LEFT BAR: Completed Learners List */}
              <Card className="md:col-span-1">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm">Completed Learners</CardTitle>
                  <div className="mt-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search..."
                        className="h-8 pl-8 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    {isLoadingActiveLearners ? (
                      <div className="flex items-center justify-center py-10 text-gray-500">
                        <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </div>
                    ) : completedLearners?.length === 0 ? (
                      <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                        No completed learners found
                      </div>
                    ) : (
                      completedLearners?.map((learner) => (
                        <div key={learner.id} className="mb-2">
                          <div className="relative">
                            <span className="absolute -top-1 right-1 z-10 rounded bg-green-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                              {(learner as any).completedLessons}/
                              {(learner as any).totalLessons}
                            </span>
                            <LearnerInfoCard
                              learner={{
                                id: learner.id || "",
                                name: learner.name || "",
                              }}
                              className={
                                selectedRequest?.id === learner.id
                                  ? "border-green-500 bg-green-50"
                                  : "border-green-200"
                              }
                              compact={true}
                              onClick={() => handleActiveLearnerSelect(learner)}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* RIGHT BAR: Schedule Details */}
              <div className="md:col-span-2">
                {selectedRequest ? (
                  <LearnerSchedulesManager
                    key={selectedRequest.id}
                    learnerId={selectedRequest.id}
                    instructorData={instructorData}
                    isDemo={(selectedRequest as any).isDemo || false}
                  />
                ) : (
                  <Card className="h-full border-dashed">
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm text-gray-400">
                        Schedule Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="flex h-[calc(100vh-280px)] flex-col items-center justify-center text-center text-gray-400">
                        <div className="mb-3 rounded-full bg-gray-50 p-4">
                          <Users size={36} className="text-gray-200" />
                        </div>
                        <p className="max-w-[250px] text-sm">
                          Select a completed learner to view their schedule
                          history.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
      {selectedLearnerForDialog && (
        <LearnerInfoDialog
          learner={selectedLearnerForDialog}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}

interface InstructorFilterProps {
  instructors: any[];
  selectedInstructorId: string | null;
  onInstructorChange: (id: string) => void;
}

export const InstructorFilter = ({
  instructors,
  selectedInstructorId,
  onInstructorChange,
}: InstructorFilterProps) => {
  return (
    <div className="mb-6 flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Users size={18} className="text-indigo-600" />
        <span>Filter by Instructor:</span>
      </div>
      <Select
        value={selectedInstructorId || "all"}
        onValueChange={(val) => onInstructorChange(val === "all" ? "" : val)}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="All Instructors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Instructors</SelectItem>
          {instructors.map((ins) => (
            <SelectItem key={ins.id_instructor} value={ins.id_instructor}>
              {ins.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedInstructorId && (
        <span className="text-xs text-gray-400 animate-in fade-in">
          Showing learners assigned to this instructor
        </span>
      )}
    </div>
  );
};

interface LearnerSchedulesManagerProps {
  learnerId: string;
  instructorData: any[];
  isDemo?: boolean;
}

export const LearnerSchedulesManager = ({
  learnerId,
  instructorData,
  isDemo = false,
}: LearnerSchedulesManagerProps) => {
  const [learner, setLearner] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Modal States
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [isInstructorChangeModalOpen, setIsInstructorChangeModalOpen] =
    useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedInstructorId, setSelectedInstructorId] = useState("");
  const [instructorChangeFromLesson, setInstructorChangeFromLesson] = useState<
    number | null
  >(null);
  const [instructorChangeToLesson, setInstructorChangeToLesson] = useState<
    number | null
  >(null);
  const [pendingNotification, setPendingNotification] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [isTopupDialogOpen, setIsTopupDialogOpen] = useState(false);
  const [routeMapScheduleId, setRouteMapScheduleId] = useState<number | null>(
    null,
  );
  const [routeMapLabel, setRouteMapLabel] = useState("");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeSelectedCourse, setUpgradeSelectedCourse] = useState("");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [topupTotalClasses, setTopupTotalClasses] = useState(1);
  const completeRescheduleRequestMutation =
    useMutationCompleteRescheduleRequest();
  const [topupSlots, setTopupSlots] = useState<
    Array<{
      date: string;
      start_time: string;
      end_time: string;
      duration: number; // 1 or 2 hours (2hr = 2 classes)
      instructor_id: string;
    }>
  >([
    { date: "", start_time: "", end_time: "", duration: 1, instructor_id: "" },
  ]);
  const [topupLessonId, setTopupLessonId] = useState<string>("");
  const [topupLessons, setTopupLessons] = useState<
    Array<{
      id: string;
      number: number | null;
      description: string | null;
      duration: number | null;
    }>
  >([]);

  // Populate the topup lesson dropdown when the dialog opens. Resolve a
  // course even when the learner's topup enrollment has course_id = null,
  // and fall back to all lessons so the list is never empty.
  useEffect(() => {
    if (!isTopupDialogOpen || isDemo) return;
    let cancelled = false;
    (async () => {
      let resolvedCourseId =
        learner?.schedules?.find((s: any) => s.course_id)?.course_id ?? null;
      if (!resolvedCourseId && learnerId) {
        const { data: courseEnroll } = await supabase
          .from("enrollment")
          .select("course_id")
          .eq("learner_id", learnerId)
          .not("course_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        resolvedCourseId = courseEnroll?.course_id ?? null;
      }
      let lessonQuery = supabase
        .from("Lesson")
        .select("id, number, description, duration")
        .order("number", { ascending: true });
      if (resolvedCourseId) {
        lessonQuery = lessonQuery.eq("course_id", resolvedCourseId);
      }
      const { data: lessonRows } = await lessonQuery;
      if (!cancelled) setTopupLessons(lessonRows ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [isTopupDialogOpen, isDemo, learnerId, learner]);

  // 1. Data Fetching
  const syncData = useCallback(async () => {
    if (!learnerId) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("Learner")
        .select(
          `
          id, name, area, phone, email, pick_up_location, address_lat, address_lng,
          schedules:Schedule(
            id, date, start_time, end_time, instructor_id,
            status, course_id, started_at, ended_at,
            Lesson(id, number),
            Instructor(name)
          )
        `,
        )
        .eq("id", learnerId)
        .single();

      if (error) throw error;

      // Sort schedules by date and time, then assign lesson numbers based on chronological order
      if (data && data.schedules) {
        const sortedSchedules = [...data.schedules].sort((a, b) => {
          const dateTimeA = new Date(
            `${a.date}T${a.start_time || "00:00:00"}`,
          ).getTime();
          const dateTimeB = new Date(
            `${b.date}T${b.start_time || "00:00:00"}`,
          ).getTime();
          return dateTimeA - dateTimeB;
        });

        // Assign lesson numbers based on chronological position
        // A 2hr class covers 2 lesson numbers (e.g., "Lesson 1 & 2")
        let lessonCounter = 1;
        const schedulesWithCorrectNumbers = sortedSchedules.map((schedule) => {
          const startMinutes =
            parseInt(schedule.start_time?.split(":")[0] || "0") * 60 +
            parseInt(schedule.start_time?.split(":")[1] || "0");
          const endMinutes =
            parseInt(schedule.end_time?.split(":")[0] || "0") * 60 +
            parseInt(schedule.end_time?.split(":")[1] || "0");
          const durationHours = Math.max(
            1,
            Math.round((endMinutes - startMinutes) / 60),
          );
          const startLesson = lessonCounter;
          lessonCounter += durationHours;
          return {
            ...schedule,
            Lesson: {
              id: schedule.Lesson?.id ?? null,
              number: startLesson,
              endNumber:
                durationHours > 1 ? startLesson + durationHours - 1 : null,
            },
          };
        });

        setLearner({ ...data, schedules: schedulesWithCorrectNumbers });
      } else {
        setLearner(data);
      }
      // Mutations on this page (instructor reassignment, status changes,
      // reschedule, topup, etc.) write to Schedule but only refresh local
      // state via syncData. The instructor management view reads the same
      // rows under ["instructor-full", id] and the instructor app reads them
      // under ["instructor", phone] — invalidate both so they refetch.
      queryClient.invalidateQueries({ queryKey: ["instructor-full"] });
      queryClient.invalidateQueries({ queryKey: ["instructor"] });
    } catch (error: any) {
      console.error("Data fetch error:", error.message);
    } finally {
      setIsLoading(false);
    }
  }, [learnerId, queryClient]);

  useEffect(() => {
    syncData();
  }, [syncData]);

  // 2. Action Handlers
  const onSaveInstructor = async () => {
    if (!selectedInstructorId || !selectedSchedule) return;

    const fromN = instructorChangeFromLesson;
    const toN = instructorChangeToLesson;
    if (fromN == null || toN == null || fromN < 1 || toN < fromN) {
      toast({
        title: "Invalid lesson range",
        description: "From and To must be valid lesson numbers (From ≤ To).",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);

      // Pick every schedule whose lesson number falls in [fromN, toN].
      // For 2hr classes, endNumber covers the second hour, so a range that
      // straddles the second hour still includes that schedule.
      const targetSchedules = (learner?.schedules ?? []).filter((s: any) => {
        const start = s.Lesson?.number;
        if (start == null) return false;
        const end = s.Lesson?.endNumber ?? start;
        return end >= fromN && start <= toN;
      });

      if (targetSchedules.length === 0) {
        toast({
          title: "No lessons in range",
          description: `No scheduled lessons found between #${fromN} and #${toN}.`,
          variant: "destructive",
        });
        return;
      }

      // Conflict-check the new instructor against every schedule in the range
      // before touching the database, so a partial update can't leave rows
      // half-changed.
      if (selectedInstructorId !== selectedSchedule.instructor_id) {
        const allConflicts: any[] = [];
        for (const s of targetSchedules) {
          const conflicts = await checkScheduleConflict({
            instructorId: selectedInstructorId,
            date: s.date,
            startTime: s.start_time,
            endTime: s.end_time,
            excludeScheduleId: s.id,
          });
          allConflicts.push(...conflicts);
        }
        if (allConflicts.length > 0) {
          toast({
            title: "Cannot change instructor",
            description: formatConflictMessage(allConflicts),
            variant: "destructive",
          });
          return;
        }
      }

      const targetIds = targetSchedules.map((s: any) => s.id);
      const { error } = await supabase
        .from("Schedule")
        .update({ instructor_id: selectedInstructorId })
        .in("id", targetIds);

      if (error) throw error;

      // Lesson numbers are intentionally NOT renumbered. The whole point of
      // a range-based reassignment is that the new instructor inherits the
      // original numbering (e.g. #6, #7 ... #10), not 1, 2 ... 5.

      setIsInstructorChangeModalOpen(false);
      await syncData();
      const count = targetIds.length;
      toast({
        title: "Updated",
        description:
          count === 1
            ? "Instructor changed for 1 lesson."
            : `Instructor changed for ${count} lessons (#${fromN}–#${toN}).`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const onUpdateStatus = async (
    scheduleId: string | number,
    newStatus: string,
  ) => {
    try {
      setIsProcessing(true);
      // Convert to number if it's a string, as the database expects an integer ID
      const numericId =
        typeof scheduleId === "string" ? Number(scheduleId) : scheduleId;

      const { error } = await supabase
        .from("Schedule")
        .update({ status: newStatus })
        .eq("id", numericId);

      if (error) throw error;
      await syncData();
      toast({
        title: "Status Updated",
        description: `Lesson marked as ${newStatus}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Pause or resume ALL upcoming (booked) lessons for this learner
  const onPauseResumeAll = async (action: "pause" | "resume") => {
    if (!learner?.schedules) return;
    try {
      setIsProcessing(true);
      const today = format(new Date(), "yyyy-MM-dd");

      // Get IDs of upcoming lessons that need to be toggled
      const targetStatus = action === "pause" ? "booked" : "paused";
      const newStatus = action === "pause" ? "paused" : "booked";

      const scheduleIds = learner.schedules
        .filter((s: any) => s.status === targetStatus && s.date >= today)
        .map((s: any) => s.id);

      if (scheduleIds.length === 0) {
        toast({
          title: "No lessons to update",
          description: `No ${targetStatus} upcoming lessons found.`,
        });
        return;
      }

      const { error } = await supabase
        .from("Schedule")
        .update({ status: newStatus })
        .in("id", scheduleIds);

      if (error) throw error;
      await syncData();
      toast({
        title: action === "pause" ? "Class Paused" : "Class Resumed",
        description: `${scheduleIds.length} upcoming lesson(s) marked as ${newStatus}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedSchedule || !learner) return;

    try {
      setIsProcessing(true);

      // 0. First fetch the OLD schedule data before updating (for calendar cancellation)
      const { data: oldScheduleData, error: oldScheduleError } = await supabase
        .from("Schedule")
        .select(
          "*, Lesson(id, number), Instructor(id_instructor, name, email, phone)",
        )
        .eq("id", selectedSchedule.id)
        .single();

      if (oldScheduleError) throw oldScheduleError;

      if (oldScheduleData.instructor_id) {
        const conflicts = await checkScheduleConflict({
          instructorId: oldScheduleData.instructor_id,
          date: selectedSchedule.date,
          startTime: selectedSchedule.start_time,
          endTime: selectedSchedule.end_time,
          excludeScheduleId: selectedSchedule.id,
        });
        if (conflicts.length > 0) {
          toast({
            title: "Cannot reschedule",
            description: formatConflictMessage(conflicts),
            variant: "destructive",
          });
          return;
        }
      }

      const oldDate = oldScheduleData.date;
      const oldStartTime = oldScheduleData.start_time;
      const oldEndTime = oldScheduleData.end_time;
      const calendarUid = oldScheduleData.calendar_uid;
      const calendarSequence = oldScheduleData.calendar_sequence || 0;
      const lessonNumber = oldScheduleData.Lesson?.number || 1;
      const instructorName = oldScheduleData.Instructor?.name || "Instructor";
      const instructorEmail = oldScheduleData.Instructor?.email || "";
      const instructorPhone = oldScheduleData.Instructor?.phone || "";
      const instructorId = oldScheduleData.Instructor?.id_instructor || "";

      // 1. Update the specific schedule with new date/time and increment calendar_sequence
      const newSequence = calendarSequence + 1;
      const { error: updateError } = await supabase
        .from("Schedule")
        .update({
          date: selectedSchedule.date,
          start_time: selectedSchedule.start_time,
          end_time: selectedSchedule.end_time,
          calendar_sequence: newSequence,
        })
        .eq("id", selectedSchedule.id);

      if (updateError) throw updateError;

      // 2. Get course_id from the already-fetched oldScheduleData (no extra query needed)
      const courseId = oldScheduleData?.course_id;

      if (courseId) {
        // 3. Fetch all schedules for this learner+course with Lesson data
        const { data: allSchedules, error: fetchError } = await supabase
          .from("Schedule")
          .select("id, date, start_time, Lesson(id, number)")
          .eq("learner_id", learner.id)
          .eq("course_id", courseId)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true });

        if (fetchError) throw fetchError;

        // 4. Sort schedules by date and time (already sorted by query, but ensure consistency)
        const sortedSchedules = [...(allSchedules || [])].sort((a, b) => {
          const dateTimeA = new Date(`${a.date}T${a.start_time}`).getTime();
          const dateTimeB = new Date(`${b.date}T${b.start_time}`).getTime();
          return dateTimeA - dateTimeB;
        });

        // 5. Prepare lesson updates with new numbering based on chronological order
        //    Only update schedules that have a linked Lesson (skip topup schedules with null lesson_id)
        const lessonUpdates = sortedSchedules
          .filter((schedule) => schedule.Lesson?.id)
          .map((schedule, index) => ({
            id: schedule.Lesson.id,
            number: index + 1,
          }));

        // 6. Two-pass update to avoid unique constraint (course_id, number) conflicts
        if (lessonUpdates.length > 0) {
          // Pass 1: Set all to temporary high numbers
          await Promise.all(
            lessonUpdates.map((update, i) =>
              supabase
                .from("Lesson")
                .update({ number: 1000 + i })
                .eq("id", update.id),
            ),
          );
          // Pass 2: Set to final correct numbers
          const results = await Promise.all(
            lessonUpdates.map((update) =>
              supabase
                .from("Lesson")
                .update({ number: update.number })
                .eq("id", update.id),
            ),
          );
          results.forEach((result, index) => {
            if (result.error) {
              console.error(
                `Error updating lesson ${lessonUpdates[index].id} number:`,
                result.error,
              );
            }
          });
        }
      }

      // Close any pending reschedule_request that included this lesson, so the
      // Reschedule Requests tab doesn't keep showing it after ops handles it
      // here. Match is by lesson_id only — the admin's new time doesn't need
      // to match what the learner originally asked for.
      const movedLessonId = oldScheduleData.Lesson?.id;
      if (movedLessonId) {
        try {
          const { data: pendingRequests } = await supabase
            .from("reschedule_requests")
            .select("id")
            .eq("learner_id", learner.id)
            .eq("type", "reschedule")
            .eq("status", "pending")
            .contains("lesson_ids", [movedLessonId]);

          if (pendingRequests && pendingRequests.length > 0) {
            await Promise.all(
              pendingRequests.map((req) =>
                completeRescheduleRequestMutation.mutateAsync({
                  requestId: req.id,
                }),
              ),
            );
          }
        } catch (err) {
          console.error("Failed to auto-close reschedule request(s):", err);
        }
      }

      // Mark that notification needs to be sent (admin sends manually after all reschedules)
      setPendingNotification(true);

      setIsRescheduleModalOpen(false);
      await syncData();
      toast({
        title: "Rescheduled",
        description:
          "Lesson rescheduled. Click 'Send Notification' when done with all reschedules.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpgradeToCourse = async () => {
    if (!upgradeSelectedCourse || !learner) return;
    const course = PREDEFINED_COURSES.find(
      (c) => c.id === upgradeSelectedCourse,
    );
    if (!course) return;

    try {
      setIsUpgrading(true);

      // Create new enrollment for the selected course
      const { error: enrollError } = await supabase.from("enrollment").insert({
        learner_id: learner.id,
        course_id: course.id,
        status: "pending",
        payment_status: "pending",
        installment_mode: "full",
        unlocked_lessons: Array.from(
          { length: course.duration },
          (_, i) => i + 1,
        ),
        progress: { type: "course", total_hours: course.duration },
      });
      if (enrollError) throw enrollError;

      // Mark demo enrollment as completed
      const { error: demoError } = await supabase
        .from("enrollment")
        .update({ status: "completed" })
        .eq("learner_id", learner.id)
        .is("course_id", null);
      if (demoError)
        console.error("Failed to close demo enrollment:", demoError);

      // Send payment link via WhatsApp. Pre-enrolled course is the latest
      // enrollment for this learner, so PaymentPage will auto-prefill via
      // the existing enrollment lookup (no need for a type param here).
      // Admin sees demo credit applied automatically on the learner side.
      const paymentLink = `https://inlane-web-app.vercel.app/payment?phone=${learner.phone}`;
      await supabase.functions.invoke("send-message", {
        body: {
          message_type: "PAYMENT_LINK",
          learner_id: learner.id,
          payment_link: paymentLink,
          course_name: course.name,
          payment_amount: Math.max(0, (course as any).price ?? 0),
          duration: course.duration,
        },
      });

      setShowUpgradeDialog(false);
      setUpgradeSelectedCourse("");
      await syncData();
      toast({
        title: "Upgrade Initiated",
        description: `${learner.name} enrolled in ${course.name}. Payment link sent. Demo ₹${DEMO_CREDIT} credit will be applied.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const topupAssignedHours = topupSlots.reduce((sum, s) => sum + s.duration, 0);
  const topupRemainingClasses = topupTotalClasses - topupAssignedHours;

  const handleTopupSubmit = async () => {
    if (!learner) return;
    // For demo learners, course_id is null — that's valid
    const courseId = learner?.schedules?.[0]?.course_id ?? null;

    // Validate total hours match
    if (topupRemainingClasses !== 0) {
      toast({
        title: "Error",
        description: `Total hours across slots must equal ${topupTotalClasses} classes. Currently ${topupAssignedHours} hour(s) assigned.`,
        variant: "destructive",
      });
      return;
    }

    // Validate all slots have required fields
    for (const slot of topupSlots) {
      if (!slot.date || !slot.start_time || !slot.instructor_id) {
        toast({
          title: "Error",
          description: "Please fill all fields for each slot.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!isDemo && !topupLessonId) {
      toast({
        title: "Error",
        description: "Please select a lesson for this topup.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);

      // Demo guard: if the learner already paid for their demo, ops should
      // schedule via the New Schedule tab — not re-bill them here. The
      // payment-link send + pending_payment status below would charge again.
      if (isDemo) {
        const { data: paidDemo } = await supabase
          .from("enrollment")
          .select("id")
          .eq("learner_id", learner.id)
          .is("course_id", null)
          .in("payment_status", ["full_paid", "half_paid", "paid"])
          .limit(1)
          .maybeSingle();
        if (paidDemo) {
          toast({
            title: "Demo already paid",
            description:
              "This demo learner has already paid. Schedule them from the New Schedule tab instead — using this flow would send another payment link.",
            variant: "destructive",
          });
          return;
        }
      }

      // Conflict check per instructor+date
      const instructorDates = new Map<string, Set<string>>();
      for (const slot of topupSlots) {
        if (!instructorDates.has(slot.instructor_id)) {
          instructorDates.set(slot.instructor_id, new Set());
        }
        instructorDates.get(slot.instructor_id)!.add(slot.date);
      }

      const conflictResults = await Promise.all(
        Array.from(instructorDates).map(([instructorId, dates]) =>
          supabase
            .from("Schedule")
            .select(
              "id, date, start_time, end_time, instructor_id, Learner(name)",
            )
            .eq("instructor_id", instructorId)
            .in("date", Array.from(dates))
            .neq("status", "paused")
            .not("isTentative", "eq", true),
        ),
      );

      const allExisting: any[] = [];
      for (const result of conflictResults) {
        if (!result.error && result.data) allExisting.push(...result.data);
      }

      const conflicts: string[] = [];
      for (const slot of topupSlots) {
        for (const existing of allExisting) {
          if (
            existing.instructor_id !== slot.instructor_id ||
            existing.date !== slot.date
          )
            continue;
          if (
            (slot.start_time >= existing.start_time &&
              slot.start_time < existing.end_time) ||
            (slot.end_time > existing.start_time &&
              slot.end_time <= existing.end_time) ||
            (slot.start_time <= existing.start_time &&
              slot.end_time >= existing.end_time)
          ) {
            const learnerName = (existing.Learner as any)?.name || "Unknown";
            conflicts.push(
              `Instructor already booked on ${slot.date} at ${existing.start_time} for ${learnerName}`,
            );
          }
        }
      }

      if (conflicts.length > 0) {
        toast({
          title: "Scheduling Conflict",
          description: conflicts.join("\n"),
          variant: "destructive",
        });
        return;
      }

      // Insert topup schedule records
      // All topups require ₹599 payment first
      const scheduleStatus = "pending_payment";
      const records = topupSlots.map((slot) => ({
        learner_id: learner.id,
        course_id: courseId,
        lesson_id: isDemo ? null : topupLessonId || null,
        instructor_id: slot.instructor_id,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        enabled: true,
        status: scheduleStatus,
        otp: generateRandomOTP(),
        otp_end: generateRandomOTP(),
      }));

      const { error } = await supabase.from("Schedule").insert(records);
      if (error) throw error;

      // Send payment link to learner. Demo uses ?type=demo (1hr @ ₹599);
      // topup uses ?type=topup&hours=N (N × ₹599) so PaymentPage prefills
      // the right flow instead of showing the generic course selector.
      const totalHours = topupSlots.reduce((sum, slot) => {
        const start = parseInt(slot.start_time.split(":")[0]);
        const end = parseInt(slot.end_time.split(":")[0]);
        return sum + (end - start);
      }, 0);
      if (learner.phone) {
        const paymentLink = isDemo
          ? `https://inlane-web-app.vercel.app/payment?phone=${learner.phone}&type=demo`
          : `https://inlane-web-app.vercel.app/payment?phone=${learner.phone}&type=topup&hours=${totalHours}`;
        const paymentAmount = isDemo ? 1 : 1 * totalHours;
        try {
          await supabase.functions.invoke("send-message", {
            body: {
              message_type: "PAYMENT_LINK",
              learner_id: learner.id,
              payment_link: paymentLink,
              course_name: isDemo ? "Demo Lesson" : "Topup Classes",
              payment_amount: paymentAmount,
              duration: totalHours,
            },
          });
        } catch (e) {
          console.error("Failed to send payment link:", e);
        }
      }

      setIsTopupDialogOpen(false);
      await syncData();
      // syncData refreshes only this manager's local view of the learner;
      // the Active Learners list in the parent uses its own useQuery, so
      // invalidate it here too. Otherwise the new topup/demo schedule
      // wouldn't appear under the learner's card until the cache expired.
      queryClient.invalidateQueries({ queryKey: ["activeLearners"] });
      const topupPrice = isDemo ? 1 : 1 * totalHours;
      toast({
        title: isDemo ? "Demo Scheduled" : "Topup Added",
        description: `${topupTotalClasses} class(es) scheduled. Payment link (₹${topupPrice}) sent to ${learner.name}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2 md:col-span-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-3">
          <CardTitle className="text-sm">
            {isLoading
              ? "Updating..."
              : `${learner?.name ?? "Learner"}'s Schedule`}
          </CardTitle>
          {(learner?.schedules?.length > 0 || (isDemo && learner)) && (
            <div className="flex gap-2">
              {pendingNotification && (
                <Button
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-700"
                  disabled={isSendingNotification}
                  onClick={async () => {
                    setIsSendingNotification(true);
                    try {
                      await supabase.functions.invoke("send-message", {
                        body: {
                          message_type:
                            "WEBAPP_RESCHEDULE_DONE_CHECK_NEW_SCHEDULE",
                          learner_id: learner.id,
                        },
                      });
                      setPendingNotification(false);
                      toast({
                        title: "Notification Sent",
                        description: `Reschedule notification sent to ${learner.name}`,
                      });
                    } catch (err: any) {
                      toast({
                        title: "Error",
                        description:
                          err.message || "Failed to send notification",
                        variant: "destructive",
                      });
                    } finally {
                      setIsSendingNotification(false);
                    }
                  }}
                >
                  {isSendingNotification
                    ? "Sending..."
                    : "Send Reschedule Notification"}
                </Button>
              )}
              {learner?.schedules?.some(
                (s: any) =>
                  s.status === "booked" &&
                  s.date >= format(new Date(), "yyyy-MM-dd"),
              ) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  disabled={isProcessing}
                  onClick={() => onPauseResumeAll("pause")}
                >
                  Pause Class
                </Button>
              )}
              {learner?.schedules?.some(
                (s: any) =>
                  s.status === "paused" &&
                  s.date >= format(new Date(), "yyyy-MM-dd"),
              ) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-400 bg-green-50 text-green-700 hover:bg-green-100"
                  disabled={isProcessing}
                  onClick={() => onPauseResumeAll("resume")}
                >
                  Resume Class
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100"
                disabled={isProcessing}
                onClick={() => {
                  setTopupTotalClasses(1);
                  setTopupSlots([
                    {
                      date: "",
                      start_time: "",
                      end_time: "",
                      duration: 1,
                      instructor_id: "",
                    },
                  ]);
                  setTopupLessonId("");
                  setIsTopupDialogOpen(true);
                }}
              >
                {isDemo ? "Schedule Demo" : "+ Topup"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-indigo-400 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                onClick={() => setShowAnalytics(true)}
              >
                Analytics
              </Button>
              {isDemo && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-500 bg-green-50 text-green-700 hover:bg-green-100"
                  onClick={() => setShowUpgradeDialog(true)}
                >
                  Upgrade to Course
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="space-y-2">
            {learner?.schedules?.length > 0 ? (
              [...learner.schedules]
                .sort(
                  (a, b) =>
                    new Date(`${a.date}T${a.start_time ?? "00:00"}`).getTime() -
                    new Date(`${b.date}T${b.start_time ?? "00:00"}`).getTime(),
                )
                .map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`flex items-center justify-between rounded-md border p-2 ${
                      schedule.status === "paused"
                        ? "border-rose-300 bg-rose-50 hover:bg-rose-100"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium md:text-sm">
                        Lesson {schedule.Lesson?.number ?? "N/A"}
                        {schedule.Lesson?.endNumber
                          ? ` & ${schedule.Lesson.endNumber}`
                          : ""}{" "}
                        — {schedule.date ?? "N/A"}
                      </div>
                      <div className="text-xs text-gray-500 md:text-sm">
                        {schedule.start_time?.substring(0, 5) ?? "N/A"} -{" "}
                        {schedule.end_time?.substring(0, 5) ?? "N/A"}
                        <span className="mx-2">|</span>
                        Instructor: {schedule.Instructor?.name ?? "Unassigned"}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium uppercase text-gray-600">
                        Status: {schedule.status ?? "N/A"}
                        {schedule.status === "topup" && (
                          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-purple-700">
                            Topup
                          </span>
                        )}
                        {schedule.status === "pending_payment" && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-amber-700">
                            Awaiting Payment
                          </span>
                        )}
                        {schedule.status === "paused" && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-rose-700">
                            Paused
                          </span>
                        )}
                      </div>
                    </div>

                    {schedule.status === "pending_payment" ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        Payment Pending
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        {schedule.status === "completed" &&
                          (schedule.started_at && schedule.ended_at ? (
                            <>
                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                OTP Verified
                              </span>
                              <button
                                className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-600 hover:bg-blue-100"
                                onClick={() => {
                                  setRouteMapScheduleId(schedule.id);
                                  setRouteMapLabel(
                                    `Lesson ${schedule.Lesson?.number ?? ""}`,
                                  );
                                }}
                              >
                                View Route
                              </button>
                            </>
                          ) : (
                            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                              Manually Done
                            </span>
                          ))}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isProcessing}
                            >
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {schedule.status !== "completed" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "This will mark the lesson as completed WITHOUT OTP verification. It will NOT count for instructor payout. Continue?",
                                    )
                                  ) {
                                    onUpdateStatus(schedule.id, "completed");
                                  }
                                }}
                              >
                                Mark as Completed
                              </DropdownMenuItem>
                            )}
                            {schedule.status === "completed" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Revert this lesson back to Booked? Any OTP/verification data will remain but the lesson will no longer count as completed.",
                                    )
                                  ) {
                                    onUpdateStatus(schedule.id, "booked");
                                  }
                                }}
                              >
                                Revert to Booked
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSchedule(schedule);
                                setSelectedInstructorId(schedule.instructor_id);
                                const clickedNumber =
                                  schedule.Lesson?.number ?? null;
                                setInstructorChangeFromLesson(clickedNumber);
                                setInstructorChangeToLesson(clickedNumber);
                                setIsInstructorChangeModalOpen(true);
                              }}
                            >
                              Change Instructor
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSchedule({ ...schedule });
                                setIsRescheduleModalOpen(true);
                              }}
                            >
                              Reschedule
                            </DropdownMenuItem>
                            {schedule.status !== "completed" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  onUpdateStatus(
                                    schedule.id,
                                    schedule.status === "paused"
                                      ? "booked"
                                      : "paused",
                                  )
                                }
                              >
                                {schedule.status === "paused"
                                  ? "Resume Lesson"
                                  : "Pause Lesson"}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                ))
            ) : isDemo && !isLoading ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <div className="rounded-full bg-purple-100 p-3">
                  <Users size={24} className="text-purple-600" />
                </div>
                <p className="text-sm font-medium text-purple-700">
                  Demo Learner — No lesson scheduled yet
                </p>
                <p className="text-xs text-gray-500">
                  Use the Topup button above to schedule the demo lesson
                </p>
              </div>
            ) : (
              <div className="py-10 text-center text-gray-500">
                {isLoading ? "Fetching data..." : "No records found."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructor Dialog */}
      <Dialog
        open={isInstructorChangeModalOpen}
        onOpenChange={setIsInstructorChangeModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Instructor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select
              value={selectedInstructorId}
              onValueChange={setSelectedInstructorId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Instructor" />
              </SelectTrigger>
              <SelectContent>
                {instructorData
                  ?.filter((ins) => ins.enabled !== false)
                  .map((ins) => (
                    <SelectItem
                      key={ins.id_instructor}
                      value={ins.id_instructor}
                    >
                      {ins.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="space-y-2 rounded-md border p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Apply to lesson range
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">From #</span>
                <Input
                  type="number"
                  min={1}
                  className="h-8 w-20"
                  value={instructorChangeFromLesson ?? ""}
                  onChange={(e) =>
                    setInstructorChangeFromLesson(
                      e.target.value === "" ? null : parseInt(e.target.value),
                    )
                  }
                />
                <span className="text-gray-600">to #</span>
                <Input
                  type="number"
                  min={1}
                  className="h-8 w-20"
                  value={instructorChangeToLesson ?? ""}
                  onChange={(e) =>
                    setInstructorChangeToLesson(
                      e.target.value === "" ? null : parseInt(e.target.value),
                    )
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto h-8 text-xs"
                  onClick={() => {
                    const maxNumber = (learner?.schedules ?? []).reduce(
                      (max: number, s: any) => {
                        const n = s.Lesson?.endNumber ?? s.Lesson?.number ?? 0;
                        return n > max ? n : max;
                      },
                      0,
                    );
                    if (maxNumber > 0) {
                      setInstructorChangeToLesson(maxNumber);
                    }
                  }}
                >
                  All remaining
                </Button>
              </div>
              <p className="text-[11px] text-gray-500">
                Leave both equal to change just one lesson. Lesson numbers stay
                the same after the change.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsInstructorChangeModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={onSaveInstructor} disabled={isProcessing}>
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog - EXACT structure provided */}
      <Dialog
        open={isRescheduleModalOpen}
        onOpenChange={(open) => {
          if (!isProcessing) {
            setIsRescheduleModalOpen(open);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Lesson</DialogTitle>
            <DialogDescription>Set reschedule date and time</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedSchedule && (
              <div className="space-y-4">
                {/* Date Field */}
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedSchedule.date || ""}
                    onChange={(e) =>
                      setSelectedSchedule((prev: any) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    className="mt-1 block h-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-8">
                  {/* Start Time Field */}
                  <div className="flex flex-col">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Start Time
                    </label>
                    <Select
                      value={selectedSchedule.start_time || ""}
                      onValueChange={(value) => {
                        const startTime = value;
                        const [hours, minutes] = startTime
                          .split(":")
                          .map(Number);

                        // Preserve original duration (calculate from existing start/end)
                        const [oldStartH, oldStartM] = (
                          selectedSchedule.start_time || "00:00:00"
                        )
                          .split(":")
                          .map(Number);
                        const [oldEndH, oldEndM] = (
                          selectedSchedule.end_time || "01:00:00"
                        )
                          .split(":")
                          .map(Number);
                        const durationMinutes =
                          oldEndH * 60 + oldEndM - (oldStartH * 60 + oldStartM);
                        const durHours = Math.max(
                          1,
                          Math.round(durationMinutes / 60),
                        );

                        const endHours = (hours + durHours) % 24;
                        const endTime = `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;

                        setSelectedSchedule((prev: any) => ({
                          ...prev,
                          start_time: startTime,
                          end_time: endTime,
                        }));
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Start" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }).map((_, hour) =>
                          [0, 30].map((minute) => {
                            const val = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;
                            return (
                              <SelectItem key={`start-${val}`} value={val}>
                                {val.substring(0, 5)}
                              </SelectItem>
                            );
                          }),
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <span className="mt-6 text-gray-500">to</span>

                  {/* End Time Field (Filtered) */}
                  <div className="flex flex-col">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      End Time
                    </label>
                    <Select
                      value={selectedSchedule.end_time || ""}
                      onValueChange={(value) =>
                        setSelectedSchedule((prev: any) => ({
                          ...prev,
                          end_time: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="End" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }).map((_, hour) =>
                          [0, 30].map((minute) => {
                            const val = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;

                            const isPastStart = selectedSchedule.start_time
                              ? val > selectedSchedule.start_time
                              : true;

                            if (!isPastStart) return null;

                            return (
                              <SelectItem key={`end-${val}`} value={val}>
                                {val.substring(0, 5)}
                              </SelectItem>
                            );
                          }),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsRescheduleModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRescheduleSubmit}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Topup Dialog */}
      <Dialog
        open={isTopupDialogOpen}
        onOpenChange={(open) => {
          if (!isProcessing) setIsTopupDialogOpen(open);
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isDemo ? "Schedule Demo Lesson" : "Add Topup Lessons"}
            </DialogTitle>
            <DialogDescription>
              {isDemo
                ? `Schedule the demo lesson for ${learner?.name} (1 hour)`
                : `Schedule extra classes for ${learner?.name}. Each class = 1 hour. A 2hr slot counts as 2 classes.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Total classes selector — hidden for demo (always 1) */}
            {!isDemo && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">
                  Total classes to add:
                </label>
                <Select
                  value={String(topupTotalClasses)}
                  onValueChange={(v) => {
                    const count = Number(v);
                    setTopupTotalClasses(count);
                    setTopupSlots([
                      {
                        date: "",
                        start_time: "",
                        end_time: "",
                        duration: 1,
                        instructor_id: "",
                      },
                    ]);
                  }}
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Lesson allotted to this topup — hidden for demo */}
            {!isDemo && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Lesson
                </label>
                <Select
                  value={topupLessonId}
                  onValueChange={setTopupLessonId}
                  disabled={isProcessing || topupLessons.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        topupLessons.length === 0
                          ? "No lessons available"
                          : "Select a lesson to allot"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {topupLessons.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        Lesson {l.number}
                        {l.description ? ` — ${l.description}` : ""}
                        {l.duration ? ` (${l.duration}h)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Progress indicator — hidden for demo */}
            {!isDemo && (
              <div className="rounded-md bg-gray-50 px-3 py-2 text-sm">
                <span className="font-medium">{topupAssignedHours}</span> of{" "}
                <span className="font-medium">{topupTotalClasses}</span> classes
                assigned
                {topupRemainingClasses > 0 && (
                  <span className="ml-1 text-amber-600">
                    ({topupRemainingClasses} remaining)
                  </span>
                )}
                {topupRemainingClasses === 0 && (
                  <span className="ml-1 text-green-600">(all assigned)</span>
                )}
                {topupRemainingClasses < 0 && (
                  <span className="ml-1 text-red-600">
                    (exceeded by {Math.abs(topupRemainingClasses)})
                  </span>
                )}
              </div>
            )}

            {/* Slots */}
            {topupSlots.map((slot, i) => (
              <div
                key={i}
                className="space-y-3 rounded-md border bg-gray-50 p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">
                    Slot {i + 1}{" "}
                    <span className="font-normal text-gray-500">
                      ({slot.duration}hr)
                    </span>
                  </p>
                  {topupSlots.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      onClick={() =>
                        setTopupSlots((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      <X size={14} />
                    </Button>
                  )}
                </div>

                {/* Duration — hidden for demo (always 1hr) */}
                {!isDemo && (
                  <div className="flex items-center gap-2">
                    <label className="w-20 text-sm text-gray-600">
                      Duration
                    </label>
                    <Select
                      value={String(slot.duration)}
                      onValueChange={(value) => {
                        const dur = Number(value);
                        setTopupSlots((prev) =>
                          prev.map((s, j) => {
                            if (j !== i) return s;
                            let endTime = s.end_time;
                            if (s.start_time) {
                              const [h, m] = s.start_time
                                .split(":")
                                .map(Number);
                              const endH = (h + dur) % 24;
                              endTime = `${endH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`;
                            }
                            return { ...s, duration: dur, end_time: endTime };
                          }),
                        );
                      }}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Hour</SelectItem>
                        <SelectItem value="2">2 Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Date */}
                <div className="flex items-center gap-2">
                  <label className="w-20 text-sm text-gray-600">Date</label>
                  <input
                    type="date"
                    value={slot.date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) =>
                      setTopupSlots((prev) =>
                        prev.map((s, j) =>
                          j === i ? { ...s, date: e.target.value } : s,
                        ),
                      )
                    }
                    className="block h-9 flex-1 rounded-md border border-gray-300 px-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                {/* Start Time */}
                <div className="flex items-center gap-2">
                  <label className="w-20 text-sm text-gray-600">Time</label>
                  <Select
                    value={slot.start_time}
                    onValueChange={(value) => {
                      const [hours, minutes] = value.split(":").map(Number);
                      const endHours = (hours + slot.duration) % 24;
                      const endTime = `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
                      setTopupSlots((prev) =>
                        prev.map((s, j) =>
                          j === i
                            ? { ...s, start_time: value, end_time: endTime }
                            : s,
                        ),
                      );
                    }}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Start" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }).map((_, hour) =>
                        [0, 30].map((minute) => {
                          const val = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;
                          return (
                            <SelectItem
                              key={`topup-${i}-start-${val}`}
                              value={val}
                            >
                              {val.substring(0, 5)}
                            </SelectItem>
                          );
                        }),
                      )}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-500">to</span>
                  <span className="text-sm font-medium text-gray-700">
                    {slot.end_time ? slot.end_time.substring(0, 5) : "--:--"}
                  </span>
                </div>

                {/* Instructor */}
                <div className="flex items-center gap-2">
                  <label className="w-20 text-sm text-gray-600">
                    Instructor
                  </label>
                  <Select
                    value={slot.instructor_id}
                    onValueChange={(value) =>
                      setTopupSlots((prev) =>
                        prev.map((s, j) =>
                          j === i ? { ...s, instructor_id: value } : s,
                        ),
                      )
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select Instructor" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...(instructorData || [])]
                        .filter((ins) => ins.enabled !== false)
                        .sort((a, b) =>
                          (a.name || "").localeCompare(b.name || ""),
                        )
                        .map((ins) => (
                          <SelectItem
                            key={ins.id_instructor}
                            value={ins.id_instructor}
                          >
                            {ins.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}

            {/* Add slot button — hidden for demo */}
            {!isDemo && topupRemainingClasses > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={() =>
                  setTopupSlots((prev) => [
                    ...prev,
                    {
                      date: "",
                      start_time: "",
                      end_time: "",
                      duration: 1,
                      instructor_id: "",
                    },
                  ])
                }
              >
                + Add Slot
              </Button>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsTopupDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleTopupSubmit}
                disabled={isProcessing || topupRemainingClasses !== 0}
              >
                {isProcessing ? "Adding..." : "Add Topup Lessons"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lesson Route Map Dialog */}
      <LessonRouteMap
        scheduleId={routeMapScheduleId ?? 0}
        open={routeMapScheduleId !== null}
        onClose={() => setRouteMapScheduleId(null)}
        lessonLabel={routeMapLabel}
      />

      {/* Instructor Analytics Dialog — shows for the primary instructor of this learner */}
      {(() => {
        const primaryInstructorId = learner?.schedules?.[0]?.instructor_id;
        const primaryInstructorName =
          learner?.schedules?.[0]?.Instructor?.name ?? "Instructor";
        return primaryInstructorId ? (
          <InstructorAnalytics
            instructorId={primaryInstructorId}
            instructorName={primaryInstructorName}
            open={showAnalytics}
            onClose={() => setShowAnalytics(false)}
          />
        ) : null;
      })()}

      {/* Upgrade to Course Dialog */}
      <Dialog
        open={showUpgradeDialog}
        onOpenChange={(open) => {
          if (!isUpgrading) setShowUpgradeDialog(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to Full Course</DialogTitle>
            <DialogDescription>
              Select a course for {learner?.name}. Demo payment of ₹
              {DEMO_CREDIT} will be credited toward the course fee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={upgradeSelectedCourse}
              onValueChange={setUpgradeSelectedCourse}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {PREDEFINED_COURSES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — {c.duration} hours
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {upgradeSelectedCourse && (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
                Demo credit of ₹{DEMO_CREDIT} will be applied. A payment link
                will be sent to the learner for the remaining balance.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUpgradeDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpgradeToCourse}
                disabled={!upgradeSelectedCourse || isUpgrading}
              >
                {isUpgrading ? "Upgrading..." : "Upgrade & Send Payment Link"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
