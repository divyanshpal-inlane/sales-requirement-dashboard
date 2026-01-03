import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Filter, Search } from "lucide-react";
import { useEffect, useState } from "react";
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
import { formatDate, generateRandomOTP } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export default function CustomerInfo() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLearner, setSelectedLearner] = useState<LearnerInfo | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const maxNumLessonsOnHalfInstallment = 1;

  const [activeTopup, setActiveTopup] = useState(null);

  const [updatingPaidInfo, setUpdatingPaidInfo] = useState({});
  const [paidInfoDialogOpen, setPaidInfoDialogOpen] = useState(false);
  const [paidInfoDialogData, setPaidInfoDialogData] = useState(null);
  const [manualAmount, setManualAmount] = useState<number>(0);
  const [manualInstallment1 , setManualInstallment1] = useState<number | null>(null);
  const [manualInstallment2 , setManualInstallment2] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  
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
            enrollment!inner(
              id, 
              amount, 
              installment1_amount, 
              installment2_amount, 
              installment_mode, 
              payment_status, 
              Courses(name, total_lessons)
            ),
            schedule_preferences!left(learner_id)
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
    // 	"Appending schedules - input:",
    // 	{ learnersCount: learners.length, schedulesCount: scheduleByLearnerData.length },
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
    // 	learners: Array.isArray(learners) ? `count=${learners.length}` : learners,
    // 	scheduleByLearnerData: Array.isArray(scheduleByLearnerData) ? `count=${scheduleByLearnerData.length}` : scheduleByLearnerData,
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
  useEffect(() => {
    console.log("filteredLearners", filteredLearners[0]);
  }, [filteredLearners]);

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
    // console.log("Calculating due amount for learner:", learner);
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


  const handleUpdatePaidInfoClose = () => {
    if (!paidInfoDialogData) {
      console.log("No enrollment data available");
      return;
    }
    console.log("Closing paid info dialog for enrollment:", paidInfoDialogData);
    setUpdatingPaidInfo((prev) => ({ ...prev, [paidInfoDialogData?.id]: false }));
    setPaidInfoDialogOpen(false);
    // setPaidInfoDialogData(null);
    // setManualAmount(0);
    console.log("updatingPaidInfo" , updatingPaidInfo);
  };

  const useUpdateEnrollmentMutation = useMutation({
        mutationFn: async ({ 
          enrollmentId, 
          updates 
        }: {
          enrollmentId: string;
          updates: Partial<any>;
        }) => {
            const { data, error } = await supabase
                .from('enrollment')
                .update(updates)
                .eq('id', enrollmentId)
            if (error) throw error;
            console.log("Updated installment info");
        },
        
        // Invalidate relevant queries upon successful completion
        onSuccess: (data, variables) => {
            // Invalidate the specific enrollment query to force a fresh fetch
            queryClient.invalidateQueries({ queryKey: ['enrollment', variables.enrollmentId] });
            
            // Invalidate the generic list of enrollments if necessary
            queryClient.invalidateQueries({ queryKey: ['enrollments'] });

        },
        
        onError: (error) => {
            // Optional: Log or handle global mutation errors here
            console.error("Mutation failed:", error);
        }
    });

    useEffect(() => {
      setManualInstallment1(paidInfoDialogData?.enrollement?.installment1_amount || 0);
      setManualInstallment2(paidInfoDialogData?.enrollement?.installment2_amount || 0);
      setManualAmount(paidInfoDialogData?.enrollement?.amount 
        || (paidInfoDialogData?.enrollement?.installment1_amount) 
          + (paidInfoDialogData?.enrollement?.installment2_amount));

      console.log("T2_1 installment amount changed:", paidInfoDialogData?.enrollment,
         manualInstallment1, manualInstallment2,manualAmount);
    }, [paidInfoDialogData]);

const handleUpdatePaidInfoSave = async () => {
  if (!paidInfoDialogData) return;

  try {
      let paymentStatus = "unpaid";
      let finalAmount = 0 ,val1 = 0, val2 = 0;
    console.log("T2_2 finalAmount", finalAmount);

    if (paidInfoDialogData?.enrollment?.installment_mode === "full") {
        // 1. FULL MODE logic
        // If manualAmount is truthy/greater than 0, it's completed
        finalAmount = Number(manualAmount ?? 0) || finalAmount;
        paymentStatus = "completed";
      } else {
       val1 = (manualInstallment1 != null && manualInstallment1 != undefined) 
        ? Number(manualInstallment1) : 0;
       val2 = (manualInstallment2 != null && manualInstallment2 != undefined)
        ? Number(manualInstallment2) : 0;

      if (val1 > 0 && val2 > 0) {
        paymentStatus = "completed";
      } else if (val1 > 0) {
        paymentStatus = "half_paid";
      }
    }
    
    console.log("T2_2 finalAmount", finalAmount);


    // 1. Generate the unlocked_lessons array
    // We get the count from the nested Courses data
    const totalLessonsCount = paidInfoDialogData?.enrollment?.Courses?.total_lessons || 0;
    
    // Create array: e.g., if totalLessonsCount is 2, returns ["1", "2"]
    const unlockedLessons = Array.from(
      { length: totalLessonsCount }, 
      (_, i) => (i + 1).toString()
    );

    let isSecondInstallment = false;
    if (paidInfoDialogData?.enrollment?.payment_status === "half_paid") {
      // Check if there's a completed first installment payment
      const { data: firstPayments, error: paymentsError } = await supabase
        .from("payment")
        .select("id, status")
        .eq("learner_id", learner.id)
        .eq("installment_type", "first_half")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1);

      // console.log("First installment payments:", firstPayments, paymentsError);
      if (!paymentsError && firstPayments && firstPayments.length > 0) {
        // If there's a completed first installment payment, this is a second installment
          isSecondInstallment = true;
          // parentPaymentId = firstPayments[0].id;
      }
      
    }

    const installmentMode = paidInfoDialogData?.enrollment?.installment_mode || "full";
    let paymentOption = "full";

    // If it's a second installment, force the payment option
    if (isSecondInstallment) {
      paymentOption = "installment";
    } else if (
      // possible values "full" | "installment" | "second_half" | "first_half"
      installmentMode != "full" 
    ) {
      // If enrollment was created with installment mode, default to that
      paymentOption = "installment";
    }
    const installmentType = isSecondInstallment
                          ? "second_half"
                          : paymentOption === "full"
                            ? "full"
                            : "first_half";
      const pStatus = paymentStatus;
      // finalAmount === val1
      //                   ? "completed"
      //                   : val1 === 0
      //                     ? "unpaid"
      //                     : "half_paid";

              
    // 2. Insert Payment Record
    const { data: paymentRecord, error: dbError } = await supabase
      .from("payment")
      .insert([
        {
          learner_id: paidInfoDialogData?.learner_id || paidInfoDialogData?.id,
          amount: finalAmount,
          total_amount: finalAmount,
          installment1_amount: val1,
          installment2_amount: val2,
          installment_type: installmentType,
          email: paidInfoDialogData?.email,
          phone: paidInfoDialogData?.phone,
          payment_type: "course",
          status: pStatus, 
          name: paidInfoDialogData?.name,
        }
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    // 3. Update Enrollment 
    await useUpdateEnrollmentMutation.mutateAsync({
      enrollmentId: paidInfoDialogData?.enrollment?.id,
      updates: {
        // amount: finalAmount,
        payment_id: paymentRecord.id,
        status: "active",
        payment_status: paymentStatus,
        //installment1_amount: val1,
        //installment2_amount: val2,
        //installment_mode: "full",
        unlocked_lessons: unlockedLessons
      },
    });

    toast({ 
      title: "Success", 
      description: `Payment recorded and ${unlockedLessons.length} lessons unlocked.` 
    });

  } catch (error) {
    console.error("Save Error:", error);
    toast({ title: "Save Failed", description: error.message, variant: "destructive" });
  }
};

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
                    >
                      <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12"
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
                              {/* Column 2: Currently Empty */}
                              <div> 


                              </div>
                              {/* Column 3: Payment/Enrollment Info (Installment, Total, Due, Status, Due Since) */}
                              <div>
                                <p className="text-sm">
                                  <span className="font-medium">Installment mode:</span>{" "}
                                  {(() => {
                                    const mode = learner.enrollment?.installment_mode;

                                    const modeMap = {
                                      first_half: "2nd installment pending",
                                      second_half: "Both installment done",
                                      full: "Full complete",
                                    };

                                    return modeMap[mode] || mode || "N/A";
                                  })()}
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
                                    {(() => {
                                      const status = learner.enrollment?.payment_status;

                                      // Mapping object for the logic
                                      const statusMap = {
                                        pending: "Unpaid",
                                        half_paid: "only half done",
                                        completed: "Full complete",
                                        full: "Full complete",
                                        full_paid: "Full complete",
                                      };

                                      return statusMap[status] || status || "N/A";
                                    })()}
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
                                  {/* Add Topup Button */}
                                  <Button 
                                      onClick={() => {
                                          console.log("[Calling] Opening topup for:", learner.enrollment?.id);
                                          setActiveTopup({
                                              enrollmentId: learner?.enrollment?.id,
                                          });
                                      }}
                                      className="mt-4 w-fit px-6 bg-primary hover:opacity-90 text-primary-foreground"
                                  >
                                      Add topup
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setPaidInfoDialogData(learner);
                                      setPaidInfoDialogOpen(true);
                                    }
                                  }
                                    disabled={updatingPaidInfo[learner.enrollment?.id]}
                                    className="mt-4 w-fit px-6 bg-primary hover:opacity-90 text-primary-foreground"

                                  >
                                    Add paid info
                                  </Button>
                              </div>
                              {/* Column 4: Status and Time Ago (FIXED HERE) */}
                              <div className="text-right">
                                <div className="text-sm">
                                  <span className="font-medium">LL form filled:</span>{" "}
                                  {/* {learner.is_LL_form_filled? "Yes" : "No"} */}
                                  {                       
                                    <div
                                      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium
                                        ${ learner?.has_a_DL
                                          ? "bg-gray-100 text-gray-800"
                                          :
                                          learner?.is_LL_form_filled
                                            ? "bg-green-100 text-green-800"
                                            : "bg-red-100 text-red-800"
                                        }
                                      `}
                                    >
                                      {
                                        learner?.has_a_DL
                                        ? "Not Applicable"
                                        : learner?.is_LL_form_filled
                                          ? "Yes"
                                          : "No"
                                      }
                                    </div>
                                  }
                                </div>
                                
                                <div className="text-sm">
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
                                </div>
                                
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
              {/* Render the Topup Dialog */}
              {activeTopup && (
                  <TopupDialog 
                      enrollmentId={activeTopup.enrollmentId}
                      onClose={() => setActiveTopup(null)}
                  />
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
    <Dialog
      open={paidInfoDialogOpen}
      onOpenChange={setPaidInfoDialogOpen}
    >
<DialogContent className="sm:max-w-[425px]">
  <DialogHeader>
    <DialogTitle>Enter Paid Installments</DialogTitle>
  </DialogHeader>
  <div className="grid gap-4 py-4">
    {/* Check if mode is 'full' via paidInfoDialogData */}
    {paidInfoDialogData?.enrollment?.installment_mode === "full" ? (
      /* Single Checkbox View */
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="full-payment-paid"
          checked={manualInstallment1 !== null && manualInstallment1 !== undefined}
          onChange={(e) => {
            const checked = e.target.checked;
            // Use .amount for full payment mode
            const amount = paidInfoDialogData?.enrollment?.amount ?? 0;
            setManualInstallment1(checked ? amount : null);
            // Clear second installment state if it exists
            setManualInstallment2(null);
          }}
        />
        <Label htmlFor="full-payment-paid">
          Full Payment (Amount: {paidInfoDialogData?.enrollment?.amount ?? 0})
        </Label>
      </div>
    ) : (
      /* Dual Installment View */
      <>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="installment1-paid"
            checked={manualInstallment1 !== null && manualInstallment1 !== undefined}
            onChange={(e) => {
              const checked = e.target.checked;
              const amount = paidInfoDialogData?.installment1_amount ?? 0;
              setManualInstallment1(checked ? amount : null);
            }}
          />
          <Label htmlFor="installment1-paid">
            Installment 1 (Amount: {paidInfoDialogData?.installment1_amount ?? 0})
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="installment2-paid"
            disabled={manualInstallment1 === null || manualInstallment1 === undefined}
            checked={manualInstallment2 !== null && manualInstallment2 !== undefined}
            onChange={(e) => {
              const checked = e.target.checked;
              const amount = paidInfoDialogData?.installment2_amount ?? 0;
              setManualInstallment2(checked ? amount : null);
            }}
          />
          <Label
            htmlFor="installment2-paid"
            className={manualInstallment1 === null ? "opacity-50" : ""}
          >
            Installment 2 (Amount: {paidInfoDialogData?.installment2_amount ?? 0})
          </Label>
        </div>
      </>
    )}
  </div>
  <DialogFooter>
    <Button onClick={handleUpdatePaidInfoClose} variant="secondary">
      Cancel
    </Button>
    <Button onClick={handleUpdatePaidInfoSave}>Save</Button>
  </DialogFooter>
</DialogContent>
    </Dialog>
    </div>
  );
}

const TopupDialog = ({ enrollmentId, onClose }) => {
    // Data State
    const [addTopupIsLoading, setAddTopupIsLoading] = useState(true);
    const [addTopupCourseInfo, setAddTopupCourseInfo] = useState(null);
    const [addTopupLessons, setAddTopupLessons] = useState([]);
    const [addTopupLearnerId, setAddTopupLearnerId] = useState(null); 
    const [addTopupCourseId, setAddTopupCourseId] = useState(null); 
    const [addTopupLessonId, setAddTopupLessonId] = useState(null); 
    
    // Form State
    const [addTopupSelectedLessonIds, setAddTopupSelectedLessonIds] = useState([]);
    const [addTopupAmount, setAddTopupAmount] = useState('');
    const [addTopupIsSubmitting, setAddTopupIsSubmitting] = useState(false);
    const [addTopupToast, setAddTopupToast] = useState(null);

    useEffect(() => {
        const addTopupFetchData = async () => {
            if (!enrollmentId) return;
            setAddTopupIsLoading(true);
            try {
                // 1. Fetch Enrollment to get course_id, learner_id, AND instructor_id
                const { data: addTopupEnrollData, error: addTopupEnrollErr } = await supabase
                    .from("enrollment")
                    .select("course_id, learner_id")
                    .eq("id", enrollmentId)
                    .single();

                if (addTopupEnrollErr) throw addTopupEnrollErr;

                const addTopupCourseId = addTopupEnrollData.course_id;
                
                // Set the state variables for the submission payload
                setAddTopupLearnerId(addTopupEnrollData.learner_id);

                // 2. Fetch Course Information
                const { data: addTopupCourseData, error: addTopupCourseErr } = await supabase
                    .from("Courses")
                    .select("id, name, total_lessons")
                    .eq("id", addTopupCourseId)
                    .single();

                if (addTopupCourseErr) throw addTopupCourseErr;
                setAddTopupCourseInfo(addTopupCourseData);

                // 3. Fetch Lessons
                const { data: addTopupLessonData, error: addTopupLessonErr } = await supabase
                    .from("Lesson")
                    .select("*")
                    .eq("course_id", addTopupCourseId)
                    .order("number", { ascending: true });

                if (addTopupLessonErr) throw addTopupLessonErr;
                setAddTopupLessons(addTopupLessonData);

            } catch (err) {
                console.error("[TopupDialog] Fetching error:", err.message);
                setAddTopupToast({ type: 'error', message: "Failed to load data" });
            } finally {
                setAddTopupIsLoading(false);
            }
        };
        addTopupFetchData();
    }, [enrollmentId]);

    // Helpers
    const addTopupAddLesson = (id) => setAddTopupSelectedLessonIds(prev => [...prev, id]);
    
    const addTopupRemoveLesson = (id) => {
        setAddTopupSelectedLessonIds(prev => {
            const addTopupIdx = prev.lastIndexOf(id);
            if (addTopupIdx > -1) {
                const addTopupNewArr = [...prev];
                addTopupNewArr.splice(addTopupIdx, 1);
                return addTopupNewArr;
            }
            return prev;
        });
    };

    const addTopupGetLessonCount = (id) => addTopupSelectedLessonIds.filter(itemId => itemId === id).length;

    // --- Summary Logic (Grouped) ---
    const addTopupCountMap = addTopupSelectedLessonIds.reduce((acc, id) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
    }, {});

    const addTopupGroupedDetails = Object.keys(addTopupCountMap).map(id => {
        const lesson = addTopupLessons.find(l => l.id.toString() === id.toString());
        return { ...lesson, count: addTopupCountMap[id] };
    }).filter(l => l.id);

    const addTopupHasMissingDuration = addTopupGroupedDetails.some(l => l.duration === null || l.duration === undefined);
    const addTopupTotalDurationHours = addTopupGroupedDetails.reduce((acc, curr) => 
        acc + ((Number(curr.duration) || 0) * curr.count), 0
    );

const addTopupHandleSubmit = async (e) => {
    e.preventDefault();
    const addTopupNumericAmount = parseFloat(addTopupAmount);

    // 1. Validations
    if (addTopupSelectedLessonIds.length === 0) {
        setAddTopupToast({ type: 'error', message: "Please select at least one lesson." });
        return;
    }
    if (isNaN(addTopupNumericAmount) || addTopupNumericAmount < 0) {
        setAddTopupToast({ type: 'error', message: "Invalid amount" });
        return;
    }

    setAddTopupIsSubmitting(true);

    // 2. Map through the selected lesson IDs (One record per lesson)
    const recordsToInsert = addTopupSelectedLessonIds.map((lessonId) => ({
        enabled: true,
        learner_id: addTopupLearnerId,
        course_id: addTopupCourseInfo?.id, // Use the ID from your course info state
        lesson_id: lessonId,
        status: 'topup',
        otp: generateRandomOTP(),
        otp_end: generateRandomOTP()
    }));

    console.log(`[TopupDialog] Inserting ${recordsToInsert.length} records into Schedule:`, recordsToInsert);

    try {
        // 3. Perform Bulk Insert
        const { error: addTopupError } = await supabase
            .from('Schedule')
            .insert(recordsToInsert);

        if (addTopupError) throw addTopupError;

        // SUCCESS UI
        setAddTopupToast({ 
            type: 'success', 
            message: `Successfully added ${addTopupSelectedLessonIds.length} topup lesson(s)!` 
        });

        setTimeout(() => {
            onClose();
        }, 1500);

    } catch (err) {
        console.error("[TopupDialog] Submission error:", err.message);
        setAddTopupToast({ type: 'error', message: err.message });
    } finally {
        setAddTopupIsSubmitting(false);
    }
};

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-gray-900 font-sans">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative overflow-hidden flex flex-col max-h-[90vh]">
                
                {addTopupToast && (
                    <div className={`p-3 text-white text-center text-sm font-bold animate-in fade-in slide-in-from-top-2 duration-300 ${
                        addTopupToast.type === 'success' ? 'bg-primary' : 'bg-destructive'
                    }`}>
                        {addTopupToast.message}
                    </div>
                )}

                <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold">Add Lesson Topup</h2>
                        <p className="text-sm font-semibold text-primary uppercase">
                            {addTopupIsLoading ? "Fetching details..." : addTopupCourseInfo?.name}
                        </p>
                    </div>
                    <Button variant="ghost" onClick={onClose} className="text-2xl h-8 w-8 p-0">×</Button>
                </div>

                {addTopupIsLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 space-y-3">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-gray-500 font-medium">Loading...</span>
                    </div>
                ) : (
                    <form onSubmit={addTopupHandleSubmit} className="p-6 overflow-y-auto space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Available Lessons</label>
                            <div className="max-h-56 overflow-y-auto border rounded-lg divide-y bg-gray-50">
                                {addTopupLessons.map(addTopupLesson => {
                                    const addTopupCount = addTopupGetLessonCount(addTopupLesson.id);
                                    const addTopupDispDuration = addTopupLesson.duration ? `${addTopupLesson.duration} hours` : "N/A";
                                    return (
                                        <div key={addTopupLesson.id} className="p-3 flex justify-between items-start bg-white gap-2">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-gray-800">Lesson {addTopupLesson.number}</span>
                                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border tracking-tight">{addTopupDispDuration}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 line-clamp-2 italic leading-tight">
                                                    {addTopupLesson.description || "No description provided"}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {addTopupCount > 0 && (
                                                    <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0 border-primary text-primary" onClick={() => addTopupRemoveLesson(addTopupLesson.id)}>-</Button>
                                                )}
                                                {addTopupCount > 0 && <span className="text-sm font-bold w-4 text-center">{addTopupCount}</span>}
                                                <Button type="button" size="sm" className="h-7 w-7 p-0 bg-primary" onClick={() => addTopupAddLesson(addTopupLesson.id)}>+</Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Grouped Summary Section */}
                        {addTopupSelectedLessonIds.length > 0 && (
                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                                <label className="text-[10px] font-bold text-primary uppercase block tracking-widest border-b border-primary/20 pb-1">Selection Summary</label>
                                <ul className="text-xs space-y-2 text-gray-700 max-h-32 overflow-y-auto">
                                    {addTopupGroupedDetails.map((addTopupItem) => (
                                        <li key={addTopupItem.id} className="flex justify-between items-center bg-white/50 p-1 px-2 rounded border border-primary/5">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-gray-800">Lesson {addTopupItem.number}</span>
                                                <span className="text-[10px] text-gray-500 italic truncate w-40">{addTopupItem.description || "Topup"}</span>
                                            </div>
                                            <span className="text-primary font-bold">x{addTopupItem.count}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="pt-2 border-t border-primary/30 flex flex-col gap-1">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-gray-600 uppercase">Total Count:</span>
                                        <span className="font-black text-primary">{addTopupSelectedLessonIds.length} Lessons</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-gray-600 uppercase">Total Duration:</span>
                                        <span className="font-black text-primary">
                                            {addTopupHasMissingDuration ? "N/A" : `${addTopupTotalDurationHours} hours`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Charge Amount</label>
                            <Input 
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                value={addTopupAmount}
                                onChange={(e) => setAddTopupAmount(e.target.value)}
                                disabled={addTopupIsSubmitting}
                                className="focus-visible:ring-primary font-black text-lg h-12"
                            />
                        </div>

                        <div className="flex gap-3 sticky bottom-0 bg-white pt-2">
                            <Button variant="outline" type="button" onClick={onClose} className="flex-1 h-11 font-medium" disabled={addTopupIsSubmitting}>Cancel</Button>
                            <Button 
                                type="submit" 
                                disabled={addTopupIsSubmitting || addTopupSelectedLessonIds.length === 0} 
                                className="flex-1 h-11 bg-primary hover:opacity-90 text-primary-foreground tracking-widest transition-all font-normal"
                            >
                                {addTopupIsSubmitting ? 'Sending...' : 'Confirm Topup'}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};