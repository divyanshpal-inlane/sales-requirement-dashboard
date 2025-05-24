import {
  Calendar,
  Car,
  CarFrontIcon,
  Edit2,
  LogOut,
  Mail,
  Phone,
  User,
  X,
  ArrowLeft,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth, useUser } from "@/context/auth-context";
import { useInstructor, useUpdateInstructor } from "@/queries/instructor";

const InstructorProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { phone } = useUser();
  const {
    data: instructorData,
    isLoading: instructorLoading,
    error: instructorError,
  } = useInstructor(phone);

  const updateInstructorMutation = useUpdateInstructor();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    car_make: "",
    car_mode: "",
    car_number: "",
    experience: "",
  });

  useEffect(() => {
    if (instructorData?.instructorInfo) {
      setFormData({
        name: instructorData.instructorInfo.name || "",
        email: instructorData.instructorInfo.email || "",
        phone: instructorData.instructorInfo.phone || "",
        car_make: instructorData.instructorInfo.car_make || "",
        car_mode: instructorData.instructorInfo.car_mode || "",
        car_number: instructorData.instructorInfo.car_number || "",
        experience: instructorData.instructorInfo.experience?.toString() || "",
      });
    }
  }, [instructorData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCarModeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      car_mode: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateInstructorMutation.mutateAsync({
        id_instructor: instructorData?.instructorInfo.id_instructor,
        phone: instructorData?.instructorInfo.phone,
        ...formData,
        experience: parseInt(formData.experience),
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/instructor-login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (instructorLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-pulse text-lg">Loading profile...</div>
      </div>
    );
  }

  if (instructorError) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-lg text-red-500">{instructorError.message}</div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn mx-auto max-w-3xl space-y-6 overflow-y-auto p-4">
      {/* Back Button */}
      <div className="mb-4 flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)} // Navigate back to the previous page
          className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </Button>
      </div>

      {/* Header with Profile Picture and Main Actions */}
      <div className="relative rounded-lg bg-gradient-to-r from-purple-100 to-accent-purple p-6 text-gray-700 shadow-lg">
        <div className="absolute right-4 top-4 flex flex-col gap-2">
          {/* <Button
            variant="ghost"
            size="sm"
            className="bg- text-white hover:bg-blue-400"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <X className="h-4 w-4" />
            ) : (
              <Edit2 className="h-4 w-4" />
            )}
          </Button> */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-blue-400"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="h-20 w-20">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white/30">
              <User className="h-12 w-12 text-gray-400" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">
              {isEditing ? (
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="bg-white/10 text-white placeholder:text-white/60"
                />
              ) : (
                instructorData?.instructorInfo.name
              )}
            </h1>
            <p className="text-sm opacity-90">Driving Instructor</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="mb-4 text-xl font-semibold">Personal Information</h2>
            <div className="space-y-3">
              <div className="group flex items-center space-x-3 rounded-md p-2 transition-colors hover:bg-gray-50">
                <Mail className="h-5 w-5 text-blue-500" />
                {isEditing ? (
                  <Input
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="flex-1"
                  />
                ) : (
                  <span className="text-sm">
                    {instructorData?.instructorInfo.email}
                  </span>
                )}
              </div>
              <div className="group flex items-center space-x-3 rounded-md p-2 transition-colors hover:bg-gray-50">
                <Phone className="h-5 w-5 text-blue-500" />
                {isEditing ? (
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="flex-1"
                  />
                ) : (
                  <span className="text-sm">
                    {instructorData?.instructorInfo.phone}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="mb-4 text-xl font-semibold">Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center rounded-lg bg-blue-50 p-4 transition-colors hover:bg-blue-100">
                <CarFrontIcon className="mb-2 h-8 w-8 text-blue-500" />
                {isEditing ? (
                  <Select
                    value={formData.car_mode}
                    onValueChange={handleCarModeChange}
                  >
                    <SelectTrigger className="w-32 text-center">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manual">Manual</SelectItem>
                      <SelectItem value="Automatic">Automatic</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-2xl font-light text-blue-600">
                    {instructorData?.instructorInfo.car_mode || "N/A"}
                  </span>
                )}
                <span className="text-sm text-gray-600">Car Type</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-green-50 p-4 transition-colors hover:bg-green-100">
                <Calendar className="mb-2 h-8 w-8 text-green-500" />
                {isEditing ? (
                  <Input
                    name="experience"
                    type="number"
                    value={formData.experience}
                    onChange={handleInputChange}
                    className="text-center"
                  />
                ) : (
                  <span className="text-2xl font-bold text-green-600">
                    {instructorData?.instructorInfo.experience || 0}
                  </span>
                )}
                <span className="text-sm text-gray-600">Years Experience</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Information */}
        <Card className="md:col-span-2">
          <CardContent className="space-y-4 p-6">
            <h2 className="mb-4 text-xl font-semibold">Vehicle Information</h2>
            <div className="flex items-center space-x-4 rounded-lg bg-gray-50 p-3">
              <Car className="h-8 w-8 text-blue-500" />
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      name="car_make"
                      value={formData.car_make}
                      onChange={handleInputChange}
                      placeholder="Car Make"
                    />
                    <Input
                      name="car_number"
                      value={formData.car_number}
                      onChange={handleInputChange}
                      placeholder="Car Number"
                    />
                  </div>
                ) : (
                  <>
                    <p className="font-medium">
                      {instructorData?.instructorInfo.car_make ||
                        "Vehicle not set"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {instructorData?.instructorInfo.car_number ||
                        "Number not available"}
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {isEditing && (
          <div className="flex justify-end space-x-2 md:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateInstructorMutation.isPending}>
              Save Changes
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};

export default InstructorProfile;
