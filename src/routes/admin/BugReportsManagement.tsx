import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  Bug,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Lightbulb,
  Loader2,
  MessageSquarePlus,
  RefreshCcw,
  Search,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
  { value: "bug", label: "Bug", icon: Bug, color: "bg-red-100 text-red-700" },
  { value: "feature_request", label: "Feature Request", icon: Sparkles, color: "bg-purple-100 text-purple-700" },
  { value: "suggestion", label: "Suggestion", icon: Lightbulb, color: "bg-yellow-100 text-yellow-700" },
  { value: "improvement", label: "Improvement", icon: Wrench, color: "bg-blue-100 text-blue-700" },
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
  other: "Other",
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
    queryKey: ["bug-reports", reportTypeFilter, statusFilter, platformFilter, priorityFilter],
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

      // If status is being set to resolved, add resolved_at timestamp
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
      <Badge variant="outline" className={`border-2`}>
        <span
          className={`mr-1 h-2 w-2 rounded-full ${option?.color || "bg-gray-400"}`}
        />
        {option?.label || priority}
      </Badge>
    );
  };

  // Get report type badge
  const getReportTypeBadge = (reportType: string) => {
    const option = reportTypeOptions.find((o) => o.value === reportType);
    const Icon = option?.icon || Bug;
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
    bugs: bugReports.filter((b) => b.report_type === "bug" || !b.report_type).length,
    features: bugReports.filter((b) => b.report_type === "feature_request").length,
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
      <div className="container mx-auto">
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
            View and manage bugs, feature requests, and suggestions from team members
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageSquarePlus className="h-5 w-5 text-gray-500" />
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
                  <p className="text-xs text-muted-foreground">Feature Requests</p>
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
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Report Type Filter */}
              <Select value={reportTypeFilter} onValueChange={setReportTypeFilter}>
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

              {/* Status Filter */}
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

              {/* Platform Filter */}
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

              {/* Priority Filter */}
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
            <CardTitle>
              Feedback Reports ({filteredBugs.length})
            </CardTitle>
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
                      <tr
                        key={bug.id}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="px-4 py-3">
                          {getReportTypeBadge(bug.report_type || "bug")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-[200px]">
                            <p className="truncate font-medium">
                              {bug.issue_title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {bug.feature_category}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{bug.reporter_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {roleLabels[bug.reporter_role] || bug.reporter_role}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="capitalize">
                            {bug.platform_section}
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

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between pr-8">
                <span>Report Details</span>
                {selectedBug && getReportTypeBadge(selectedBug.report_type || "bug")}
              </DialogTitle>
            </DialogHeader>

            {selectedBug && (
              <div className="space-y-6">
                {/* Issue Info */}
                <div>
                  <h3 className="mb-2 text-lg font-semibold">
                    {selectedBug.issue_title}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="capitalize">
                      {selectedBug.platform_section}
                    </Badge>
                    <Badge variant="secondary">
                      {selectedBug.feature_category}
                    </Badge>
                    {getStatusBadge(selectedBug.status)}
                    {getPriorityBadge(selectedBug.priority)}
                  </div>
                </div>

                {/* Reporter Info */}
                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="mb-2 font-medium">Reporter Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>{" "}
                      {selectedBug.reporter_name}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Role:</span>{" "}
                      {roleLabels[selectedBug.reporter_role] ||
                        selectedBug.reporter_role}
                    </div>
                    {selectedBug.reporter_phone && (
                      <div>
                        <span className="text-muted-foreground">Phone:</span>{" "}
                        {selectedBug.reporter_phone}
                      </div>
                    )}
                    {selectedBug.reporter_email && (
                      <div>
                        <span className="text-muted-foreground">Email:</span>{" "}
                        {selectedBug.reporter_email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Issue Description */}
                <div>
                  <h4 className="mb-2 font-medium">Description</h4>
                  <p className="whitespace-pre-wrap text-sm">
                    {selectedBug.issue_description}
                  </p>
                </div>

                {/* Steps to Reproduce */}
                {selectedBug.steps_to_reproduce && (
                  <div>
                    <h4 className="mb-2 font-medium">Steps to Reproduce</h4>
                    <p className="whitespace-pre-wrap text-sm">
                      {selectedBug.steps_to_reproduce}
                    </p>
                  </div>
                )}

                {/* Affected User */}
                {(selectedBug.affected_user_name ||
                  selectedBug.affected_user_phone) && (
                  <div className="rounded-lg bg-yellow-50 p-4">
                    <h4 className="mb-2 font-medium">Affected User</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {selectedBug.affected_user_name && (
                        <div>
                          <span className="text-muted-foreground">Name:</span>{" "}
                          {selectedBug.affected_user_name}
                        </div>
                      )}
                      {selectedBug.affected_user_phone && (
                        <div>
                          <span className="text-muted-foreground">Phone:</span>{" "}
                          {selectedBug.affected_user_phone}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Device Info */}
                {(selectedBug.browser_info || selectedBug.device_info) && (
                  <div>
                    <h4 className="mb-2 font-medium">Device Information</h4>
                    <div className="text-sm text-muted-foreground">
                      {selectedBug.browser_info && (
                        <p>Browser: {selectedBug.browser_info}</p>
                      )}
                      {selectedBug.device_info && (
                        <p>Device: {selectedBug.device_info}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Screenshots */}
                {selectedBug.screenshot_urls &&
                  selectedBug.screenshot_urls.length > 0 && (
                    <div>
                      <h4 className="mb-2 font-medium">
                        Screenshots ({selectedBug.screenshot_urls.length})
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedBug.screenshot_urls.map((url, index) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative aspect-video overflow-hidden rounded-lg border bg-muted"
                          >
                            <img
                              src={url}
                              alt={`Screenshot ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                              <ExternalLink className="h-6 w-6 text-white" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Management Section */}
                <div className="border-t pt-4">
                  <h4 className="mb-4 font-medium">Manage Report</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Status</Label>
                      <Select value={editStatus} onValueChange={setEditStatus}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select
                        value={editPriority}
                        onValueChange={setEditPriority}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorityOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Assigned To</Label>
                      <Input
                        value={editAssignedTo}
                        onChange={(e) => setEditAssignedTo(e.target.value)}
                        placeholder="Enter assignee name"
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Resolution Notes</Label>
                      <Textarea
                        value={editResolutionNotes}
                        onChange={(e) => setEditResolutionNotes(e.target.value)}
                        placeholder="Add resolution notes..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setDetailDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveChanges}
                      disabled={updateBugMutation.isPending}
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
                  </div>
                </div>

                {/* Metadata */}
                <div className="border-t pt-4 text-xs text-muted-foreground">
                  <p>Created: {format(new Date(selectedBug.created_at), "PPpp")}</p>
                  {selectedBug.resolved_at && (
                    <p>
                      Resolved: {format(new Date(selectedBug.resolved_at), "PPpp")}
                      {selectedBug.resolved_by && ` by ${selectedBug.resolved_by}`}
                    </p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
