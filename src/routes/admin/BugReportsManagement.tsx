import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  Bug,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Image,
  Lightbulb,
  Loader2,
  Mail,
  MessageSquare,
  Monitor,
  Phone,
  RefreshCcw,
  Search,
  Sparkles,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

interface BugReport {
  id: string;
  created_at: string;
  updated_at: string;
  report_type: string;
  reporter_name: string;
  reporter_role: string;
  reporter_phone: string | null;
  reporter_email: string | null;
  platform_section: string;
  feature_category: string;
  issue_title: string;
  issue_description: string;
  steps_to_reproduce: string | null;
  affected_user_phone: string | null;
  affected_user_name: string | null;
  browser_info: string | null;
  device_info: string | null;
  screenshot_urls: string[] | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
}

const reportTypeOptions = [
  {
    value: "bug",
    label: "Bug",
    icon: Bug,
    color: "bg-red-100 text-red-700",
    borderColor: "border-red-300",
  },
  {
    value: "feature_request",
    label: "Feature Request",
    icon: Sparkles,
    color: "bg-purple-100 text-purple-700",
    borderColor: "border-purple-300",
  },
  {
    value: "suggestion",
    label: "Suggestion",
    icon: Lightbulb,
    color: "bg-yellow-100 text-yellow-700",
    borderColor: "border-yellow-300",
  },
  {
    value: "improvement",
    label: "Improvement",
    icon: Wrench,
    color: "bg-blue-100 text-blue-700",
    borderColor: "border-blue-300",
  },
];

const statusOptions = [
  { value: "open", label: "Open", color: "bg-blue-500" },
  { value: "in_progress", label: "In Progress", color: "bg-yellow-500" },
  { value: "resolved", label: "Resolved", color: "bg-green-500" },
  { value: "closed", label: "Closed", color: "bg-gray-500" },
  { value: "wont_fix", label: "Won't Fix", color: "bg-red-500" },
];

const priorityOptions = [
  { value: "low", label: "Low", color: "bg-gray-400" },
  { value: "medium", label: "Medium", color: "bg-blue-400" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "critical", label: "Critical", color: "bg-red-600" },
];

const platformOptions = [
  { value: "all", label: "All Platforms" },
  { value: "learner", label: "Learner App" },
  { value: "instructor", label: "Instructor App" },
  { value: "admin", label: "Admin Panel" },
  { value: "general", label: "General" },
];

const roleLabels: Record<string, string> = {
  sales: "Sales",
  ops: "Operations",
  logistics: "Logistics",
  onboarding: "Onboarding",
  customer_handling: "Customer Handling",
  tech: "Tech Team",
  management: "Management",
  other: "Other",
};

const featureCategoryLabels: Record<string, string> = {
  auth_onboarding: "Login & Onboarding",
  home_dashboard: "Home Dashboard & Progress",
  schedule_calendar: "Schedule & Calendar",
  lesson_content: "Lesson Content & Execution",
  rescheduling: "Rescheduling",
  booking_setup: "Booking & Lesson Setup",
  payment: "Payment & Enrollment",
  profile: "Profile Management",
  prep_games: "Learning Preparation Games",
  help_support: "Help & Support",
  auth_login: "Login & Authentication",
  lesson_otp: "Lesson Start/End (OTP)",
  google_calendar: "Google Calendar Integration",
  learner_info: "Learner Information",
  dashboard_access: "Dashboard & Access Control",
  learner_management: "Learner Management & Search",
  enrollment: "Course & Enrollment",
  schedule_management: "Schedule Management",
  instructor_management: "Instructor Management",
  ll_dl_management: "LL/DL License Management",
  customer_info: "Customer Information",
  issue_fixer: "Issue Resolution Tools",
  migration: "Data Migration",
  notifications: "Notifications & Communication",
  admin_users: "Admin User Management",
  settings: "Settings & Configuration",
  payment_gateway: "Payment Gateway",
  performance: "Performance Issues",
  ui_display: "UI/Display Issues",
  data_sync: "Data Sync Issues",
  feature_request: "Feature Request",
  other: "Other",
};

const platformLabels: Record<string, string> = {
  learner: "Learner App",
  instructor: "Instructor App",
  admin: "Admin Panel",
  general: "General",
};

export default function BugReportsManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const [reportTypeFilter, setReportTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected bug for detail view
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Image lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");

  // Edit state
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editResolutionNotes, setEditResolutionNotes] = useState("");

  // Fetch bug reports
  const {
    data: bugReports = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "bug-reports",
      reportTypeFilter,
      statusFilter,
      platformFilter,
      priorityFilter,
    ],
    queryFn: async () => {
      let query = supabase
        .from("team_bug_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (reportTypeFilter !== "all") {
        query = query.eq("report_type", reportTypeFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (platformFilter !== "all") {
        query = query.eq("platform_section", platformFilter);
      }
      if (priorityFilter !== "all") {
        query = query.eq("priority", priorityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BugReport[];
    },
  });

  // Update bug mutation
  const updateBugMutation = useMutation({
    mutationFn: async (updates: Partial<BugReport> & { id: string }) => {
      const { id, ...data } = updates;

      if (data.status === "resolved" && !data.resolved_at) {
        data.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("team_bug_reports")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
      toast({
        title: "Updated",
        description: "Report updated successfully",
      });
    },
    onError: (error) => {
      console.error("Error updating report:", error);
      toast({
        title: "Error",
        description: "Failed to update report",
        variant: "destructive",
      });
    },
  });

  // Filter bugs by search query
  const filteredBugs = bugReports.filter((bug) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      bug.issue_title.toLowerCase().includes(searchLower) ||
      bug.reporter_name.toLowerCase().includes(searchLower) ||
      bug.feature_category.toLowerCase().includes(searchLower) ||
      bug.issue_description.toLowerCase().includes(searchLower)
    );
  });

  // Open detail dialog
  const openDetailDialog = (bug: BugReport) => {
    setSelectedBug(bug);
    setEditStatus(bug.status);
    setEditPriority(bug.priority);
    setEditAssignedTo(bug.assigned_to || "");
    setEditResolutionNotes(bug.resolution_notes || "");
    setDetailDialogOpen(true);
  };

  // Save changes
  const handleSaveChanges = () => {
    if (!selectedBug) return;

    updateBugMutation.mutate({
      id: selectedBug.id,
      status: editStatus,
      priority: editPriority,
      assigned_to: editAssignedTo || null,
      resolution_notes: editResolutionNotes || null,
    });

    setDetailDialogOpen(false);
  };

  // Open image in lightbox
  const openLightbox = (url: string) => {
    setLightboxImage(url);
    setLightboxOpen(true);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const option = statusOptions.find((o) => o.value === status);
    return (
      <Badge className={`${option?.color || "bg-gray-500"} text-white`}>
        {option?.label || status}
      </Badge>
    );
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    const option = priorityOptions.find((o) => o.value === priority);
    return (
      <Badge variant="outline" className="border-2">
        <span
          className={`mr-1 h-2 w-2 rounded-full ${option?.color || "bg-gray-400"}`}
        />
        {option?.label || priority}
      </Badge>
    );
  };

  // Get report type badge
  const getReportTypeBadge = (reportType: string, size: "sm" | "lg" = "sm") => {
    const option = reportTypeOptions.find((o) => o.value === reportType);
    const Icon = option?.icon || Bug;
    if (size === "lg") {
      return (
        <div
          className={`inline-flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 ${option?.color || "bg-gray-100 text-gray-700"} ${option?.borderColor || "border-gray-300"}`}
        >
          <Icon className="h-5 w-5" />
          <span className="font-medium">{option?.label || reportType}</span>
        </div>
      );
    }
    return (
      <Badge className={`${option?.color || "bg-gray-100 text-gray-700"}`}>
        <Icon className="mr-1 h-3 w-3" />
        {option?.label || reportType}
      </Badge>
    );
  };

  // Get stats
  const stats = {
    total: bugReports.length,
    bugs: bugReports.filter((b) => b.report_type === "bug" || !b.report_type)
      .length,
    features: bugReports.filter((b) => b.report_type === "feature_request")
      .length,
    open: bugReports.filter((b) => b.status === "open").length,
    resolved: bugReports.filter((b) => b.status === "resolved").length,
  };

  return (
    <div
      className="min-h-screen bg-white p-8"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
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
            Team Feedback Management
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            View and manage bugs, feature requests, and suggestions from team
            members
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Bug className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.bugs}</p>
                  <p className="text-xs text-muted-foreground">Bugs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.features}</p>
                  <p className="text-xs text-muted-foreground">
                    Feature Requests
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.open}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.resolved}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg">
                <Filter className="mr-2 h-5 w-5" />
                Filters
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCcw
                  className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select
                value={reportTypeFilter}
                onValueChange={setReportTypeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {reportTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  {platformOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle>Feedback Reports ({filteredBugs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredBugs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No reports found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-4 py-3 text-xs font-semibold uppercase">
                        Type
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase">
                        Title
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase">
                        Reporter
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase">
                        Platform
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBugs.map((bug) => (
                      <tr key={bug.id} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3">
                          {getReportTypeBadge(bug.report_type || "bug")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-[200px]">
                            <p className="truncate font-medium">
                              {bug.issue_title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {featureCategoryLabels[bug.feature_category] ||
                                bug.feature_category}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{bug.reporter_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {roleLabels[bug.reporter_role] ||
                                bug.reporter_role}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="capitalize">
                            {platformLabels[bug.platform_section] ||
                              bug.platform_section}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(bug.status)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {format(new Date(bug.created_at), "MMM dd, yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDetailDialog(bug)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog - Improved UI */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-h-[95vh] max-w-4xl overflow-y-auto p-0">
            {selectedBug && (
              <>
                {/* Header */}
                <div className="sticky top-0 z-10 border-b bg-white p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        {getReportTypeBadge(
                          selectedBug.report_type || "bug",
                          "lg",
                        )}
                        {getStatusBadge(selectedBug.status)}
                        {getPriorityBadge(selectedBug.priority)}
                      </div>
                      <h2 className="text-2xl font-bold">
                        {selectedBug.issue_title}
                      </h2>
                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(
                            new Date(selectedBug.created_at),
                            "PPP 'at' p",
                          )}
                        </span>
                        <span>ID: {selectedBug.id.substring(0, 8)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main Content - Left Side */}
                    <div className="space-y-6 lg:col-span-2">
                      {/* Platform & Feature */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center text-base">
                            <Monitor className="mr-2 h-4 w-4" />
                            Location
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Platform
                              </p>
                              <p className="font-medium">
                                {platformLabels[selectedBug.platform_section] ||
                                  selectedBug.platform_section}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Feature Area
                              </p>
                              <p className="font-medium">
                                {featureCategoryLabels[
                                  selectedBug.feature_category
                                ] || selectedBug.feature_category}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Description */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center text-base">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Description
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {selectedBug.issue_description}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Steps to Reproduce / Additional Details */}
                      {selectedBug.steps_to_reproduce && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">
                              {selectedBug.report_type === "bug"
                                ? "Steps to Reproduce"
                                : "Additional Details"}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                              {selectedBug.steps_to_reproduce}
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Screenshots */}
                      {selectedBug.screenshot_urls &&
                        selectedBug.screenshot_urls.length > 0 && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="flex items-center text-base">
                                <Image className="mr-2 h-4 w-4" />
                                Screenshots (
                                {selectedBug.screenshot_urls.length})
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                                {selectedBug.screenshot_urls.map(
                                  (url, index) => (
                                    <button
                                      key={index}
                                      type="button"
                                      className="group relative cursor-pointer overflow-hidden rounded-lg border bg-muted text-left"
                                      onClick={() => openLightbox(url)}
                                    >
                                      <div className="aspect-video">
                                        <img
                                          src={url}
                                          alt={`Screenshot ${index + 1}`}
                                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                        />
                                      </div>
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                        <div className="rounded-full bg-white p-2">
                                          <Eye className="h-5 w-5 text-gray-800" />
                                        </div>
                                      </div>
                                      <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                                        {index + 1} /{" "}
                                        {selectedBug.screenshot_urls!.length}
                                      </div>
                                    </button>
                                  ),
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                      {/* Device Info */}
                      {(selectedBug.browser_info ||
                        selectedBug.device_info) && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center text-base">
                              <Monitor className="mr-2 h-4 w-4" />
                              Device Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            {selectedBug.browser_info && (
                              <div>
                                <span className="text-muted-foreground">
                                  Browser:{" "}
                                </span>
                                <span className="break-all">
                                  {selectedBug.browser_info}
                                </span>
                              </div>
                            )}
                            {selectedBug.device_info && (
                              <div>
                                <span className="text-muted-foreground">
                                  Device:{" "}
                                </span>
                                <span>{selectedBug.device_info}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Sidebar - Right Side */}
                    <div className="space-y-6">
                      {/* Reporter Info */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center text-base">
                            <User className="mr-2 h-4 w-4" />
                            Reporter
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="font-medium">
                              {selectedBug.reporter_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {roleLabels[selectedBug.reporter_role] ||
                                selectedBug.reporter_role}
                            </p>
                          </div>
                          {selectedBug.reporter_phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <a
                                href={`tel:${selectedBug.reporter_phone}`}
                                className="text-blue-600 hover:underline"
                              >
                                {selectedBug.reporter_phone}
                              </a>
                            </div>
                          )}
                          {selectedBug.reporter_email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <a
                                href={`mailto:${selectedBug.reporter_email}`}
                                className="text-blue-600 hover:underline"
                              >
                                {selectedBug.reporter_email}
                              </a>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Affected User */}
                      {(selectedBug.affected_user_name ||
                        selectedBug.affected_user_phone) && (
                        <Card className="border-yellow-200 bg-yellow-50">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center text-base">
                              <Users className="mr-2 h-4 w-4" />
                              Affected User
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {selectedBug.affected_user_name && (
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Name
                                </p>
                                <p className="font-medium">
                                  {selectedBug.affected_user_name}
                                </p>
                              </div>
                            )}
                            {selectedBug.affected_user_phone && (
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Phone
                                </p>
                                <a
                                  href={`tel:${selectedBug.affected_user_phone}`}
                                  className="font-medium text-blue-600 hover:underline"
                                >
                                  {selectedBug.affected_user_phone}
                                </a>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Management Section */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">
                            Manage Report
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label className="text-sm">Status</Label>
                            <Select
                              value={editStatus}
                              onValueChange={setEditStatus}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-sm">Priority</Label>
                            <Select
                              value={editPriority}
                              onValueChange={setEditPriority}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {priorityOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-sm">Assigned To</Label>
                            <Input
                              value={editAssignedTo}
                              onChange={(e) =>
                                setEditAssignedTo(e.target.value)
                              }
                              placeholder="Enter assignee name"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label className="text-sm">Resolution Notes</Label>
                            <Textarea
                              value={editResolutionNotes}
                              onChange={(e) =>
                                setEditResolutionNotes(e.target.value)
                              }
                              placeholder="Add resolution notes..."
                              className="mt-1"
                              rows={3}
                            />
                          </div>

                          <Button
                            onClick={handleSaveChanges}
                            disabled={updateBugMutation.isPending}
                            className="w-full"
                          >
                            {updateBugMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save Changes"
                            )}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Timestamps */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center text-base">
                            <Clock className="mr-2 h-4 w-4" />
                            Timeline
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Created</p>
                            <p>
                              {format(
                                new Date(selectedBug.created_at),
                                "PPP 'at' p",
                              )}
                            </p>
                          </div>
                          {selectedBug.updated_at &&
                            selectedBug.updated_at !==
                              selectedBug.created_at && (
                              <div>
                                <p className="text-muted-foreground">
                                  Last Updated
                                </p>
                                <p>
                                  {format(
                                    new Date(selectedBug.updated_at),
                                    "PPP 'at' p",
                                  )}
                                </p>
                              </div>
                            )}
                          {selectedBug.resolved_at && (
                            <div>
                              <p className="text-muted-foreground">Resolved</p>
                              <p>
                                {format(
                                  new Date(selectedBug.resolved_at),
                                  "PPP 'at' p",
                                )}
                                {selectedBug.resolved_by && (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    by {selectedBug.resolved_by}
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                          {selectedBug.assigned_to && (
                            <div>
                              <p className="text-muted-foreground">
                                Assigned To
                              </p>
                              <p>{selectedBug.assigned_to}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Image Lightbox */}
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-h-[95vh] max-w-5xl p-0">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 z-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={() => setLightboxOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              <img
                src={lightboxImage}
                alt="Screenshot"
                className="max-h-[90vh] w-full object-contain"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <a
                  href={lightboxImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm text-white hover:bg-black/90"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in new tab
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
