import {
  Calendar,
  Car,
  CarFrontIcon,
  Edit2,
  LogOut,
  Mail,
  Phone,
  User,
  ArrowLeft,
  MessageCircle,
  HelpCircle,
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

  const handleCall = () => {
    window.location.href = "tel:+919182031523";
  };

  const handleWhatsApp = () => {
    window.open("https://wa.me/919182031523", "_blank");
  };

  const handleEmail = () => {
    window.location.href = "mailto:team@inlane.in";
  };

  if (instructorLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-lg animate-pulse">Loading profile...</div>
      </div>
    );
  }

  if (instructorError) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-lg text-red-500">{instructorError.message}</div>
      </div>
    );
  }

  return (
<div className="overflow-y-auto p-6 mx-auto max-w-4xl h-screen">

      {/* Back Button */}
      <div className="flex items-center mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="flex gap-1 items-center text-muted-foreground">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      {/* Header */}
      <div className="flex relative justify-between items-center p-5 bg-gradient-to-r from-purple-300 to-purple-200 rounded-xl shadow-sm">
        <div className="flex gap-4 items-center">
          <div className="flex justify-center items-center w-16 h-16 bg-white rounded-full">
            <User className="w-8 h-8 text-gray-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{formData.name}</h1>
            <p className="text-sm text-gray-600">Driving Instructor</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="w-5 h-5 text-gray-700" />
        </Button>
      </div>

      {/* Two Columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Personal Info */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <h2 className="text-lg font-semibold">Personal Information</h2>
            <div className="flex gap-2 items-center p-2 bg-gray-100 rounded-md">
              <Mail className="w-4 h-4 text-blue-600" />
              <span>{formData.email}</span>
            </div>
            <div className="flex gap-2 items-center p-2 bg-gray-100 rounded-md">
              <Phone className="w-4 h-4 text-blue-600" />
              <span>{formData.phone}</span>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <h2 className="text-lg font-semibold">Statistics</h2>
            <div className="flex gap-3 items-center p-2 bg-blue-50 rounded-md">
              <CarFrontIcon className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-semibold text-blue-700">
                  {formData.car_make}
                </div>
                <div className="text-xs text-gray-600">Car Type</div>
              </div>
            </div>
            <div className="flex gap-3 items-center p-2 bg-green-50 rounded-md">
              <Calendar className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-semibold text-green-700">
                  {formData.experience} Years
                </div>
                <div className="text-xs text-gray-600">Experience</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Info */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <h2 className="text-lg font-semibold">Vehicle Information</h2>
          <div className="flex gap-2 items-center p-2 bg-gray-100 rounded-md">
            <Car className="w-4 h-4 text-blue-600" />
            <div>
              <div className="font-medium">{formData.car_mode}</div>
              <div className="text-sm text-gray-600">{formData.car_number}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help & Support Section */}
      <div className="pt-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">Help & Support</h1>

        <div className="space-y-6">
          {/* Contact Options */}
          <div className="p-6 bg-gray-50 rounded-lg">
            <h2 className="mb-4 text-lg font-medium text-gray-700">Get in Touch</h2>

            <div className="space-y-4">
              <button
                onClick={handleCall}
                className="flex gap-4 items-center p-5 w-full text-white rounded-lg transition-colors bg-primary hover:bg-primary/90"
              >
                <Phone size={24} />
                <div className="flex flex-col items-start text-left">
                  <span className="text-lg font-medium">Call Us</span>
                  <span className="text-base opacity-90">+91 9182031523</span>
                </div>
              </button>

              <button
                onClick={handleWhatsApp}
                className="flex gap-4 items-center p-5 w-full text-green-600 rounded-lg border-2 border-green-500 transition-colors hover:bg-green-50"
              >
                <MessageCircle size={24} />
                <div className="flex flex-col items-start text-left">
                  <span className="text-lg font-medium">WhatsApp</span>
                  <span className="text-base opacity-70">Quick support</span>
                </div>
              </button>

              <button
                onClick={handleEmail}
                className="flex gap-4 items-center p-5 w-full rounded-lg border border-gray-300 transition-colors hover:bg-gray-50"
              >
                <Mail size={24} />
                <div className="flex flex-col items-start text-left">
                  <span className="text-lg font-medium">Email Support</span>
                  <span className="text-base opacity-70">team@inlane.in</span>
                </div>
              </button>
            </div>
          </div>

          {/* Response Time Notice */}
          <div className="flex gap-4 items-start p-5 bg-white rounded-lg border border-primary">
            <HelpCircle className="flex-shrink-0 mt-1 w-6 h-6 text-primary" />
            <p className="text-base text-gray-700">
              Our team will contact you within <strong>24 hours</strong> to assist you with your queries.
            </p>
          </div>

          {/* Additional Help CTA */}
          <div className="p-6 text-center rounded-lg bg-accent-purple/5">
            <h3 className="mb-3 text-xl font-medium text-accent-purple">Need More Help?</h3>
            <p className="mb-6 text-base text-gray-600">
              Can't find what you're looking for? Our support team is here to help you with any questions about our driving courses.
            </p>
            <button
              onClick={handleCall}
              className="px-8 py-3 text-lg text-white rounded-lg transition-colors bg-accent-purple hover:bg-accent-purple/90"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorProfile;
