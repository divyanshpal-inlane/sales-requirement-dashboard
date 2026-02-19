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
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">{children}</div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
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

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  onEdit?: () => void;
  editable?: boolean;
}

function InfoRow({
  icon,
  label,
  value,
  onEdit,
  editable = true,
}: InfoRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-medium">{value || "Not set"}</p>
        </div>
      </div>
      {editable && onEdit && (
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export default function Profile2() {
  const { data: learner, isLoading, error, refetch } = useLearner();
  const { mutateAsync: updateLearner, isLoading: isUpdating } =
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
      <div className="container mx-auto p-4">
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
    if (!dateStr) return "Not set";
    try {
      return format(new Date(dateStr), "PPP");
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className="scrollbar-none container mx-auto flex h-full flex-col overflow-y-auto pb-24"
      style={{ scrollbarWidth: "none" }}
    >
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-background px-4 py-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="transform bg-white transition-transform hover:scale-105"
          >
            <ArrowLeft size={24} />
          </Button>

          <h1 className="text-xl font-semibold">My Profile</h1>

          <a
            href={`https://wa.me/+91${CUST_SUPPORT_PHONE}?text=Hello%20I%20need%20support`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <MessageCircle className="h-6 w-6 text-primary" />
          </a>
        </div>
      </div>

      {/* Success Alert */}
      {showSuccessAlert && (
        <Alert className="mx-4 mb-4 bg-green-50 text-green-800">
          <Check className="h-4 w-4" />
          <AlertDescription>Profile updated successfully!</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4 px-4">
        {/* Profile Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
                {learner?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{learner?.name || "User"}</h2>
                <p className="text-muted-foreground">{learner?.phone}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  openEditDialog("basic", {
                    name: learner?.name || "",
                    email: learner?.email || "",
                    dob: learner?.dob || "",
                  })
                }
              >
                <Edit2 className="mr-1 h-4 w-4" />
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow
              icon={<User className="h-5 w-5 text-primary" />}
              label="Full Name"
              value={learner?.name}
              onEdit={() =>
                openEditDialog("basic", {
                  name: learner?.name || "",
                  email: learner?.email || "",
                  dob: learner?.dob || "",
                })
              }
            />
            <Separator />
            <InfoRow
              icon={<Phone className="h-5 w-5 text-primary" />}
              label="Phone Number"
              value={learner?.phone}
              editable={false}
            />
            <Separator />
            <InfoRow
              icon={<Mail className="h-5 w-5 text-primary" />}
              label="Email"
              value={learner?.email}
              onEdit={() =>
                openEditDialog("basic", {
                  name: learner?.name || "",
                  email: learner?.email || "",
                  dob: learner?.dob || "",
                })
              }
            />
            <Separator />
            <InfoRow
              icon={<Calendar className="h-5 w-5 text-primary" />}
              label="Date of Birth"
              value={formatDate(learner?.dob)}
              onEdit={() =>
                openEditDialog("basic", {
                  name: learner?.name || "",
                  email: learner?.email || "",
                  dob: learner?.dob || "",
                })
              }
            />
            <Separator />
            <InfoRow
              icon={<IdCard className="h-5 w-5 text-primary" />}
              label="Aadhar State"
              value={learner?.aadhar_state}
              onEdit={() =>
                openEditDialog("aadhar", {
                  aadhar_state: learner?.aadhar_state || "",
                })
              }
            />
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Location Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow
              icon={<MapPin className="h-5 w-5 text-primary" />}
              label="Pickup Location"
              value={learner?.pick_up_location}
              onEdit={() =>
                openEditDialog("location", {
                  pick_up_location: learner?.pick_up_location || "",
                  area: learner?.area || "",
                  pincode: learner?.pincode || "",
                  city: learner?.city || "",
                })
              }
            />
            <Separator />
            <InfoRow
              icon={<MapPin className="h-5 w-5 text-primary" />}
              label="Area"
              value={learner?.area}
              onEdit={() =>
                openEditDialog("location", {
                  pick_up_location: learner?.pick_up_location || "",
                  area: learner?.area || "",
                  pincode: learner?.pincode || "",
                  city: learner?.city || "",
                })
              }
            />
            <Separator />
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    City & Pincode
                  </p>
                  <p className="font-medium">
                    {learner?.city || "Not set"}
                    {learner?.pincode ? `, ${learner.pincode}` : ""}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  openEditDialog("location", {
                    pick_up_location: learner?.pick_up_location || "",
                    area: learner?.area || "",
                    pincode: learner?.pincode || "",
                    city: learner?.city || "",
                  })
                }
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Learning Preferences */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Learning Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow
              icon={<Calendar className="h-5 w-5 text-primary" />}
              label="Preferred Start Date"
              value={formatDate(learner?.preferred_start_date)}
              onEdit={() =>
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
            <Separator />
            <InfoRow
              icon={<Clock className="h-5 w-5 text-primary" />}
              label="Completion Duration"
              value={
                learner?.preferred_completion_days
                  ? `${learner.preferred_completion_days} days`
                  : undefined
              }
              onEdit={() =>
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
            <Separator />
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Car className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    2-Hour Classes
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        learner?.prefers_two_hour_classes
                          ? "default"
                          : "secondary"
                      }
                    >
                      {learner?.prefers_two_hour_classes ? "Yes" : "No"}
                    </Badge>
                    {learner?.prefers_two_hour_classes &&
                      learner?.two_hour_days && (
                        <span className="text-sm text-muted-foreground">
                          ({learner.two_hour_days})
                        </span>
                      )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
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
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* License Information */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              License Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Has DL */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <div>
                <p className="font-medium">4-Wheeler License (DL)</p>
                <p className="text-sm text-muted-foreground">
                  Do you have a driving license?
                </p>
              </div>
              <Badge variant={learner?.has_a_DL ? "default" : "secondary"}>
                {learner?.has_a_DL === true
                  ? "Yes"
                  : learner?.has_a_DL === false
                    ? "No"
                    : "Not specified"}
              </Badge>
            </div>

            {/* Has 2-Wheeler License */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <div>
                <p className="font-medium">2-Wheeler License</p>
                <p className="text-sm text-muted-foreground">
                  Do you have a 2-wheeler license?
                </p>
              </div>
              <Badge
                variant={
                  learner?.has_two_wheeler_license ? "default" : "secondary"
                }
              >
                {learner?.has_two_wheeler_license ? "Yes" : "No"}
              </Badge>
            </div>

            {/* LL Status */}
            {learner?.has_a_DL === false && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Learner License (LL) Status</h4>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        LL Form Filled
                      </span>
                      <Badge
                        variant={
                          learner?.is_LL_form_filled ? "default" : "secondary"
                        }
                      >
                        {learner?.is_LL_form_filled ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        LL Application ID
                      </span>
                      <span>
                        {learner?.LL_application_id || "Not available"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        LL Test Date
                      </span>
                      <span>{formatDate(learner?.LL_test_date)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">LL Received</span>
                      <Badge
                        variant={learner?.LL_received ? "default" : "secondary"}
                      >
                        {learner?.LL_received ? "Yes" : "No"}
                      </Badge>
                    </div>
                    {learner?.LL_received && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          LL Received Date
                        </span>
                        <span>
                          {formatDate(learner?.LL_received_date?.toString())}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* DL Test Status */}
            {learner?.DL_test_date && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">DL Test Status</h4>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        DL Test Date
                      </span>
                      <span>{formatDate(learner.DL_test_date)}</span>
                    </div>
                    {learner?.DL_result !== null && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          DL Test Result
                        </span>
                        <Badge
                          variant={
                            learner?.DL_result ? "default" : "destructive"
                          }
                        >
                          {learner?.DL_result ? "Passed" : "Failed"}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* View LL Document */}
            {llFileUrl && (
              <>
                <Separator />
                <a
                  href={llFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg bg-primary/5 p-3 transition-colors hover:bg-primary/10"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-medium">
                      View Uploaded LL Document
                    </span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </a>
              </>
            )}
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Button onClick={handleLogout} variant="destructive" className="w-full">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Edit Dialogs */}

      {/* Basic Info Edit */}
      <EditDialog
        open={editingSection === "basic"}
        onClose={closeEditDialog}
        title="Edit Personal Information"
        onSave={handleSave}
        isSaving={isUpdating}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={editFormData.name || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, name: e.target.value })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={editFormData.email || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, email: e.target.value })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              type="date"
              value={editFormData.dob || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, dob: e.target.value })
              }
              className="mt-1"
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
          <Label htmlFor="aadhar_state">Aadhar Registration State</Label>
          <Select
            value={editFormData.aadhar_state || ""}
            onValueChange={(value) =>
              setEditFormData({ ...editFormData, aadhar_state: value })
            }
          >
            <SelectTrigger className="mt-1">
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
            <Label htmlFor="pick_up_location">Pickup Location</Label>
            <Input
              id="pick_up_location"
              value={editFormData.pick_up_location || ""}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  pick_up_location: e.target.value,
                })
              }
              className="mt-1"
              placeholder="Enter your pickup address"
            />
          </div>
          <div>
            <Label htmlFor="area">Area</Label>
            <Input
              id="area"
              value={editFormData.area || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, area: e.target.value })
              }
              className="mt-1"
              placeholder="Enter your area"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={editFormData.city || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, city: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={editFormData.pincode || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, pincode: e.target.value })
                }
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </EditDialog>

      {/* Preferences Edit */}
      <EditDialog
        open={editingSection === "preferences"}
        onClose={closeEditDialog}
        title="Edit Learning Preferences"
        onSave={handleSave}
        isSaving={isUpdating}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="preferred_start_date">Preferred Start Date</Label>
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
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="preferred_completion_days">
              Preferred Completion Duration (days)
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
              className="mt-1"
              placeholder="e.g., 30"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Prefer 2-Hour Classes</Label>
              <p className="text-sm text-muted-foreground">
                Would you like to have 2-hour sessions?
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
              <Label>Preferred Days for 2-Hour Classes</Label>
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
