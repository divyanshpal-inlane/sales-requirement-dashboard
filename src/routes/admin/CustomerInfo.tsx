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

export default function CustomerInfo() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLearner, setSelectedLearner] = useState<LearnerInfo | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);

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
      console.log("Fetched learners:", data, "enrollment", data?.[0]?.enrollment);
      // data = getLatestRecords(data || []);
      // console.log("FetchedSorted learners:", data, "enrollment", data?.[0]?.enrollment);
      return data ; //as LearnerInfo[];
    },
  });
  learners = getLatestRecords(learners);
  console.log("Single enrollemt retreived learners", learners);
  learners = sortLearnersByEnrollmentMode(learners);
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

    function sortLearnersByEnrollmentMode(learnersWithSingleRecords) {
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
            
            return 0; // Maintain order if modes are equal
        });
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
                        }
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(learner.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-3">
                          <div>
                            <h3 className="text-lg font-medium">
                              {learner.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {learner.area || "No area specified"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm">
                              <span className="font-medium">Phone:</span>{" "}
                              {learner.phone}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Email:</span>{" "}
                              {learner.email || "N/A"}
                            </p>
                          </div>
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
                              <span className="font-medium">2nd installment amount:</span>{" "}
                              {learner.enrollment?.installment2_amount || "N/A"}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Payment status:</span>{" "}
                              {learner.enrollment?.payment_status || "N/A"}
                            </p>
                          </div>
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
