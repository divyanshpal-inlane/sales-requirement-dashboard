import { Delete, Filter, RefreshCcw, Search, Send, UserPlus } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { IncompletePaymentsCard } from "./IncompletePaymentsCard";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { addDays, formatDate, subDays } from "date-fns";
import Schedule from "../schedule";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function TentativeSchedules() {
  const [learnerData, setLearnerData] = useState({
    name: "",
    email: "",
    phone: "",
    courseId: "",
    courseName: "",
    amount: 0,
    installmentType: "installment", // Default to installment
    installment1Amount: 0,
    installment2Amount: 0,
    unlockedLessons: [],
    has_a_DL: false,
    address_change_required: false,
  });

  const [searchQuery, setSearchQuery] = useState("");

  const navigate = useNavigate();


  return (
    <div
      className="min-h-screen bg-white p-8"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
        backgroundAttachment: "fixed", // This prevents the background from getting cut off
      }}
    >
      <div className="container mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-4xl font-bold tracking-tight">
            Tentative Schedule Management
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Tentative schedules search
          </p>
        </div>
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
        <div className="grid gap-6">
          {/* Class Schedule */}
          <LearnerNotificationCard />
        </div>
      </div>
    </div>
  );
}

function LearnerNotificationCard() {
  const [incompletePayments, setIncompletePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schedulesList, setSchedulesList] = useState([]);
  const [reschduleFinalTimeSetDialogOpen, setReschduleFinalTimeSetDialogOpen] = useState(false);
  const [rescheduleFinalTime, setRescheduleFinalTime] = useState("");
  
  const maxDaysWindowToFetch = 1;
  // Array of status of each sending event
  // Each state corresponsds to reminder type
  // Each state's is an array corresponding to the number of schedules
  const [
    sendingLearnerLessonReminderStatuses,
    setSendingLearnerLessonReminderStatuses,
  ] = useState({});
  const [
    sendingLearnerReschdWindowReminderStatuses,
    setSendingLearnerReschdWindowReminderStatuses,
  ] = useState({});
  const [
    sendingInstrLessonReminderStatuses,
    setSendingInstrLessonReminderStatuses,
  ] = useState({});

  const { toast } = useToast();

  const fetchSchedulesForReminder = async () => {
    const startDate = new Date();
    const endDate = addDays(startDate, maxDaysWindowToFetch);
    setLoading(true);
    try {
      // Query to get schedules of next maxDaysWindowToFetch days
      const { data, error } = await supabase
        .from("Schedule")
        .select(
          `
          *,
          Learner(name, phone, pick_up_location), 
          Courses(name, duration), 
          Lesson(description)`,
        )
        .gte("date", startDate.toISOString().split("T")[0])
        .eq("isTentative", true)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      console.log(data);
      if (error) throw error;
      
      setSchedulesList(data);
      return data;
    } catch (err) {
      console.error("Error fetching schedules:", err);
      toast({
        title: "Error",
        description: "Failed to fetch schedules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedulesForReminder();
  }, []);

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
      }}
    >
    <Card className="mt-6 transition-all hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">Tentative schedules from today</CardTitle>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchSchedulesForReminder}
          disabled={loading}
        >
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
        </Button>
      </CardHeader>
      <CardContent>
        {

        }
        {schedulesList.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            {loading 
              ? "Loading schedules..." 
              : `No tentative schedules found`
            }
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left">Learner</th>
                  <th className="px-2 py-2 text-left">Phone</th>
                  <th className="px-2 py-2 text-right">Date</th>
                  <th className="px-2 py-2 text-center">Booked time</th>
                  <th className="px-2 py-2 text-left">Lead Name</th>
                  <th className="px-2 py-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody>
                {schedulesList
                  .map((scheduleData) => (
                    <tr
                      key={scheduleData.id}
                      className="border-b hover:bg-muted/50"
                    >
                      <td className="px-2 py-2">
                        <div className="font-medium">
                          {scheduleData.tentative_details?.name || "Unknown"}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <>
                          {(scheduleData.tentative_details?.phone || "Unknown Course")}
                        </>
                      </td>
                      <td className="px-2 py-2 text-right">
                        {scheduleData.date || "Unknown"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium`}
                          >
                          {
                              // Check if start_time exists before processing
                              scheduleData.start_time 
                                  // Split by colon, take the first two elements (HH and MM), and rejoin.
                                  ? scheduleData.start_time.split(':').slice(0, 2).join(':') 
                                  : "Unknown"
                          }
                          -
                          {
                              // Check if start_time exists before processing
                              scheduleData.end_time 
                                  // Split by colon, take the first two elements (HH and MM), and rejoin.
                                  ? scheduleData.end_time.split(':').slice(0, 2).join(':') 
                                  : "Unknown"
                          }
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-medium">
                          {scheduleData.tentative_details?.leadName || "Unknown"}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-medium">
                          {scheduleData.tentative_details?.description || "Unknown"}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

export default function TentativeScheduleInfo2() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLearner, setSelectedLearner] = useState<LearnerInfo | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);


  // Fetch all learners whose payment status is completed
  // in descending order of signup time
  let { data: tentativeSchedulesByLearners, isLoadingTentativeSchedulesByLearners} = useQuery({
    queryKey: ["learnersWithTentative"],
    queryFn: async () => {
      const startDate = subDays(new Date(),7);
      // const endDate = addDays(startDate, maxDaysWindowToFetch);
      // since number's required field we can group by phone number
      const { data, error } = await supabase
        .from("Schedule")
        .select(`*`)
        .gte("date", startDate.toISOString().split("T")[0])
        .eq("isTentative", true)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      console.log("tentativeSchedulesByLearners:", data);
      return data ; //as LearnerInfo[];
    },
  });
  // learners = getLatestRecords(learners);
  // console.log("Single enrollemt retreived learners", learners);
//   function getLatestRecords(learners) {
//     if (!Array.isArray(learners) || learners.length === 0) {
//         return [];
//     }

//     // Custom sorting logic for finding the "latest" record
//     const getLatestRecord = (records) => {
//         if (!records || records.length === 0) {
//             return null;
//         }

//         // Sort function: Highest priority first (b - a for descending)
//         const sortedRecords = [...records].sort((a, b) => {
            
//             // --- 1. Primary Sort: created_at (most recent first) ---
//             const dateA = new Date(a.created_at).getTime();
//             const dateB = new Date(b.created_at).getTime();
//             if (dateB !== dateA) {
//                 return dateB - dateA;
//             }

//             // --- 2. Tie-breaker 1: updated_at (most recent first) ---
//             // If updated_at is null/undefined, it is treated as 0, which correctly sorts valid dates first.
//             const updatedA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
//             const updatedB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
//             if (updatedB !== updatedA) {
//                  return updatedB - updatedA;
//             }

//             // --- 3. Tie-breaker 2: amount (largest first) ---
//             // If amount is null/undefined/0, it is treated as 0.
//             const amountA = a.amount || 0;
//             const amountB = b.amount || 0;
//             return amountB - amountA; // Descending order for amount
//         });

//         // Return the single most recent record
//         return sortedRecords[0];
//     };

//     // The function continues here to process the learners array
//     return learners.map(learner => {
//         // Find the most recent Enrollment
//         const latestEnrollment = getLatestRecord(learner.enrollment);

//         // Find the most recent Payment
//         const latestPayment = getLatestRecord(learner.payment);

//         // Return a new learner object with the arrays replaced by single objects
//         return {
//             ...learner,
//             enrollment: latestEnrollment,
//             payment: latestPayment,
//         };
//     });
// }

    // function sortLearnersByEnrollmentAndSchedule(learnersWithSingleRecords) {
    //     return [...learnersWithSingleRecords].sort((a, b) => {
    //         const modeA = a.enrollment?.installment_mode;
    //         const modeB = b.enrollment?.installment_mode;

    //         const isAFirstHalf = modeA === "first_half";
    //         const isBFirstHalf = modeB === "first_half";

    //         if (isAFirstHalf && !isBFirstHalf) {
    //             return -1; // A comes before B (prioritized)
    //         }
    //         if (!isAFirstHalf && isBFirstHalf) {
    //             return 1; // B comes before A (prioritized)
    //         }
            
    //         // Second sorting based on schedule time using getHoursSince
    //         // Prefer learners that have a schedule (with date or start_time).
    //         const hasScheduleA = !!(a.schedule && (a.schedule.date || a.schedule.start_time));
    //         const hasScheduleB = !!(b.schedule && (b.schedule.date || b.schedule.start_time));

    //         if (hasScheduleA && !hasScheduleB) return -1;
    //         if (!hasScheduleA && hasScheduleB) return 1;
    //         if (!hasScheduleA && !hasScheduleB) return 0;

    //         // Both have schedules — sort by hours since (higher hours => higher priority)
    //         const hA = getHoursSince(a.schedule);
    //         const hB = getHoursSince(b.schedule);

    //         // If both hours are invalid, keep original order
    //         if (hA === null && hB === null) return 0;
    //         if (hA === null) return 1; // b has valid hours, a doesn't -> b first
    //         if (hB === null) return -1; // a has valid hours, b doesn't -> a first

    //         return (hB as number) - (hA as number);
    //         return 0; // Maintain order if modes are equal
    //     });
    // }

  // const {
  //   data: scheduleByLearnerData,
  //   isLoading: isLoadingScheduleByLearner,
  //   error: errorLoadingScheduleByLearner,
  // } = useQuery({
  //   queryKey: ["scheduleByLearner", learners?.map((l) => l.id) || []],
  //   queryFn: async () => {
  //     if (!Array.isArray(learners) || learners.length === 0) return [];
  //     const currentTimestamp = new Date();
  //     // use ISO date (yyyy-MM-dd) and HH:MM:SS time to match DB column formats
  //     const dateTimeRef = currentTimestamp.toISOString().split("T")[0];
  //     const hourTimeRef = currentTimestamp.toTimeString().split(" ")[0];
  //     const { data, error } = await supabase
  //       .from("Schedule")
  //       .select("*, Lesson!inner(number)")
  //       .lte("date", dateTimeRef)
  //       .lt("start_time", hourTimeRef)
  //       .eq("Lesson.number", maxNumLessonsOnHalfInstallment)
  //       .in("learner_id", learners.map((learner) => learner.id));

  //     if (error) throw error;
  //     // console.log("Fetched scheduleByLearnerData:", data);
  //     return data;
  //   },
  //   enabled: Array.isArray(learners) && learners.length > 0,
  // });

  // learners = sortLearnersByEnrollmentAndSchedule(learners);


  // Append Schedule data to each learner item when a schedule exists in scheduleByLearnerData
  // if (Array.isArray(learners) && Array.isArray(scheduleByLearnerData)) {
  //   // console.log(
  //   //   "Appending schedules - input:",
  //   //   { learnersCount: learners.length, schedulesCount: scheduleByLearnerData.length },
  //   // );

  //   const scheduleMap = new Map<string, any>();

  //   for (const sch of scheduleByLearnerData) {
  //     // console.log("Processing schedule input:", sch);
  //     const lid = sch?.learner_id;
  //     if (!lid) {
  //       // console.log("Skipping schedule without learner_id:", sch);
  //       continue;
  //     }
  //     // Store the schedule for the learner (if multiple exist, last one wins)
  //     scheduleMap.set(lid, sch);
  //     // console.log(`Mapped schedule for learner_id=${lid}:`, sch);
  //   }

  //   // console.log("Schedule map built. Keys:", Array.from(scheduleMap.keys()));

  //   const learnersBefore = learners;
  //   // console.log("Learners before attaching schedules (sample):", learnersBefore.slice?.(0, 5) ?? learnersBefore);

  //   learners = learners.map((learner) => {
  //     const attachedSchedule = scheduleMap.get(learner.id) ?? null;
  //     // add only if not already present
  //     const out = {
  //         ...learner,
  //         schedule: learner.schedule === undefined ? attachedSchedule : learner.schedule,
  //     };
  //     // console.log(`Learner processed id=${learner.id} - attachedSchedule:`, attachedSchedule);
  //     return out;
  //   });

  //   // console.log("Learners after attaching schedules (sample):", learners.slice?.(0, 5) ?? learners);
  // } else {
  //   // console.log("No learners or schedules to process", {
  //   //   learners: Array.isArray(learners) ? `count=${learners.length}` : learners,
  //   //   scheduleByLearnerData: Array.isArray(scheduleByLearnerData) ? `count=${scheduleByLearnerData.length}` : scheduleByLearnerData,
  //   // });
  // }
  // Filter learners based on search query
  const filteredLearners = tentativeSchedulesByLearners?.filter(
    (schedule) =>
      schedule.tentative_details.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.tentative_details.phone.includes(searchQuery) ||
      schedule.tentative_details.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.tentative_details.area?.toLowerCase().includes(searchQuery.toLowerCase()),
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
            <h1 className="text-2xl font-bold">Tentative Schedules</h1>
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
            <Button
              variant="outline"
              className="gap-2 transition-all duration-100 active:scale-[0.85] active:shadow-inner"
            >
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
              {isLoadingTentativeSchedulesByLearners ? (
                <div className="flex items-center justify-center p-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : filteredLearners?.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No customers found matching your search
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredLearners?.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50"
                      onClick={() => handleTentativeShow(schedules)}
                    >
                    <div className="flex items-start gap-4">
                            {getInitials(schedule.tentative_details.name)}
                        <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-4">
                            {/* Column 1: Learner Contact Info (Name, Email, Phone, Area) */}
                            <div>
                                <h3 className="text-lg font-medium">
                                    {schedule.tentative_details.name}
                                </h3>
                                <p className="text-sm">
                                    <span className="font-medium">Email:</span>{" "}
                                    {schedule.tentative_details.email || "N/A"}
                              </p>
                                <p className="text-sm">
                                    <span className="font-medium">Phone:</span>{" "}
                                    {schedule.tentative_details.phone}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {schedule.tentative_details.area || "No area specified"}
                                </p>
                            </div>
                            {/* Column 2: Currently Empty (Placeholder for the new column) */}
                            <div> 


                            </div>
                            {/* Column 3: Payment/Enrollment Info (Installment, Total, Due, Status, Due Since) */}
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
    </div>
  );
}




          // <AnimatePresence>
          //   <motion.div
          //     key="session-details"
          //     initial={false}
          //     animate={{
          //       height: isSessionDetailsMinimized ? "auto" : "auto",
          //       opacity: 1,
          //     }}
          //     exit={{ height: 0, opacity: 0 }}
          //     transition={{ type: "spring", stiffness: 300, damping: 30 }}
          //     className="mx-4 mb-4 rounded-3xl bg-[#FFFFF0] p-4"
          //   >
          //     <div className="mb-2 flex items-center justify-between">
          //       <h3 className="text-lg font-semibold">Session Details</h3>
          //       <Button
          //         size="sm"
          //         variant="ghost"
          //         onClick={() =>
          //           setIsSessionDetailsMinimized(!isSessionDetailsMinimized)
          //         }
          //       >
          //         {isSessionDetailsMinimized ? <ChevronDown /> : <ChevronUp />}
          //       </Button>
          //     </div>
          //     <motion.div
          //       initial={false}
          //       animate={{
          //         height: isSessionDetailsMinimized ? 0 : "auto",
          //         opacity: isSessionDetailsMinimized ? 0 : 1,
          //       }}
          //       transition={{ duration: 0.3 }}
          //       className="overflow-hidden"
          //     >
          //       <div className="grid grid-cols-2 gap-4">
          //         {/* Row 1 */}
          //         <div className="flex flex-col gap-0">
          //           <p className="text-sm font-light">Date</p>
          //           <p className="text-base">
          //             {schedule
          //               ? format(new Date(schedule.date), "EEE, do MMM")
          //               : "Not available"}
          //           </p>
          //         </div>
          //         <div className="flex flex-col gap-0">
          //           <p className="text-sm font-light">Time</p>
          //           <p className="text-base">{timeString}</p>
          //         </div>

          //         {/* Row 2 */}
          //         <div className="flex flex-col gap-0">
          //           <p className="text-sm font-light">Instructor Name</p>
          //           <p className="text-base">
          //             {schedule?.Instructor?.name
          //               ? schedule?.Instructor?.name
          //               : "Not available"}
          //           </p>
          //         </div>
          //         <div className="flex flex-col gap-0">
          //           <p className="text-sm font-light">Mobile number</p>
          //           <p className="text-base">
          //             {schedule?.Instructor?.phone
          //               ? schedule?.Instructor?.phone
          //               : "Not available"}
          //           </p>
          //         </div>

          //         {/* Row 3 */}
          //         <div className="flex flex-col gap-0">
          //           <p className="text-sm font-light">Car Model</p>
          //           <p className="text-base">
          //             {schedule?.Instructor?.car_make
          //               ? schedule?.Instructor?.car_make
          //               : "Not available"}
          //           </p>
          //         </div>
          //         <div className="flex flex-col gap-0">
          //           <p className="text-sm font-light">Car Number</p>
          //           <p className="text-base">
          //             {schedule?.Instructor?.car_number
          //               ? schedule?.Instructor?.car_number
          //               : "Not available"}
          //           </p>
          //         </div>
          //         <div className="flex flex-col gap-0">
          //           <p className="text-sm font-light">Pick Up location</p>

          //           <Popover>
          //             <PopoverTrigger>
          //               <p className="truncate text-base">
          //                 {learner?.pick_up_location
          //                   ? learner?.pick_up_location
          //                   : "Not available"}
          //               </p>
          //             </PopoverTrigger>
          //             <PopoverContent>
          //               {learner?.pick_up_location}
          //             </PopoverContent>
          //           </Popover>
          //         </div>
          //       </div>
          //     </motion.div>
          //     {isSessionDetailsMinimized && (
          //       <div className="flex flex-col gap-1">
          //         <motion.p
          //           initial={{ opacity: 0 }}
          //           animate={{ opacity: 1 }}
          //           exit={{ opacity: 0 }}
          //           className="text-base font-light"
          //         >
          //           <span className="font-medium">Date:</span>{" "}
          //           {schedule
          //             ? format(new Date(schedule.date), "EEE, do MMM")
          //             : "Not available"}
          //         </motion.p>
          //         <motion.p
          //           initial={{ opacity: 0 }}
          //           animate={{ opacity: 1 }}
          //           exit={{ opacity: 0 }}
          //           className="text-base font-light"
          //         >
          //           <span className="font-medium">Time: </span>
          //           {timeString}
          //         </motion.p>
          //       </div>
          //     )}
          //   </motion.div>
          // </AnimatePresence>
