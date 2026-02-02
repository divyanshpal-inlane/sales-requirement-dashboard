import { ArrowLeft, AlertTriangle, CheckCircle, Search, Wrench, ChevronRight, Save, RefreshCw, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useLearnersWithIssues,
  useLearnerSchedulesAdmin,
  useUpdateLearnerAdmin,
  useUpdateEnrollmentAdmin,
  useUpdatePaymentAdmin,
  useCreateEnrollmentAdmin,
  useCreatePaymentAdmin,
  useDeleteLearnerAllData,
} from "@/queries/learner";
import { Database } from "@/types/database.types";

type Learner = Database["public"]["Tables"]["Learner"]["Row"];
type Enrollment = Database["public"]["Tables"]["enrollment"]["Row"];
type Payment = Database["public"]["Tables"]["payment"]["Row"];

interface Issue {
  type: "enrollment" | "payment" | "schedule" | "learner";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  fix: string;
}

// Issue detection logic
// includeScheduleCheck should only be true when we have actual schedule data
function detectIssues(
  learner: Learner,
  enrollments: Enrollment[],
  payments: Payment[],
  scheduleCount: number,
  includeScheduleCheck: boolean = false,
): Issue[] {
  const issues: Issue[] = [];

  // Ensure enrollments and payments are arrays
  const enrollmentArray = Array.isArray(enrollments) ? enrollments : enrollments ? [enrollments] : [];
  const paymentArray = Array.isArray(payments) ? payments : payments ? [payments] : [];

  const enrollment = enrollmentArray[0];
  const payment = paymentArray[0];

  // Check for missing enrollment
  if (!enrollment && paymentArray.length > 0) {
    issues.push({
      type: "enrollment",
      severity: "critical",
      title: "Missing Enrollment",
      description: "Learner has payment but no enrollment record",
      fix: "Create enrollment with status 'active'",
    });
  }

  // Check enrollment status mismatch with payment
  if (enrollment?.status === "pending" && payment?.status === "full_paid") {
    issues.push({
      type: "enrollment",
      severity: "warning",
      title: "Enrollment Status Mismatch",
      description: "Payment is full but enrollment still pending",
      fix: "Update enrollment status to 'active'",
    });
  }

  // Check for half_paid stuck
  if (payment?.status === "half_paid" && enrollment?.payment_status === "full_paid") {
    issues.push({
      type: "payment",
      severity: "warning",
      title: "Payment Status Mismatch",
      description: "Enrollment shows full_paid but payment record shows half_paid",
      fix: "Update payment status to 'full_paid'",
    });
  }

  // Check for missing schedules with active enrollment (only when we have schedule data)
  if (includeScheduleCheck && enrollment?.status === "active" && scheduleCount === 0) {
    issues.push({
      type: "schedule",
      severity: "warning",
      title: "No Schedules Created",
      description: "Learner has active enrollment but no schedules",
      fix: "Check schedule_preferences and create schedules",
    });
  }

  // Check LL flow issues
  if (learner.LL_result === true && !learner.LL_received) {
    issues.push({
      type: "learner",
      severity: "info",
      title: "LL Not Marked Received",
      description: "LL test passed but not marked as received",
      fix: "Update LL_received to true if learner has received LL",
    });
  }

  // Check demo/custom course issues
  const progress = enrollment?.progress as { type?: string; total_hours?: number } | null;
  if ((progress?.type === "demo" || progress?.type === "custom") && !enrollment?.unlocked_lessons?.length) {
    issues.push({
      type: "enrollment",
      severity: "warning",
      title: "Demo/Custom Missing Lessons",
      description: "Demo or custom course without unlocked_lessons array",
      fix: "Set unlocked_lessons array based on total_hours",
    });
  }

  // Check DL status issues
  if (learner.DL_result === true && !learner.DL_received) {
    issues.push({
      type: "learner",
      severity: "info",
      title: "DL Not Marked Received",
      description: "DL test passed but not marked as received",
      fix: "Update DL_received to true if learner has received DL",
    });
  }

  return issues;
}

function getSeverityColor(severity: Issue["severity"]) {
  switch (severity) {
    case "critical":
      return "bg-red-500";
    case "warning":
      return "bg-yellow-500";
    case "info":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
}

function getStatusDot(issues: Issue[]) {
  if (issues.some((i) => i.severity === "critical")) return "bg-red-500";
  if (issues.some((i) => i.severity === "warning")) return "bg-yellow-500";
  if (issues.some((i) => i.severity === "info")) return "bg-blue-500";
  return "bg-green-500";
}

export default function LearnerIssueFixer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [issueFilter, setIssueFilter] = useState<string>("all");
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null);

  const { data: learnersData, isLoading, refetch } = useLearnersWithIssues();
  const { data: schedules } = useLearnerSchedulesAdmin({ learnerId: selectedLearnerId ?? undefined });

  // Get selected learner data
  const selectedLearner = useMemo(() => {
    if (!selectedLearnerId || !learnersData) return null;
    return learnersData.find((l) => l.id === selectedLearnerId) || null;
  }, [selectedLearnerId, learnersData]);

  // Calculate issues for each learner
  const learnersWithIssues = useMemo(() => {
    if (!learnersData) return [];
    return learnersData.map((learner) => {
      const enrollments = (learner as any).enrollment || [];
      const payments = (learner as any).payment || [];
      // Don't include schedule check here since we don't have schedule data for all learners
      const issues = detectIssues(learner, enrollments, payments, 0, false);
      return { ...learner, enrollments, payments, issues };
    });
  }, [learnersData]);

  // Filter learners
  const filteredLearners = useMemo(() => {
    return learnersWithIssues.filter((learner) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        learner.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        learner.phone?.includes(searchQuery) ||
        learner.area?.toLowerCase().includes(searchQuery.toLowerCase());

      // Issue type filter
      const matchesIssue =
        issueFilter === "all" ||
        (issueFilter === "has-issues" && learner.issues.length > 0) ||
        (issueFilter === "no-issues" && learner.issues.length === 0) ||
        learner.issues.some((i) => i.type === issueFilter);

      return matchesSearch && matchesIssue;
    });
  }, [learnersWithIssues, searchQuery, issueFilter]);

  // Current learner's issues (with schedule count - include schedule check)
  const currentIssues = useMemo(() => {
    if (!selectedLearner) return [];
    const learnerData = learnersWithIssues.find((l) => l.id === selectedLearnerId);
    if (!learnerData) return [];
    return detectIssues(
      selectedLearner,
      learnerData.enrollments,
      learnerData.payments,
      schedules?.length || 0,
      true, // Include schedule check since we have actual schedule data
    );
  }, [selectedLearner, learnersWithIssues, schedules, selectedLearnerId]);

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Learner Issue Fixer</h1>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="border-b bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={issueFilter} onValueChange={setIssueFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by issue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Learners</SelectItem>
              <SelectItem value="has-issues">Has Issues</SelectItem>
              <SelectItem value="no-issues">No Issues</SelectItem>
              <SelectItem value="enrollment">Enrollment Issues</SelectItem>
              <SelectItem value="payment">Payment Issues</SelectItem>
              <SelectItem value="schedule">Schedule Issues</SelectItem>
              <SelectItem value="learner">Learner Data Issues</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid flex-1 grid-cols-12 gap-3 overflow-hidden p-3">
        {/* Learner List */}
        <Card className="col-span-4 flex flex-col">
          <CardHeader className="p-3">
            <CardTitle className="text-sm">
              Learners ({filteredLearners.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="space-y-1 p-3 pt-0">
                {isLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading...
                  </div>
                ) : filteredLearners.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No learners found
                  </div>
                ) : (
                  filteredLearners.map((learner) => (
                    <div
                      key={learner.id}
                      onClick={() => setSelectedLearnerId(learner.id)}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all hover:bg-gray-50 ${
                        selectedLearnerId === learner.id
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                    >
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${getStatusDot(learner.issues)}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {learner.name || "No name"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {learner.phone} {learner.area && `• ${learner.area}`}
                        </p>
                      </div>
                      {learner.issues.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {learner.issues.length}
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Issue Panel */}
        <div className="col-span-8 flex flex-col gap-3 overflow-hidden">
          {!selectedLearner ? (
            <Card className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <Wrench className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <h3 className="font-medium">No learner selected</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select a learner to view and fix issues
                </p>
              </div>
            </Card>
          ) : (
            <>
              {/* Issues Panel */}
              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Detected Issues ({currentIssues.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {currentIssues.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">No issues detected</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentIssues.map((issue, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 rounded-lg border p-3"
                        >
                          <div
                            className={`mt-0.5 h-2 w-2 rounded-full ${getSeverityColor(issue.severity)}`}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{issue.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {issue.description}
                            </p>
                            <p className="mt-1 text-xs text-primary">
                              Recommended: {issue.fix}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {issue.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Data Editor */}
              <Card className="flex-1 overflow-hidden">
                <DataEditor
                  learner={selectedLearner}
                  enrollments={
                    learnersWithIssues.find((l) => l.id === selectedLearnerId)
                      ?.enrollments || []
                  }
                  payments={
                    learnersWithIssues.find((l) => l.id === selectedLearnerId)
                      ?.payments || []
                  }
                  schedules={schedules || []}
                  onDeleteSuccess={() => setSelectedLearnerId(null)}
                />
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Data Editor Component
function DataEditor({
  learner,
  enrollments,
  payments,
  schedules,
  onDeleteSuccess,
}: {
  learner: Learner;
  enrollments: Enrollment[];
  payments: Payment[];
  schedules: any[];
  onDeleteSuccess?: () => void;
}) {
  return (
    <Tabs defaultValue="learner" className="flex h-full flex-col">
      <div className="border-b px-3">
        <TabsList className="h-9">
          <TabsTrigger value="learner" className="text-xs">Learner</TabsTrigger>
          <TabsTrigger value="enrollment" className="text-xs">Enrollment</TabsTrigger>
          <TabsTrigger value="payment" className="text-xs">Payment</TabsTrigger>
          <TabsTrigger value="schedules" className="text-xs">Schedules ({schedules.length})</TabsTrigger>
          <TabsTrigger value="danger" className="text-xs text-red-600">Danger Zone</TabsTrigger>
        </TabsList>
      </div>

      <ScrollArea className="flex-1">
        <TabsContent value="learner" className="m-0 p-3">
          <LearnerEditor learner={learner} />
        </TabsContent>

        <TabsContent value="enrollment" className="m-0 p-3">
          <EnrollmentEditor enrollments={enrollments} learnerId={learner.id} />
        </TabsContent>

        <TabsContent value="payment" className="m-0 p-3">
          <PaymentEditor payments={payments} enrollments={enrollments} learnerId={learner.id} />
        </TabsContent>

        <TabsContent value="schedules" className="m-0 p-3">
          <SchedulesViewer schedules={schedules} />
        </TabsContent>

        <TabsContent value="danger" className="m-0 p-3">
          <DangerZone
            learner={learner}
            enrollmentsCount={enrollments.length}
            paymentsCount={payments.length}
            schedulesCount={schedules.length}
            onDeleteSuccess={onDeleteSuccess}
          />
        </TabsContent>
      </ScrollArea>
    </Tabs>
  );
}

// Learner Editor
function LearnerEditor({ learner }: { learner: Learner }) {
  const updateMutation = useUpdateLearnerAdmin();
  const [formData, setFormData] = useState({
    name: learner.name || "",
    phone: learner.phone || "",
    area: learner.area || "",
    has_a_DL: learner.has_a_DL || false,
    LL_result: learner.LL_result,
    LL_received: learner.LL_received || false,
    DL_result: learner.DL_result,
    DL_received: learner.DL_received || false,
    onboarding_completed: learner.onboarding_completed || false,
    dob: learner.dob || "",
    comments: learner.comments || "",
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: learner.id,
      updates: formData,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Phone</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Area</Label>
          <Input
            value={formData.area}
            onChange={(e) => setFormData({ ...formData, area: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Date of Birth</Label>
          <Input
            type="date"
            value={formData.dob}
            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center justify-between rounded-lg border p-2">
          <Label className="text-xs">Has DL</Label>
          <Checkbox
            checked={formData.has_a_DL}
            onCheckedChange={(checked: boolean) => setFormData({ ...formData, has_a_DL: checked })}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-2">
          <Label className="text-xs">LL Passed</Label>
          <Checkbox
            checked={formData.LL_result === true}
            onCheckedChange={(checked: boolean) =>
              setFormData({ ...formData, LL_result: checked ? true : null })
            }
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-2">
          <Label className="text-xs">LL Received</Label>
          <Checkbox
            checked={formData.LL_received}
            onCheckedChange={(checked: boolean) => setFormData({ ...formData, LL_received: checked })}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-2">
          <Label className="text-xs">DL Passed</Label>
          <Checkbox
            checked={formData.DL_result === true}
            onCheckedChange={(checked: boolean) =>
              setFormData({ ...formData, DL_result: checked ? true : null })
            }
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-2">
          <Label className="text-xs">DL Received</Label>
          <Checkbox
            checked={formData.DL_received}
            onCheckedChange={(checked: boolean) => setFormData({ ...formData, DL_received: checked })}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-2">
          <Label className="text-xs">Onboarding Done</Label>
          <Checkbox
            checked={formData.onboarding_completed}
            onCheckedChange={(checked: boolean) =>
              setFormData({ ...formData, onboarding_completed: checked })
            }
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Comments</Label>
        <Textarea
          value={formData.comments}
          onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
          className="text-sm"
          rows={2}
        />
      </div>

      <Button onClick={handleSave} disabled={updateMutation.isPending} size="sm">
        <Save className="mr-2 h-4 w-4" />
        {updateMutation.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}

// Enrollment Editor
function EnrollmentEditor({
  enrollments,
  learnerId,
}: {
  enrollments: (Enrollment & { Courses?: { id: string; name: string | null; duration: number | null; total_lessons: number | null } | null })[];
  learnerId: string;
}) {
  const updateMutation = useUpdateEnrollmentAdmin();
  const createMutation = useCreateEnrollmentAdmin();
  const enrollment = enrollments[0];

  // Get course info from the linked Courses table (primary source)
  const linkedCourse = (enrollment as any)?.Courses;
  // Parse progress as fallback
  const existingProgress = enrollment?.progress as { type?: string; total_hours?: number } | null;
  const existingUnlockedLessons = enrollment?.unlocked_lessons || [];

  // Determine course type from course name (demo, custom, or regular)
  const getCourseType = (): string => {
    const courseName = linkedCourse?.name?.toLowerCase() || "";
    if (courseName.includes("demo")) return "demo";
    if (courseName.includes("custom")) return "custom";
    return existingProgress?.type || "regular";
  };

  // Calculate actual total lessons - prioritize Courses table data
  const actualTotalLessons = linkedCourse?.total_lessons || linkedCourse?.duration || existingProgress?.total_hours || 10;
  const courseType = getCourseType();
  // Calculate half payment lessons (half of total, rounded down)
  const halfPaymentLessons = Math.floor(actualTotalLessons / 2);
  // Full payment lessons (total minus 1 for regular 10-lesson course, or all for others)
  const fullPaymentLessons = (courseType === "regular" && actualTotalLessons === 10)
    ? actualTotalLessons - 1
    : actualTotalLessons;

  const [formData, setFormData] = useState({
    status: enrollment?.status || "pending" as Database["public"]["Enums"]["enrollment_status"],
    payment_status: enrollment?.payment_status || "",
    // Progress fields - use actual course data
    courseType: courseType,
    totalHours: actualTotalLessons,
    // Unlocked lessons - simple number for how many lessons to unlock
    lessonsToUnlock: existingUnlockedLessons.length || 0,
  });

  // Generate unlocked lessons array based on number
  const generateUnlockedLessons = (count: number): number[] => {
    return Array.from({ length: count }, (_, i) => i + 1);
  };

  const handleSave = () => {
    const progress = {
      type: formData.courseType,
      total_hours: formData.totalHours,
    };
    const unlockedLessons = generateUnlockedLessons(formData.lessonsToUnlock);

    if (!enrollment) {
      createMutation.mutate({
        learner_id: learnerId,
        course_id: "default-course-id",
        status: formData.status as Database["public"]["Enums"]["enrollment_status"],
        payment_status: formData.payment_status,
        unlocked_lessons: unlockedLessons,
        progress: progress,
      });
    } else {
      updateMutation.mutate({
        id: enrollment.id,
        updates: {
          status: formData.status as Database["public"]["Enums"]["enrollment_status"],
          payment_status: formData.payment_status,
          unlocked_lessons: unlockedLessons,
          progress: progress,
        },
      });
    }
  };

  // Quick action: Unlock all lessons based on actual course configuration
  const handleUnlockAllLessons = () => {
    setFormData({
      ...formData,
      status: "active",
      payment_status: "full_paid",
      lessonsToUnlock: fullPaymentLessons,
    });
  };

  if (!enrollment) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <p className="text-sm font-medium text-orange-800">No enrollment found</p>
          </div>
          <p className="text-xs text-orange-600 mb-3">
            This learner doesn't have an enrollment record. Enrollments must be created through the normal payment flow to ensure proper course linking.
          </p>
          <p className="text-xs text-muted-foreground">
            To create an enrollment, the learner should complete the payment process in the app, which will automatically create the enrollment with the correct course.
          </p>
        </div>
      </div>
    );
  }

  // Check current status
  const isActive = enrollment.status === "active";
  const isFullyPaid = enrollment.payment_status === "full_paid";

  return (
    <div className="space-y-4">
      {/* Current Status Banner */}
      <div className={`rounded-lg border p-3 ${
        isActive && isFullyPaid
          ? "border-green-300 bg-green-50"
          : isActive
            ? "border-yellow-300 bg-yellow-50"
            : "border-red-300 bg-red-50"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${
              isActive && isFullyPaid ? "text-green-800" : isActive ? "text-yellow-800" : "text-red-800"
            }`}>
              Status: {enrollment.status?.toUpperCase()} | Payment: {enrollment.payment_status?.toUpperCase() || "NOT SET"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Lessons Unlocked: {existingUnlockedLessons.length > 0 ? existingUnlockedLessons.join(", ") : "None"}
              {" "}| Course: {linkedCourse?.name || courseType} ({actualTotalLessons} lessons)
            </p>
          </div>
          {isActive && isFullyPaid && (
            <CheckCircle className="h-6 w-6 text-green-600" />
          )}
        </div>
      </div>

      {/* Quick Fix Actions */}
      {(!isActive || !isFullyPaid || existingUnlockedLessons.length < fullPaymentLessons) && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="mb-2 text-xs font-medium text-blue-800">Quick Fix</p>
          <div className="flex gap-2 flex-wrap">
            {!isActive && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 bg-white"
                onClick={() => {
                  setFormData({ ...formData, status: "active" });
                }}
              >
                Set Status to Active
              </Button>
            )}
            {existingUnlockedLessons.length < fullPaymentLessons && (
              <Button
                size="sm"
                className="text-xs h-7 bg-blue-600 hover:bg-blue-700"
                onClick={handleUnlockAllLessons}
              >
                Unlock All {fullPaymentLessons} Lessons + Set Active + Full Paid
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Enrollment Settings */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-gray-700 border-b pb-1">Enrollment Settings</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium">Enrollment Status</Label>
            <p className="text-[10px] text-muted-foreground">Controls if learner can use the app</p>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as Database["public"]["Enums"]["enrollment_status"] })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending (Cannot schedule)</SelectItem>
                <SelectItem value="active">Active (Can schedule)</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Payment Status in Enrollment</Label>
            <p className="text-[10px] text-muted-foreground">Sync with Payment tab</p>
            <Select
              value={formData.payment_status}
              onValueChange={(value) => setFormData({ ...formData, payment_status: value })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="half_paid">Half Paid ({halfPaymentLessons} lessons)</SelectItem>
                <SelectItem value="full_paid">Full Paid ({fullPaymentLessons} lessons)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Lessons Configuration */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-gray-700 border-b pb-1">Lessons Available for Scheduling</p>

        <div className="space-y-1">
          <Label className="text-xs font-medium">Number of Lessons to Unlock</Label>
          <p className="text-[10px] text-muted-foreground">
            How many lessons can the learner schedule? ({halfPaymentLessons} for half payment, {fullPaymentLessons} for full payment)
          </p>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={0}
              max={actualTotalLessons}
              value={formData.lessonsToUnlock}
              onChange={(e) => setFormData({ ...formData, lessonsToUnlock: Number(e.target.value) })}
              className="h-8 text-sm w-24"
            />
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => setFormData({ ...formData, lessonsToUnlock: halfPaymentLessons })}
                title="Half payment"
              >
                {halfPaymentLessons}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => setFormData({ ...formData, lessonsToUnlock: fullPaymentLessons })}
                title="Full payment"
              >
                {fullPaymentLessons}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => setFormData({ ...formData, lessonsToUnlock: actualTotalLessons })}
                title="All lessons"
              >
                {actualTotalLessons}
              </Button>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Will unlock: {formData.lessonsToUnlock > 0 ? `Lessons 1 to ${formData.lessonsToUnlock}` : "None"}
          </p>
        </div>
      </div>

      {/* Course Information */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-gray-700 border-b pb-1">Course Information</p>

        {linkedCourse ? (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm font-medium text-blue-800">
              {linkedCourse.name || "Unnamed Course"}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Duration: {linkedCourse.duration || linkedCourse.total_lessons || "N/A"} hours/lessons
            </p>
            <p className="text-[10px] text-muted-foreground mt-2">
              Course data comes from the linked Courses table. To change course type,
              you need to update the enrollment's course_id.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Course Type (Manual Override)</Label>
              <p className="text-[10px] text-muted-foreground">No linked course - set manually</p>
              <Select
                value={formData.courseType}
                onValueChange={(value) => setFormData({ ...formData, courseType: value })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular (Standard 10 lessons)</SelectItem>
                  <SelectItem value="demo">Demo (Trial lesson)</SelectItem>
                  <SelectItem value="custom">Custom (Flexible hours)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Total Hours/Lessons</Label>
              <p className="text-[10px] text-muted-foreground">Manual override value</p>
              <Input
                type="number"
                min={1}
                max={20}
                value={formData.totalHours}
                onChange={(e) => setFormData({ ...formData, totalHours: Number(e.target.value) })}
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Current State Info */}
      <div className="rounded-lg bg-gray-50 p-3 text-xs space-y-1">
        <p><strong>Enrollment ID:</strong> {enrollment.id}</p>
        <p><strong>Course ID:</strong> {enrollment.course_id || "Not linked to course"}</p>
        <p><strong>Linked Course:</strong> {linkedCourse?.name || "None"} {linkedCourse && `(${linkedCourse.total_lessons || linkedCourse.duration} lessons)`}</p>
        <p><strong>Created:</strong> {new Date(enrollment.created_at).toLocaleString()}</p>
      </div>

      <Button onClick={handleSave} disabled={updateMutation.isPending} size="sm" className="w-full">
        <Save className="mr-2 h-4 w-4" />
        {updateMutation.isPending ? "Saving..." : "Save All Changes"}
      </Button>
    </div>
  );
}

// Payment Editor
function PaymentEditor({
  payments,
  enrollments,
  learnerId,
}: {
  payments: Payment[];
  enrollments: (Enrollment & { Courses?: { id: string; name: string | null; duration: number | null; total_lessons: number | null } | null })[];
  learnerId: string;
}) {
  const updatePaymentMutation = useUpdatePaymentAdmin();
  const updateEnrollmentMutation = useUpdateEnrollmentAdmin();
  const createPaymentMutation = useCreatePaymentAdmin();
  const payment = payments[0];
  const enrollment = enrollments[0];

  // Get course info from the linked Courses table (primary source)
  const linkedCourse = (enrollment as any)?.Courses;
  // Parse progress as fallback
  const existingProgress = enrollment?.progress as { type?: string; total_hours?: number } | null;

  // Determine course type from course name
  const getCourseType = (): string => {
    const courseName = linkedCourse?.name?.toLowerCase() || "";
    if (courseName.includes("demo")) return "demo";
    if (courseName.includes("custom")) return "custom";
    return existingProgress?.type || "regular";
  };

  // Calculate actual total lessons - prioritize Courses table data
  const actualTotalLessons = linkedCourse?.total_lessons || linkedCourse?.duration || existingProgress?.total_hours || 10;
  const courseType = getCourseType();
  const halfPaymentLessons = Math.floor(actualTotalLessons / 2);
  const fullPaymentLessons = (courseType === "regular" && actualTotalLessons === 10)
    ? actualTotalLessons - 1
    : actualTotalLessons;

  const [cashPaymentAmount, setCashPaymentAmount] = useState(0);

  // Check payment status
  const isFullyPaid = payment?.status === "full_paid";
  const isHalfPaid = payment?.status === "half_paid";
  const hasNoPayment = !payment;

  // Handle cash payment - updates both payment and enrollment
  const handleCashPayment = async (paymentType: "half" | "full" | "remaining") => {
    const isFullPayment = paymentType === "full" || paymentType === "remaining";
    const lessonsToUnlock = isFullPayment ? fullPaymentLessons : halfPaymentLessons;

    if (payment) {
      // Update existing payment
      await updatePaymentMutation.mutateAsync({
        id: payment.id,
        updates: {
          status: isFullPayment ? "full_paid" : "half_paid",
          amount: paymentType === "remaining"
            ? (payment.amount + cashPaymentAmount)
            : (cashPaymentAmount || payment.amount),
          gateway_reference: payment.gateway_reference
            ? `${payment.gateway_reference}, CASH-${Date.now()}`
            : `CASH-${Date.now()}`,
        },
      });
    } else {
      // Create new payment record
      await createPaymentMutation.mutateAsync({
        learner_id: learnerId,
        amount: cashPaymentAmount,
        status: isFullPayment ? "full_paid" : "half_paid",
        payment_type: "course",
        gateway_reference: `CASH-${Date.now()}`,
      });
    }

    // Update enrollment if exists
    if (enrollment) {
      await updateEnrollmentMutation.mutateAsync({
        id: enrollment.id,
        updates: {
          status: "active",
          payment_status: isFullPayment ? "full_paid" : "half_paid",
          unlocked_lessons: Array.from({ length: lessonsToUnlock }, (_, i) => i + 1),
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Payment Status */}
      <div className={`rounded-lg border p-3 ${
        isFullyPaid
          ? "border-green-300 bg-green-50"
          : isHalfPaid
            ? "border-yellow-300 bg-yellow-50"
            : "border-red-300 bg-red-50"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${
              isFullyPaid ? "text-green-800" : isHalfPaid ? "text-yellow-800" : "text-red-800"
            }`}>
              Payment Status: {isFullyPaid ? "FULLY PAID" : isHalfPaid ? "HALF PAID" : "NO PAYMENT"}
            </p>
            {payment && (
              <p className="text-xs text-muted-foreground mt-1">
                Amount: ₹{payment.amount} | Ref: {payment.gateway_reference || "N/A"}
              </p>
            )}
          </div>
          {isFullyPaid && (
            <CheckCircle className="h-6 w-6 text-green-600" />
          )}
        </div>
      </div>

      {/* Show Cash Payment Options ONLY if not fully paid */}
      {!isFullyPaid && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="mb-2 text-xs font-medium text-blue-800">
            {hasNoPayment ? "Record Cash Payment" : "Record Remaining Payment"}
          </p>
          <p className="mb-3 text-xs text-blue-600">
            {hasNoPayment
              ? "Customer paid in cash? Use these buttons to update payment and unlock lessons."
              : "Customer paid remaining amount? Update to full payment."}
          </p>

          <div className="flex items-center gap-3 mb-3">
            <div className="space-y-1">
              <Label className="text-xs">Amount Received (₹)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={cashPaymentAmount || ""}
                onChange={(e) => setCashPaymentAmount(Number(e.target.value))}
                className="h-8 text-sm w-32 bg-white"
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {hasNoPayment && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 bg-white"
                  onClick={() => handleCashPayment("half")}
                  disabled={updatePaymentMutation.isPending || createPaymentMutation.isPending}
                >
                  Half Payment (Unlock {halfPaymentLessons} Lessons)
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-7 bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleCashPayment("full")}
                  disabled={updatePaymentMutation.isPending || createPaymentMutation.isPending}
                >
                  Full Payment (Unlock {fullPaymentLessons} Lessons)
                </Button>
              </>
            )}
            {isHalfPaid && (
              <Button
                size="sm"
                className="text-xs h-7 bg-green-600 hover:bg-green-700"
                onClick={() => handleCashPayment("remaining")}
                disabled={updatePaymentMutation.isPending}
              >
                Mark Remaining Paid (Unlock All {fullPaymentLessons} Lessons)
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Payment Details (read-only info) */}
      {payment && (
        <div className="rounded-lg bg-gray-50 p-3 text-xs space-y-1">
          <p><strong>Payment ID:</strong> {payment.id}</p>
          <p><strong>Created:</strong> {new Date(payment.created_at).toLocaleString()}</p>
          <p><strong>Amount Paid:</strong> ₹{payment.amount}</p>
          <p><strong>Total Amount:</strong> ₹{payment.total_amount || payment.amount}</p>
          <p><strong>Type:</strong> {payment.payment_type}</p>
          <p><strong>Reference:</strong> {payment.gateway_reference || "N/A"}</p>
        </div>
      )}
    </div>
  );
}

// Schedules Viewer
function SchedulesViewer({ schedules }: { schedules: any[] }) {
  if (schedules.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed p-4 text-center">
        <p className="text-sm text-muted-foreground">No schedules found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {schedules.map((schedule) => (
        <div
          key={schedule.id}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div>
            <p className="text-sm font-medium">
              Lesson {schedule.Lesson?.number || "?"} - {schedule.date}
            </p>
            <p className="text-xs text-muted-foreground">
              {schedule.start_time} - {schedule.end_time}
              {schedule.Instructor?.name && ` • ${schedule.Instructor.name}`}
            </p>
          </div>
          <Badge
            variant={schedule.status === "completed" ? "default" : "secondary"}
          >
            {schedule.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// Danger Zone - Bulk Delete Component
function DangerZone({
  learner,
  enrollmentsCount,
  paymentsCount,
  schedulesCount,
  onDeleteSuccess,
}: {
  learner: Learner;
  enrollmentsCount: number;
  paymentsCount: number;
  schedulesCount: number;
  onDeleteSuccess?: () => void;
}) {
  const deleteMutation = useDeleteLearnerAllData();
  const [confirmText, setConfirmText] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    try {
      const result = await deleteMutation.mutateAsync({
        learnerId: learner.id,
        counts: {
          schedules: schedulesCount,
          enrollments: enrollmentsCount,
          payments: paymentsCount,
        },
      });
      alert(
        `Successfully deleted:\n` +
        `- ${result.schedules} schedule(s)\n` +
        `- ${result.enrollments} enrollment(s)\n` +
        `- ${result.payments} payment(s)\n` +
        `- Learner record`
      );
      setIsOpen(false);
      setConfirmText("");
      onDeleteSuccess?.();
    } catch (error) {
      alert(`Failed to delete: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const totalRecords = 1 + enrollmentsCount + paymentsCount + schedulesCount;
  const expectedConfirmText = "DELETE";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h3 className="font-semibold text-red-800">Danger Zone</h3>
        </div>
        <p className="text-sm text-red-700 mb-4">
          Actions in this section are <strong>irreversible</strong>. Please proceed with caution.
        </p>

        {/* Data Summary */}
        <div className="bg-white rounded-lg border border-red-200 p-3 mb-4">
          <p className="text-xs font-medium text-gray-700 mb-2">Data that will be deleted:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Learner:</span>
              <span className="font-medium">{learner.name || "No name"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium">{learner.phone || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Schedules:</span>
              <span className="font-medium">{schedulesCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Enrollments:</span>
              <span className="font-medium">{enrollmentsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payments:</span>
              <span className="font-medium">{paymentsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Records:</span>
              <span className="font-bold text-red-600">{totalRecords}</span>
            </div>
          </div>
        </div>

        {/* Delete Button with Confirmation Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All Learner Data
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Confirm Permanent Deletion
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    You are about to permanently delete <strong>all data</strong> for:
                  </p>
                  <div className="bg-gray-100 rounded-lg p-3 text-sm">
                    <p className="font-medium">{learner.name || "Unnamed Learner"}</p>
                    <p className="text-muted-foreground">{learner.phone}</p>
                  </div>
                  <p className="text-sm">
                    This will delete:
                  </p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    <li>{schedulesCount} schedule(s)</li>
                    <li>{paymentsCount} payment(s)</li>
                    <li>{enrollmentsCount} enrollment(s)</li>
                    <li>1 learner record</li>
                  </ul>
                  <div className="pt-2">
                    <Label className="text-xs font-medium">
                      Type <span className="font-bold text-red-600">DELETE</span> to confirm:
                    </Label>
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="Type DELETE"
                      className="mt-1"
                    />
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmText("");
                  setIsOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={confirmText !== expectedConfirmText || deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Learner ID for reference */}
      <div className="rounded-lg bg-gray-50 p-3 text-xs">
        <p><strong>Learner ID:</strong> {learner.id}</p>
        <p><strong>Created:</strong> {new Date(learner.created_at).toLocaleString()}</p>
      </div>
    </div>
  );
}
