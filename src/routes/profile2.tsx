import {
  ArrowLeft,
  Check,
  LogOut,
  UserPen,
  X,
  MessageCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { useLearner, useLearnerUpdate } from "@/queries/learner";

export default function Profile2() {
  const { data: learner, isLoading, error } = useLearner();
  const { mutate: updateLearner, isLoading: isUpdating } = useLearnerUpdate();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    birthday: "",
    email: "",
  });

  useEffect(() => {
    if (learner) {
      setFormData({
        name: learner.name || "",
        birthday: learner.dob || "",
        email: learner.email || "",
      });
    }
  }, [learner]);

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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      await updateLearner({
        name: formData.name,
        dob: formData.birthday,
        email: formData.email,
      });
      setIsEditing(false);
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div
      className="scrollbar-none container mx-auto flex h-full flex-col overflow-y-auto p-4"
      style={{ scrollbarWidth: "none" }}
    >
      {/* Top Bar */}
      <div className="mb-6 flex items-center justify-between">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-2 transform bg-white transition-transform hover:scale-105"
        >
          <ArrowLeft size={24} />
        </Button>

        {/* Chat with Support */}
        <a
          href="https://wa.me/+919182031523?text=Hello%20I%20need%20support"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2"
        >
          <MessageCircle className="h-6 w-6 text-black" />
          <span className="text-lg font-medium text-black hover:underline">
            Need Help?
          </span>
        </a>
      </div>

      {/* Header */}
      <div className="flex items-center justify-center gap-2 text-center text-3xl font-bold">
        <UserPen
          size={36}
          className="mt-1.5 animate-pulse rounded-full border bg-white p-1 text-primary"
        />
        <h1 className="text-2xl font-medium">Profile</h1>
      </div>

      {/* Success Alert */}
      {showSuccessAlert && (
        <Alert className="animate-fadeIn mt-4 bg-green-50 text-green-800">
          <Check className="h-4 w-4" />
          <AlertDescription>Profile updated successfully!</AlertDescription>
        </Alert>
      )}

      {/* Form Fields */}
      <div className="mt-8 flex-grow space-y-6">
        {[
          { id: "name", label: "Name", type: "text" },
          { id: "birthday", label: "Birthday", type: "date" },
          {
            id: "phone",
            label: "Phone",
            type: "tel",
            value: learner?.phone || "",
            readonly: true,
          },
          { id: "email", label: "Email", type: "email" },
        ].map((field) => (
          <div
            key={field.id}
            className={`transform transition-all duration-200 ${
              isEditing ? "translate-x-0 opacity-100" : ""
            }`}
          >
            <Label htmlFor={field.id} className="block text-sm font-medium">
              {field.label}
            </Label>
            <Input
              id={field.id}
              type={field.type}
              value={field.readonly ? field.value : formData[field.id]}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              disabled={!isEditing || field.readonly}
              className={`mt-1 w-full transition-colors duration-200 ${
                isEditing && !field.readonly
                  ? "border-primary bg-white"
                  : "border-gray-200 bg-gray-50"
              }`}
            />
          </div>
        ))}

        {/* Edit/Save Buttons */}
        <div className="flex justify-center space-x-2">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                disabled={isUpdating}
                className="transform transition-all hover:scale-105"
              >
                {isUpdating ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="transform transition-all hover:scale-105"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              className="transform transition-all hover:scale-105"
            >
              <UserPen className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Logout Button */}
      <div className="mt-auto pb-20">
        <Button
          onClick={handleLogout}
          variant="destructive"
          className="w-full transform transition-all hover:scale-105"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
