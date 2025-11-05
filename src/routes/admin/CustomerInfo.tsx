import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Filter, Search, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  LearnerInfo,
  LearnerInfoDialog,
} from "@/components/admin/LearnerInfoCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { formatDate } from "@/lib/utils";

export default function CustomerInfo() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLearner, setSelectedLearner] = useState<LearnerInfo | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const maxNumLessonsOnHalfInstallment = 1;


  // Fetch all learners whose payment status is completed
  // in descending order of signup time
  let { data: learners, isLoading } = useQuery({
    queryKey: ["learners4"],
    queryFn: async () => {
      const { data, error } = await supabase
          .from("Learner")
          .select(`
            *, 
            payment!inner(created_at, updated_at, status),
            enrollment!inner(amount, installment1_amount, installment2_amount, installment_mode, payment_status)
          `)
          .order("created_at", { ascending: false });
      if (error) throw error;
      // console.log("Fetched learners:", data, "enrollment", data?.[0]?.enrollment);
      // data = getLatestRecords(data || []);
      // console.log("FetchedSorted learners:", data, "enrollment", data?.[0]?.enrollment);
      return data ; //as LearnerInfo[];
    },
  });
  learners = getLatestRecords(learners);
  // console.log("Single enrollemt retreived learners", learners);
  function getLatestRecords(learners) {
    if (!Array.isArray(learners) || learners.length === 0) {
        return [];
    }

    // Custom sorting logic for finding the "latest" record
    const getLatestRecord = (records) => {
        if (!records || records.length === 0) {
            return null;
        }

        // Sort function: Highest priority first (b - a for descending)
        const sortedRecords = [...records].sort((a, b) => {
            
            // --- 1. Primary Sort: created_at (most recent first) ---
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            if (dateB !== dateA) {
                return dateB - dateA;
            }

            // --- 2. Tie-breaker 1: updated_at (most recent first) ---
            // If updated_at is null/undefined, it is treated as 0, which correctly sorts valid dates first.
            const updatedA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const updatedB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            if (updatedB !== updatedA) {
                 return updatedB - updatedA;
            }

            // --- 3. Tie-breaker 2: amount (largest first) ---
            // If amount is null/undefined/0, it is treated as 0.
            const amountA = a.amount || 0;
            const amountB = b.amount || 0;
            return amountB - amountA; // Descending order for amount
        });

        // Return the single most recent record
        return sortedRecords[0];
    };

    // The function continues here to process the learners array
    return learners.map(learner => {
        // Find the most recent Enrollment
        const latestEnrollment = getLatestRecord(learner.enrollment);

        // Find the most recent Payment
        const latestPayment = getLatestRecord(learner.payment);

        // Return a new learner object with the arrays replaced by single objects
        return {
            ...learner,
            enrollment: latestEnrollment,
            payment: latestPayment,
        };
    });
}

    function sortLearnersByEnrollmentAndSchedule(learnersWithSingleRecords) {
        return [...learnersWithSingleRecords].sort((a, b) => {
            const modeA = a.enrollment?.installment_mode;
            const modeB = b.enrollment?.installment_mode;

            const isAFirstHalf = modeA === "first_half";
            const isBFirstHalf = modeB === "first_half";

            if (isAFirstHalf && !isBFirstHalf) {
                return -1; // A comes before B (prioritized)
            }
            if (!isAFirstHalf && isBFirstHalf) {
                return 1; // B comes before A (prioritized)
            }
            
            // Second sorting based on schedule time using getHoursSince
            // Prefer learners that have a schedule (with date or start_time).
            const hasScheduleA = !!(a.schedule && (a.schedule.date || a.schedule.start_time));
            const hasScheduleB = !!(b.schedule && (b.schedule.date || b.schedule.start_time));

            if (hasScheduleA && !hasScheduleB) return -1;
            if (!hasScheduleA && hasScheduleB) return 1;
            if (!hasScheduleA && !hasScheduleB) return 0;

            // Both have schedules — sort by hours since (higher hours => higher priority)
            const hA = getHoursSince(a.schedule);
            const hB = getHoursSince(b.schedule);

            // If both hours are invalid, keep original order
            if (hA === null && hB === null) return 0;
            if (hA === null) return 1; // b has valid hours, a doesn't -> b first
            if (hB === null) return -1; // a has valid hours, b doesn't -> a first

            return (hB as number) - (hA as number);
            return 0; // Maintain order if modes are equal
        });
    }

  const {
    data: scheduleByLearnerData,
    isLoading: isLoadingScheduleByLearner,
    error: errorLoadingScheduleByLearner,
  } = useQuery({
    queryKey: ["scheduleByLearner", learners?.map((l) => l.id) || []],
    queryFn: async () => {
      if (!Array.isArray(learners) || learners.length === 0) return [];
      const currentTimestamp = new Date();
      // use ISO date (yyyy-MM-dd) and HH:MM:SS time to match DB column formats
      const dateTimeRef = currentTimestamp.toISOString().split("T")[0];
      const hourTimeRef = currentTimestamp.toTimeString().split(" ")[0];
      const { data, error } = await supabase
        .from("Schedule")
        .select("*, Lesson!inner(number)")
        .lte("date", dateTimeRef)
        .lt("start_time", hourTimeRef)
        .eq("Lesson.number", maxNumLessonsOnHalfInstallment)
        .in("learner_id", learners.map((learner) => learner.id));

      if (error) throw error;
      // console.log("Fetched scheduleByLearnerData:", data);
      return data;
    },
    enabled: Array.isArray(learners) && learners.length > 0,
  });

  learners = sortLearnersByEnrollmentAndSchedule(learners);


  // Append Schedule data to each learner item when a schedule exists in scheduleByLearnerData
  if (Array.isArray(learners) && Array.isArray(scheduleByLearnerData)) {
    // console.log(
    //   "Appending schedules - input:",
    //   { learnersCount: learners.length, schedulesCount: scheduleByLearnerData.length },
    // );

    const scheduleMap = new Map<string, any>();

    for (const sch of scheduleByLearnerData) {
      // console.log("Processing schedule input:", sch);
      const lid = sch?.learner_id;
      if (!lid) {
        // console.log("Skipping schedule without learner_id:", sch);
        continue;
      }
      // Store the schedule for the learner (if multiple exist, last one wins)
      scheduleMap.set(lid, sch);
      // console.log(`Mapped schedule for learner_id=${lid}:`, sch);
    }

    // console.log("Schedule map built. Keys:", Array.from(scheduleMap.keys()));

    const learnersBefore = learners;
    // console.log("Learners before attaching schedules (sample):", learnersBefore.slice?.(0, 5) ?? learnersBefore);

    learners = learners.map((learner) => {
      const attachedSchedule = scheduleMap.get(learner.id) ?? null;
      // add only if not already present
      const out = {
          ...learner,
          schedule: learner.schedule === undefined ? attachedSchedule : learner.schedule,
      };
      // console.log(`Learner processed id=${learner.id} - attachedSchedule:`, attachedSchedule);
      return out;
    });

    // console.log("Learners after attaching schedules (sample):", learners.slice?.(0, 5) ?? learners);
  } else {
    // console.log("No learners or schedules to process", {
    //   learners: Array.isArray(learners) ? `count=${learners.length}` : learners,
    //   scheduleByLearnerData: Array.isArray(scheduleByLearnerData) ? `count=${scheduleByLearnerData.length}` : scheduleByLearnerData,
    // });
  }

  // Helper to format "due since" for a given date
  function getDateTimestamp(
    dayTimestampOrSchedule: string | { date?: string; start_time?: string } | null | undefined,
    hourTimestamp?: string | null,
  ): number | null {
    if (!dayTimestampOrSchedule) return null;

    // Backwards-compatible: accept a schedule object { date, start_time }
    let dayTimestamp: string | null | undefined = dayTimestampOrSchedule as any;
    if (dayTimestampOrSchedule && typeof dayTimestampOrSchedule === "object") {
      dayTimestamp = dayTimestampOrSchedule.date;
      hourTimestamp = dayTimestampOrSchedule.start_time ?? hourTimestamp;
    }

    if (!dayTimestamp) return null;

    // Split date parts (support dd-mm-yyyy, dd/mm/yyyy, yyyy-mm-dd)
    const dayParts = dayTimestamp.split(/[-\/]/).map((p) => p.trim());
    if (dayParts.length !== 3) return null;

    let dd: number, mm: number, yyyy: number;
    // If first part has length 4, assume yyyy-mm-dd, otherwise dd-mm-yyyy
    if (dayParts[0].length === 4) {
      yyyy = parseInt(dayParts[0], 10);
      mm = parseInt(dayParts[1], 10);
      dd = parseInt(dayParts[2], 10);
    } else {
      dd = parseInt(dayParts[0], 10);
      mm = parseInt(dayParts[1], 10);
      yyyy = parseInt(dayParts[2], 10);
    }
    if ([dd, mm, yyyy].some((n) => Number.isNaN(n))) return null;

    // Parse hourTimestamp like hh-mm-ss or hh:mm:ss; default to 00:00:00
    let hh = 0,
      min = 0,
      sec = 0;
    if (hourTimestamp) {
      const timeParts = hourTimestamp.split(/[:\-]/).map((p) => p.trim());
      if (timeParts.length >= 1) {
        const parsed = parseInt(timeParts[0], 10);
        if (!Number.isNaN(parsed)) hh = parsed;
      }
      if (timeParts.length >= 2) {
        const parsed = parseInt(timeParts[1], 10);
        if (!Number.isNaN(parsed)) min = parsed;
      }
      if (timeParts.length >= 3) {
        const parsed = parseInt(timeParts[2], 10);
        if (!Number.isNaN(parsed)) sec = parsed;
      }
    }

    // Construct a local Date: months are 0-indexed
    const dueDate = new Date(yyyy, mm - 1, dd, hh, min, sec);
    if (isNaN(dueDate.getTime())) return null;
    return dueDate.getTime();
  }

  function formatDueSince(
    dayTimestampOrSchedule: string | { date?: string; start_time?: string } | null | undefined,
    hourTimestamp?: string | null,
    pendingText = "Lesson Pending",
  ): string {
    const ts = getDateTimestamp(dayTimestampOrSchedule, hourTimestamp);
    if (!ts) return null; // if invalid args , return null so that N/A can be shown

    const dueDate = new Date(ts);
    if (dueDate.getTime() < Date.now()) {
      const formattedDistance = formatDistanceToNow(dueDate, { addSuffix: false });
      return `due since ${formattedDistance}`;
    }

    return pendingText;
  }

  // Helper to get time in hours since the given date in past
  // returns a number (number of hours) or null if invalid date
  function getHoursSince(
    dayTimestampOrSchedule: string | { date?: string; start_time?: string } | null | undefined,
    hourTimestamp?: string | null,
  ): number | null {
    const ts = getDateTimestamp(dayTimestampOrSchedule, hourTimestamp);
    if (ts === null) return null;

    const diffMs = Date.now() - ts;
    if (!isFinite(diffMs)) return null;

    const hours = diffMs / (1000 * 60 * 60);
    // If the timestamp is in the future, treat as 0 hours since
    return Math.round(Math.max(0, hours) * 100) / 100; // rounded to 2 decimal places
  }
  // Filter learners based on search query
  const filteredLearners = learners?.filter(
    (learner) =>
      learner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      learner.phone.includes(searchQuery) ||
      learner.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      learner.area?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleLearnerSelect = (learner: LearnerInfo) => {
    
    setSelectedLearner(learner);
    setDialogOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return "N/A";
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };


  // rendeing helpers
  const getDueAmount = (learner) => {
    console.log("Calculating due amount for learner:", learner);
    if (
      !learner ||
      learner.enrollment == null ||
      learner.enrollment.installment_mode == null ||
      learner.enrollment.amount == null ||
      learner.enrollment.installment1_amount == null
    ) {
      console.log("Insufficient data to calculate due amount.", learner?.enrollement);
      return "N/A";
    }
    if (learner.enrollment.installment_mode != "first_half") {
      return "0";
    }
    const dueAmount = Number(learner.enrollment.amount) - Number(learner.enrollment.installment1_amount);
    return String(dueAmount);
  }

  return (
    <div
      className="h-flex flex min-h-screen flex-col bg-white p-8"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Paid Customer Information</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="mb-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search by name, phone, email or area..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Customers</CardTitle>
                  <CardDescription>
                    {filteredLearners?.length || 0} customers found
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : filteredLearners?.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No customers found matching your search
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredLearners?.map((learner) => (
                    <div
                      key={learner.id}
                      className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50"
                      onClick={() => handleLearnerSelect(
                        learner={
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
                            preferred_start_date:
                              learner.preferred_start_date,
                            preferred_completion_days:
                              learner.preferred_completion_days,
                            prefers_two_hour_classes:
                              learner.prefers_two_hour_classes,
                            preferred_two_hour_days: learner.two_hour_days,
                            DL_test_date: learner.DL_test_date,
                        }
                      )}
                    >
                    <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(learner.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-4">
                            {/* Column 1: Learner Contact Info (Name, Email, Phone, Area) */}
                            <div>
                                <h3 className="text-lg font-medium">
                                    {learner.name}
                                </h3>
                                <p className="text-sm">
                                    <span className="font-medium">Email:</span>{" "}
                                    {learner.email || "N/A"}
                                </p>
                                <p className="text-sm">
                                    <span className="font-medium">Phone:</span>{" "}
                                    {learner.phone}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {learner.area || "No area specified"}
                                </p>
                            </div>
                            {/* Column 2: Currently Empty (Placeholder for the new column) */}
                            <div> 


                            </div>
                            {/* Column 3: Payment/Enrollment Info (Installment, Total, Due, Status, Due Since) */}
                            <div>
                                <p className="text-sm">
                                    <span className="font-medium">Installment mode</span>{" "}
                                    {learner.enrollment?.installment_mode || "N/A"}
                                </p>
                                <p className="text-sm">
                                    <span className="font-medium">Total amount:</span>{" "}
                                    {learner.enrollment?.amount || "N/A"}
                                </p>
                                <p className="text-sm">
                                    <span className="font-medium">Due amount:</span>{" "}
                                    {getDueAmount(learner)}
                                </p>
                                <p className="text-sm">
                                    <span className="font-medium">Payment status:</span>{" "}
                                    {learner.enrollment?.payment_status || "N/A"}
                                </p>
                                <p className="text-sm">
                                    <span className="font-medium">Due since:</span>{" "}
                                    {
                                        (
                                            learner.schedule?.date && learner.schedule.end_time
                                                ? `${learner.schedule.date} ${learner.schedule.end_time.split(':').slice(0, 2).join(':')}`
                                                : ''
                                        ).trim() || 'N/A'
                                    }
                                </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm">
                                <p className="text-sm">
                                    <span className="font-medium">LL form filled:</span>{" "}
                                    {/* {learner.is_LL_form_filled? "Yes" : "No"} */}
                                    {                       
                                      <div
                                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium
                                            ${
                                              learner?.is_LL_form_filled
                                                ? "bg-green-100 text-green-800"
                                                : "bg-red-100 text-red-800"
                                            }
                                          `}
                                        >
                                        {learner?.is_LL_form_filled
                                          ? "Yes"
                                          : "No"
                                        }
                                      </div>
                                  }
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Preference filled:</span>{" "}
                                  {/* {learner.schedule_preferences?.length > 0 ? "Yes" : "No"} */}
                                  {                       
                                   <div
                                      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium
                                        ${
                                          learner?.schedule_preferences?.length > 0
                                            ? "bg-green-100 text-green-800"
                                            : "bg-red-100 text-red-800"
                                        }
                                      `}
                                    >
                                    {learner?.schedule_preferences?.length > 0
                                      ? "Yes"
                                      : "No"
                                    }
                                    </div>
                                  }
                                </p>
                              </p>
                            </div>
                            {/* Column 4: Added Info (Time Ago) - This was the 3rd column before. */}
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">
                                    Added{" "}
                                    {getTimeAgo(
                                        learner.created_at || learner.signed_up,
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedLearner && (
        <LearnerInfoDialog
          learner={selectedLearner}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
