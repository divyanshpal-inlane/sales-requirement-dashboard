import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Car,
  Check,
  ChevronRight,
  Clock,
  Edit2,
  FileText,
  IdCard,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabaseClient";
import { useLearner, useLearnerUpdate } from "@/queries/learner";

const CUST_SUPPORT_PHONE =
  import.meta.env.VITE_CUST_SUPPORT_PHONE || "9876543210";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Puducherry",
  "Chandigarh",
  "Jammu and Kashmir",
  "Ladakh",
];

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSave: () => void;
  isSaving: boolean;
}

function EditDialog({
  open,
  onClose,
  title,
  children,
  onSave,
  isSaving,
}: EditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="mx-4 max-w-[calc(100vw-32px)] rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2">
          {children}
        </div>
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSaving} className="flex-1">
            {isSaving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  onEdit?: () => void;
  editable?: boolean;
}

function InfoItem({
  icon,
  label,
  value,
  onEdit,
  editable = true,
}: InfoItemProps) {
  return (
    <div
      className={`flex items-center gap-3 py-3 ${editable && onEdit ? "cursor-pointer active:bg-gray-50" : ""}`}
      onClick={editable && onEdit ? onEdit : undefined}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">
          {value || <span className="text-muted-foreground">Not set</span>}
        </p>
      </div>
      {editable && onEdit && (
        <Edit2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </div>
  );
}

export default function Profile2() {
  const { data: learner, isLoading, error, refetch } = useLearner();
  const { mutateAsync: updateLearner, isPending: isUpdating } =
    useLearnerUpdate();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [llFileUrl, setLlFileUrl] = useState<string | null>(null);

  // Edit dialog states
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});

  // Fetch LL file URL
  useEffect(() => {
    const fetchLLFile = async () => {
      if (!learner?.phone) return;

      try {
        const { data: files } = await supabase.storage
          .from("LL")
          .list(learner.phone);

        if (files && files.length > 0) {
          const { data } = supabase.storage
            .from("LL")
            .getPublicUrl(`${learner.phone}/${files[0].name}`);
          setLlFileUrl(data.publicUrl);
        }
      } catch (err) {
        console.error("Error fetching LL file:", err);
      }
    };

    fetchLLFile();
  }, [learner?.phone]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>
            Error loading profile: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const openEditDialog = (
    section: string,
    initialData: Record<string, any>,
  ) => {
    setEditingSection(section);
    setEditFormData(initialData);
  };

  const closeEditDialog = () => {
    setEditingSection(null);
    setEditFormData({});
  };

  const handleSave = async () => {
    try {
      await updateLearner(editFormData);
      await refetch();
      closeEditDialog();
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed:", err);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), "dd MMM yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <h1 className="text-base font-semibold">My Profile</h1>

          <a
            href={`https://wa.me/+91${CUST_SUPPORT_PHONE}?text=Hello%20I%20need%20support`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center"
          >
            <MessageCircle className="h-5 w-5 text-primary" />
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Success Alert */}
        {showSuccessAlert && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Profile updated successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Profile Header */}
        <Card className="mb-4 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
                {learner?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold">
                  {learner?.name || "User"}
                </h2>
                <p className="text-sm text-muted-foreground">{learner?.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="mb-4 overflow-hidden">
          <CardHeader className="border-b bg-gray-50/50 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            <div className="px-4">
              <InfoItem
                icon={<User className="h-4 w-4 text-primary" />}
                label="Full Name"
                value={learner?.name}
                editable={false}
              />
            </div>
            <div className="px-4">
              <InfoItem
                icon={<Phone className="h-4 w-4 text-primary" />}
                label="Phone Number"
                value={learner?.phone}
                editable={false}
              />
            </div>
            <div className="px-4">
              <InfoItem
                icon={<Mail className="h-4 w-4 text-primary" />}
                label="Email"
                value={learner?.email}
                editable={false}
              />
            </div>
            <div className="px-4">
              <InfoItem
                icon={<Calendar className="h-4 w-4 text-primary" />}
                label="Date of Birth"
                value={formatDate(learner?.dob)}
                editable={false}
              />
            </div>
            <div className="px-4">
              <InfoItem
                icon={<IdCard className="h-4 w-4 text-primary" />}
                label="Aadhar State"
                value={learner?.aadhar_state}
                editable={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card className="mb-4 overflow-hidden">
          <CardHeader className="border-b bg-gray-50/50 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" />
              Location Details
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            <div className="px-4">
              <InfoItem
                icon={<MapPin className="h-4 w-4 text-primary" />}
                label="Pickup Location"
                value={learner?.pick_up_location}
                editable={!!learner?.preferred_start_date}
                onEdit={
                  learner?.preferred_start_date
                    ? () =>
                        openEditDialog("location", {
                          pick_up_location: learner?.pick_up_location || "",
                          area: learner?.area || "",
                          pincode: learner?.pincode || "",
                          city: learner?.city || "",
                        })
                    : undefined
                }
              />
            </div>
            <div className="px-4">
              <InfoItem
                icon={<MapPin className="h-4 w-4 text-primary" />}
                label="Area"
                value={learner?.area}
                editable={!!learner?.preferred_start_date}
                onEdit={
                  learner?.preferred_start_date
                    ? () =>
                        openEditDialog("location", {
                          pick_up_location: learner?.pick_up_location || "",
                          area: learner?.area || "",
                          pincode: learner?.pincode || "",
                          city: learner?.city || "",
                        })
                    : undefined
                }
              />
            </div>
            <div className="px-4">
              <InfoItem
                icon={<MapPin className="h-4 w-4 text-primary" />}
                label="City & Pincode"
                value={
                  learner?.city || learner?.pincode
                    ? `${learner?.city || ""}${learner?.city && learner?.pincode ? ", " : ""}${learner?.pincode || ""}`
                    : null
                }
                editable={!!learner?.preferred_start_date}
                onEdit={
                  learner?.preferred_start_date
                    ? () =>
                        openEditDialog("location", {
                          pick_up_location: learner?.pick_up_location || "",
                          area: learner?.area || "",
                          pincode: learner?.pincode || "",
                          city: learner?.city || "",
                        })
                    : undefined
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Learning Preferences */}
        <Card className="mb-4 overflow-hidden">
          <CardHeader className="border-b bg-gray-50/50 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-primary" />
              Learning Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            <div className="px-4">
              <InfoItem
                icon={<Calendar className="h-4 w-4 text-primary" />}
                label="Preferred Start Date"
                value={formatDate(learner?.preferred_start_date)}
                editable={!!learner?.preferred_start_date}
                onEdit={
                  learner?.preferred_start_date
                    ? () =>
                        openEditDialog("preferences", {
                          preferred_start_date: learner?.preferred_start_date || "",
                          preferred_completion_days:
                            learner?.preferred_completion_days || "",
                          prefers_two_hour_classes:
                            learner?.prefers_two_hour_classes || false,
                          two_hour_days: learner?.two_hour_days || "",
                        })
                    : undefined
                }
              />
            </div>
            <div className="px-4">
              <InfoItem
                icon={<Clock className="h-4 w-4 text-primary" />}
                label="Completion Duration"
                value={
                  learner?.preferred_completion_days
                    ? `${learner.preferred_completion_days} days`
                    : null
                }
                editable={!!learner?.preferred_start_date}
                onEdit={
                  learner?.preferred_start_date
                    ? () =>
                        openEditDialog("preferences", {
                          preferred_start_date: learner?.preferred_start_date || "",
                          preferred_completion_days:
                            learner?.preferred_completion_days || "",
                          prefers_two_hour_classes:
                            learner?.prefers_two_hour_classes || false,
                          two_hour_days: learner?.two_hour_days || "",
                        })
                    : undefined
                }
              />
            </div>
            <div className="px-4">
              <div className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Car className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">2-Hour Classes</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant={
                        learner?.prefers_two_hour_classes ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {learner?.prefers_two_hour_classes ? "Yes" : "No"}
                    </Badge>
                    {learner?.prefers_two_hour_classes && learner?.two_hour_days && (
                      <span className="text-xs text-muted-foreground">
                        ({learner.two_hour_days})
                      </span>
                    )}
                  </div>
                </div>
                {learner?.preferred_start_date && (
                  <Edit2
                    className="h-4 w-4 shrink-0 cursor-pointer text-muted-foreground"
                    onClick={() =>
                      openEditDialog("preferences", {
                        preferred_start_date: learner?.preferred_start_date || "",
                        preferred_completion_days:
                          learner?.preferred_completion_days || "",
                        prefers_two_hour_classes:
                          learner?.prefers_two_hour_classes || false,
                        two_hour_days: learner?.two_hour_days || "",
                      })
                    }
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* License Information */}
        <Card className="mb-4 overflow-hidden">
          <CardHeader className="border-b bg-gray-50/50 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-primary" />
              License Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {/* Has DL */}
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">4-Wheeler License (DL)</p>
                <p className="text-xs text-muted-foreground">
                  Do you have a driving license?
                </p>
              </div>
              <Badge
                variant={learner?.has_a_DL ? "default" : "secondary"}
                className="ml-2 shrink-0"
              >
                {learner?.has_a_DL === true
                  ? "Yes"
                  : learner?.has_a_DL === false
                    ? "No"
                    : "N/A"}
              </Badge>
            </div>

            {/* Has 2-Wheeler License */}
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">2-Wheeler License</p>
                <p className="text-xs text-muted-foreground">
                  Do you have a 2-wheeler license?
                </p>
              </div>
              <Badge
                variant={learner?.has_two_wheeler_license ? "default" : "secondary"}
                className="ml-2 shrink-0"
              >
                {learner?.has_two_wheeler_license ? "Yes" : "No"}
              </Badge>
            </div>

            {/* LL Status */}
            {learner?.has_a_DL === false && (
              <div className="rounded-lg border p-3">
                <h4 className="mb-2 text-sm font-medium">
                  Learner License (LL) Status
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">LL Form Filled</span>
                    <Badge
                      variant={learner?.is_LL_form_filled ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {learner?.is_LL_form_filled ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Application ID</span>
                    <span className="max-w-[120px] truncate text-xs">
                      {learner?.LL_application_id || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">LL Test Date</span>
                    <span className="text-xs">
                      {formatDate(learner?.LL_test_date) || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">LL Received</span>
                    <Badge
                      variant={learner?.LL_received ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {learner?.LL_received ? "Yes" : "No"}
                    </Badge>
                  </div>
                  {learner?.LL_received && learner?.LL_received_date && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Received Date</span>
                      <span className="text-xs">
                        {formatDate(learner?.LL_received_date?.toString())}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DL Test Status */}
            {learner?.DL_test_date && (
              <div className="rounded-lg border p-3">
                <h4 className="mb-2 text-sm font-medium">DL Test Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">DL Test Date</span>
                    <span className="text-xs">
                      {formatDate(learner.DL_test_date)}
                    </span>
                  </div>
                  {learner?.DL_result !== null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Result</span>
                      <Badge
                        variant={learner?.DL_result ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {learner?.DL_result ? "Passed" : "Failed"}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* View LL Document */}
            {llFileUrl && (
              <a
                href={llFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3 transition-colors hover:bg-primary/10"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">View LL Document</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </a>
            )}
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Edit Dialogs */}

      {/* Basic Info Edit */}
      <EditDialog
        open={editingSection === "basic"}
        onClose={closeEditDialog}
        title="Edit Personal Info"
        onSave={handleSave}
        isSaving={isUpdating}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm">
              Full Name
            </Label>
            <Input
              id="name"
              value={editFormData.name || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, name: e.target.value })
              }
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-sm">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={editFormData.email || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, email: e.target.value })
              }
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="dob" className="text-sm">
              Date of Birth
            </Label>
            <Input
              id="dob"
              type="date"
              value={editFormData.dob || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, dob: e.target.value })
              }
              className="mt-1.5"
            />
          </div>
        </div>
      </EditDialog>

      {/* Aadhar State Edit */}
      <EditDialog
        open={editingSection === "aadhar"}
        onClose={closeEditDialog}
        title="Edit Aadhar State"
        onSave={handleSave}
        isSaving={isUpdating}
      >
        <div>
          <Label htmlFor="aadhar_state" className="text-sm">
            Aadhar Registration State
          </Label>
          <Select
            value={editFormData.aadhar_state || ""}
            onValueChange={(value) =>
              setEditFormData({ ...editFormData, aadhar_state: value })
            }
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select your state" />
            </SelectTrigger>
            <SelectContent>
              {INDIAN_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditDialog>

      {/* Location Edit */}
      <EditDialog
        open={editingSection === "location"}
        onClose={closeEditDialog}
        title="Edit Location"
        onSave={handleSave}
        isSaving={isUpdating}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="pick_up_location" className="text-sm">
              Pickup Location
            </Label>
            <Input
              id="pick_up_location"
              value={editFormData.pick_up_location || ""}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  pick_up_location: e.target.value,
                })
              }
              className="mt-1.5"
              placeholder="Enter your pickup address"
            />
          </div>
          <div>
            <Label htmlFor="area" className="text-sm">
              Area
            </Label>
            <Input
              id="area"
              value={editFormData.area || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, area: e.target.value })
              }
              className="mt-1.5"
              placeholder="Enter your area"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="city" className="text-sm">
                City
              </Label>
              <Input
                id="city"
                value={editFormData.city || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, city: e.target.value })
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="pincode" className="text-sm">
                Pincode
              </Label>
              <Input
                id="pincode"
                value={editFormData.pincode || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, pincode: e.target.value })
                }
                className="mt-1.5"
              />
            </div>
          </div>
        </div>
      </EditDialog>

      {/* Preferences Edit */}
      <EditDialog
        open={editingSection === "preferences"}
        onClose={closeEditDialog}
        title="Edit Preferences"
        onSave={handleSave}
        isSaving={isUpdating}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="preferred_start_date" className="text-sm">
              Preferred Start Date
            </Label>
            <Input
              id="preferred_start_date"
              type="date"
              value={editFormData.preferred_start_date || ""}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  preferred_start_date: e.target.value,
                })
              }
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="preferred_completion_days" className="text-sm">
              Completion Duration (days)
            </Label>
            <Input
              id="preferred_completion_days"
              type="number"
              value={editFormData.preferred_completion_days || ""}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  preferred_completion_days: parseInt(e.target.value) || null,
                })
              }
              className="mt-1.5"
              placeholder="e.g., 30"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">2-Hour Classes</p>
              <p className="text-xs text-muted-foreground">
                Prefer 2-hour sessions?
              </p>
            </div>
            <Switch
              checked={editFormData.prefers_two_hour_classes || false}
              onCheckedChange={(checked) =>
                setEditFormData({
                  ...editFormData,
                  prefers_two_hour_classes: checked,
                })
              }
            />
          </div>
          {editFormData.prefers_two_hour_classes && (
            <div>
              <Label className="text-sm">Preferred Days</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const selectedDays = (editFormData.two_hour_days || "")
                    .split(",")
                    .filter(Boolean);
                  const isSelected = selectedDays.includes(day);
                  return (
                    <Button
                      key={day}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => {
                        const newDays = isSelected
                          ? selectedDays.filter((d) => d !== day)
                          : [...selectedDays, day];
                        setEditFormData({
                          ...editFormData,
                          two_hour_days: newDays.join(","),
                        });
                      }}
                    >
                      {day}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </EditDialog>
    </div>
  );
}
