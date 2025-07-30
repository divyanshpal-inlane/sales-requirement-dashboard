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
  const { data: learners, isLoading } = useQuery({
    queryKey: ["learners"],
    queryFn: async () => {
      const { data, error } = await supabase
          .from("Learner")
          .select(`*, payment!inner(status)`)
          .eq("payment.status", "completed")
          .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LearnerInfo[];
    },
  });

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
                      onClick={() => handleLearnerSelect(learner)}
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
