import { useMutation } from "@tanstack/react-query";
import {
  Bug,
  Camera,
  Check,
  Lightbulb,
  Loader2,
  Send,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { supabase } from "@/lib/supabaseClient";

// Report types
const REPORT_TYPES = [
  {
    value: "bug",
    label: "Bug / Issue",
    icon: Bug,
    color: "bg-red-100 text-red-700",
    description: "Something is broken or not working correctly",
  },
  {
    value: "feature_request",
    label: "Feature Request",
    icon: Sparkles,
    color: "bg-purple-100 text-purple-700",
    description: "Request a new feature or functionality",
  },
  {
    value: "suggestion",
    label: "Suggestion",
    icon: Lightbulb,
    color: "bg-yellow-100 text-yellow-700",
    description: "Share an idea to improve the platform",
  },
  {
    value: "improvement",
    label: "Improvement",
    icon: Wrench,
    color: "bg-blue-100 text-blue-700",
    description: "Suggest an enhancement to existing features",
  },
];

// Team roles
const TEAM_ROLES = [
  { value: "sales", label: "Sales" },
  { value: "ops", label: "Operations" },
  { value: "logistics", label: "Logistics" },
  { value: "onboarding", label: "Onboarding" },
  { value: "customer_handling", label: "Customer Handling" },
  { value: "tech", label: "Tech Team" },
  { value: "management", label: "Management" },
  { value: "other", label: "Other" },
];

// Platform sections
const PLATFORM_SECTIONS = [
  { value: "learner", label: "Learner App" },
  { value: "instructor", label: "Instructor App" },
  { value: "admin", label: "Admin Panel" },
  { value: "general", label: "General / Not Sure" },
];

// Feature categories by platform
const FEATURE_CATEGORIES: Record<string, { value: string; label: string }[]> = {
  learner: [
    { value: "auth_onboarding", label: "Login & Onboarding" },
    { value: "home_dashboard", label: "Home Dashboard & Progress" },
    { value: "schedule_calendar", label: "Schedule & Calendar" },
    { value: "lesson_content", label: "Lesson Content & Execution" },
    { value: "rescheduling", label: "Rescheduling" },
    { value: "booking_setup", label: "Booking & Lesson Setup" },
    { value: "payment", label: "Payment & Enrollment" },
    { value: "profile", label: "Profile Management" },
    { value: "prep_games", label: "Learning Preparation Games" },
    { value: "help_support", label: "Help & Support" },
    { value: "other", label: "Other" },
  ],
  instructor: [
    { value: "auth_login", label: "Login & Authentication" },
    { value: "schedule_calendar", label: "Schedule & Calendar" },
    { value: "lesson_otp", label: "Lesson Start/End (OTP)" },
    { value: "google_calendar", label: "Google Calendar Integration" },
    { value: "learner_info", label: "Learner Information" },
    { value: "profile", label: "Profile Management" },
    { value: "other", label: "Other" },
  ],
  admin: [
    { value: "dashboard_access", label: "Dashboard & Access Control" },
    { value: "learner_management", label: "Learner Management & Search" },
    { value: "enrollment", label: "Course & Enrollment" },
    { value: "schedule_management", label: "Schedule Management" },
    { value: "instructor_management", label: "Instructor Management" },
    { value: "ll_dl_management", label: "LL/DL License Management" },
    { value: "customer_info", label: "Customer Information" },
    { value: "issue_fixer", label: "Issue Resolution Tools" },
    { value: "migration", label: "Data Migration" },
    { value: "notifications", label: "Notifications & Communication" },
    { value: "admin_users", label: "Admin User Management" },
    { value: "settings", label: "Settings & Configuration" },
    { value: "payment_gateway", label: "Payment Gateway" },
    { value: "other", label: "Other" },
  ],
  general: [
    { value: "performance", label: "Performance Issues" },
    { value: "ui_display", label: "UI/Display Issues" },
    { value: "data_sync", label: "Data Sync Issues" },
    { value: "feature_request", label: "Feature Request" },
    { value: "other", label: "Other" },
  ],
};

// Priority levels
const PRIORITY_LEVELS = [
  {
    value: "low",
    label: "Low - Minor inconvenience",
    color: "bg-gray-100 text-gray-700",
  },
  {
    value: "medium",
    label: "Medium - Affects work but has workaround",
    color: "bg-yellow-100 text-yellow-700",
  },
  {
    value: "high",
    label: "High - Blocking work",
    color: "bg-orange-100 text-orange-700",
  },
  {
    value: "critical",
    label: "Critical - Urgent, affects customers",
    color: "bg-red-100 text-red-700",
  },
];

interface FormData {
  report_type: string;
  reporter_name: string;
  reporter_role: string;
  reporter_phone: string;
  reporter_email: string;
  platform_section: string;
  feature_category: string;
  issue_title: string;
  issue_description: string;
  steps_to_reproduce: string;
  affected_user_phone: string;
  affected_user_name: string;
  priority: string;
  browser_info: string;
  device_info: string;
}

const initialFormData: FormData = {
  report_type: "bug",
  reporter_name: "",
  reporter_role: "",
  reporter_phone: "",
  reporter_email: "",
  platform_section: "",
  feature_category: "",
  issue_title: "",
  issue_description: "",
  steps_to_reproduce: "",
  affected_user_phone: "",
  affected_user_name: "",
  priority: "medium",
  browser_info: "",
  device_info: "",
};

export default function ReportIssuePage() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get browser and device info on load
  useState(() => {
    const browserInfo = navigator.userAgent;
    const deviceInfo = `${navigator.platform} - ${window.screen.width}x${window.screen.height}`;
    setFormData((prev) => ({
      ...prev,
      browser_info: browserInfo.substring(0, 255),
      device_info: deviceInfo,
    }));
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Reset feature category when platform changes
    if (field === "platform_section") {
      setFormData((prev) => ({ ...prev, feature_category: "" }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + screenshots.length > 5) {
      alert("Maximum 5 screenshots allowed");
      return;
    }

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    setScreenshots((prev) => [...prev, ...validFiles]);

    // Create previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setScreenshotPreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
    setScreenshotPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Upload screenshots first
      const screenshotUrls: string[] = [];

      for (const file of screenshots) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("bug-screenshots")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Screenshot upload error:", uploadError);
          // Continue without failing - screenshots are optional
        } else if (uploadData) {
          const { data: urlData } = supabase.storage
            .from("bug-screenshots")
            .getPublicUrl(uploadData.path);
          screenshotUrls.push(urlData.publicUrl);
        }
      }

      // Insert report
      const { data: insertData, error: insertError } = await supabase
        .from("team_bug_reports")
        .insert({
          report_type: data.report_type,
          reporter_name: data.reporter_name,
          reporter_role: data.reporter_role,
          reporter_phone: data.reporter_phone || null,
          reporter_email: data.reporter_email || null,
          platform_section: data.platform_section,
          feature_category: data.feature_category,
          issue_title: data.issue_title,
          issue_description: data.issue_description,
          steps_to_reproduce: data.steps_to_reproduce || null,
          affected_user_phone: data.affected_user_phone || null,
          affected_user_name: data.affected_user_name || null,
          priority: data.priority,
          browser_info: data.browser_info || null,
          device_info: data.device_info || null,
          screenshot_urls: screenshotUrls.length > 0 ? screenshotUrls : null,
          status: "open",
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return insertData;
    },
    onSuccess: (data) => {
      setSubmittedId(data.id);
      setShowSuccess(true);
      setFormData(initialFormData);
      setScreenshots([]);
      setScreenshotPreviews([]);
    },
    onError: (error: Error) => {
      alert(`Error submitting report: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.reporter_name.trim()) {
      alert("Please enter your name");
      return;
    }
    if (!formData.reporter_role) {
      alert("Please select your role");
      return;
    }
    if (!formData.platform_section) {
      alert("Please select the platform section");
      return;
    }
    if (!formData.feature_category) {
      alert("Please select the feature category");
      return;
    }
    if (!formData.issue_title.trim()) {
      alert("Please enter an issue title");
      return;
    }
    if (!formData.issue_description.trim()) {
      alert("Please describe the issue");
      return;
    }

    submitMutation.mutate(formData);
  };

  if (showSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-green-800">
              Submitted Successfully!
            </h2>
            <p className="mb-4 text-gray-600">
              Your feedback has been submitted. The tech team will review it.
            </p>
            {submittedId && (
              <p className="mb-6 text-sm text-gray-500">
                Reference ID:{" "}
                <span className="font-mono">{submittedId.substring(0, 8)}</span>
              </p>
            )}
            <Button onClick={() => setShowSuccess(false)} className="w-full">
              Submit Another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableCategories = formData.platform_section
    ? FEATURE_CATEGORIES[formData.platform_section]
    : [];

  // Get current report type info for dynamic UI
  const currentReportType = REPORT_TYPES.find(
    (t) => t.value === formData.report_type,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto max-w-2xl px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">
            Team Feedback Portal
          </h1>
          <p className="mt-2 text-gray-600">
            Report bugs, suggest features, or share improvement ideas
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Report Type Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                What would you like to submit?
              </CardTitle>
              <CardDescription>
                Select the type of feedback you want to share
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {REPORT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.report_type === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => updateField("report_type", type.value)}
                      className={`flex flex-col items-center rounded-lg border-2 p-4 transition-all ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className={`mb-2 rounded-full p-2 ${type.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span
                        className={`text-sm font-medium ${isSelected ? "text-indigo-700" : "text-gray-700"}`}
                      >
                        {type.label}
                      </span>
                      <span className="mt-1 text-center text-xs text-gray-500">
                        {type.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          {/* Your Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Your Information</CardTitle>
              <CardDescription>
                Let us know who is reporting this issue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">
                    Your Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={formData.reporter_name}
                    onChange={(e) =>
                      updateField("reporter_name", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="role">
                    Your Role <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.reporter_role}
                    onValueChange={(v) => updateField("reporter_role", v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    placeholder="Your phone number"
                    value={formData.reporter_phone}
                    onChange={(e) =>
                      updateField("reporter_phone", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Your email"
                    value={formData.reporter_email}
                    onChange={(e) =>
                      updateField("reporter_email", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                {formData.report_type === "bug"
                  ? "Issue Details"
                  : formData.report_type === "feature_request"
                    ? "Feature Request Details"
                    : formData.report_type === "suggestion"
                      ? "Suggestion Details"
                      : "Improvement Details"}
              </CardTitle>
              <CardDescription>
                {formData.report_type === "bug"
                  ? "Describe the issue you are facing"
                  : formData.report_type === "feature_request"
                    ? "Describe the feature you'd like to see"
                    : formData.report_type === "suggestion"
                      ? "Share your suggestion with us"
                      : "Describe the improvement you'd like to see"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>
                    Platform Section <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.platform_section}
                    onValueChange={(v) => updateField("platform_section", v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Where is the issue?" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORM_SECTIONS.map((section) => (
                        <SelectItem key={section.value} value={section.value}>
                          {section.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>
                    Feature Area <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.feature_category}
                    onValueChange={(v) => updateField("feature_category", v)}
                    disabled={!formData.platform_section}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue
                        placeholder={
                          formData.platform_section
                            ? "Select feature"
                            : "Select platform first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder={
                    formData.report_type === "bug"
                      ? "Brief summary of the issue"
                      : formData.report_type === "feature_request"
                        ? "What feature would you like?"
                        : formData.report_type === "suggestion"
                          ? "Brief summary of your suggestion"
                          : "What would you like to improve?"
                  }
                  value={formData.issue_title}
                  onChange={(e) => updateField("issue_title", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder={
                    formData.report_type === "bug"
                      ? "Describe the issue in detail. What happened? What did you expect to happen?"
                      : formData.report_type === "feature_request"
                        ? "Describe the feature in detail. What problem would it solve? How would it work?"
                        : formData.report_type === "suggestion"
                          ? "Share your suggestion in detail. Why do you think this would help?"
                          : "Describe the improvement. How would it make things better?"
                  }
                  value={formData.issue_description}
                  onChange={(e) =>
                    updateField("issue_description", e.target.value)
                  }
                  className="mt-1 min-h-[120px]"
                />
              </div>

              <div>
                <Label htmlFor="steps">
                  {formData.report_type === "bug"
                    ? "Steps to Reproduce (Optional)"
                    : "Additional Details (Optional)"}
                </Label>
                <Textarea
                  id="steps"
                  placeholder={
                    formData.report_type === "bug"
                      ? "1. Go to...&#10;2. Click on...&#10;3. See error..."
                      : "Any additional context or details..."
                  }
                  value={formData.steps_to_reproduce}
                  onChange={(e) =>
                    updateField("steps_to_reproduce", e.target.value)
                  }
                  className="mt-1 min-h-[80px]"
                />
              </div>

              <div>
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => updateField("priority", v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <span
                          className={`rounded px-2 py-0.5 text-sm ${level.color}`}
                        >
                          {level.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Affected User (Optional) */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                Affected User (Optional)
              </CardTitle>
              <CardDescription>
                If this issue is related to a specific user
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="affected_phone">User Phone</Label>
                  <Input
                    id="affected_phone"
                    placeholder="Learner/Instructor phone"
                    value={formData.affected_user_phone}
                    onChange={(e) =>
                      updateField("affected_user_phone", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="affected_name">User Name</Label>
                  <Input
                    id="affected_name"
                    placeholder="Learner/Instructor name"
                    value={formData.affected_user_name}
                    onChange={(e) =>
                      updateField("affected_user_name", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Screenshots */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Screenshots (Optional)</CardTitle>
              <CardDescription>
                Add up to 5 screenshots to help explain the issue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                multiple
                className="hidden"
              />

              {screenshotPreviews.length > 0 && (
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {screenshotPreviews.map((preview, index) => (
                    <div key={index} className="group relative">
                      <img
                        src={preview}
                        alt={`Screenshot ${index + 1}`}
                        className="h-24 w-full rounded-lg border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeScreenshot(index)}
                        className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {screenshots.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Add Screenshot ({screenshots.length}/5)
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                {formData.report_type === "bug"
                  ? "Submit Bug Report"
                  : formData.report_type === "feature_request"
                    ? "Submit Feature Request"
                    : formData.report_type === "suggestion"
                      ? "Submit Suggestion"
                      : "Submit Improvement"}
              </>
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Thank you for helping us improve the platform!
        </p>
      </div>
    </div>
  );
}
