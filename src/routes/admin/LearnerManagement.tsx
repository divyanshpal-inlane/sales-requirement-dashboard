import { UserPlus } from "lucide-react";
import React, { useState } from "react";

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
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { IncompletePaymentsCard } from "./IncompletePaymentsCard";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function LearnerManagement() {
  const [learnerData, setLearnerData] = useState({
    name: "",
    email: "",
    phone: "",
    courseId: "",
    courseName: "",
    amount: 0,
    installmentType: "installment", // Default to installment
    installment1Amount: 0,
    installment2Amount: 0,
    unlockedLessons: [],
    has_a_DL: false,
    address_change_required: false,
  });

  const [createdLearnerId, setCreatedLearnerId] = useState(null);
  const [unlockedLessonCount, setUnlockedLessonCount] = useState(2);
  const [isCreateLearnerDialogOpen, setIsCreateLearnerDialogOpen] =
    useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const courses = [
    {
      id: "e129f667-0510-4f07-9847-edb58356dc74",
      name: "Beginner Course",
      duration: 10,
    },
    {
      id: "f60e5fdb-787a-4b40-844d-4e66416a6c8f",
      name: "Flyover",
      duration: 2,
    },
    {
      id: "05a5f57f-c3e2-48ac-b29f-4299e30442eb",
      name: "Parking + flyover",
      duration: 4,
    },
    {
      id: "0ce6680f-6e12-49d7-8cf9-4388e81d2e27",
      name: "Parking",
      duration: 2,
    },
    {
      id: "abddddb8-3f54-41ea-a64b-5ba55988b12a",
      name: "Slopes + Parking",
      duration: 4,
    },
    { id: "cc5fb06a-419f-4766-a79b-221c81bf9826", name: "Slopes", duration: 2 },
    {
      id: "14552c29-e7e5-4e76-a350-1ae7d8ffc7f3",
      name: "Traffic + Flyover",
      duration: 6,
    },
    {
      id: "b991363c-6791-411e-9cb8-6723e40d0a0a",
      name: "Traffic + Parking + Flyover",
      duration: 8,
    },
    {
      id: "ddbbfbbf-2222-4742-947b-ccd4e25e7936",
      name: "Traffic + Parking",
      duration: 6,
    },
    {
      id: "7ff8818e-5b52-4030-bc2d-f54071e8ed7f",
      name: "Traffic",
      duration: 4,
    },
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setLearnerData((prev) => {
      const updatedData = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      // Auto-calculate installment2Amount when amount or installment1Amount changes
      if (name === "amount" || name === "installment1Amount") {
        const amount = name === "amount" ? Number(value) : Number(prev.amount);
        const installment1Amount =
          name === "installment1Amount"
            ? Number(value)
            : Number(prev.installment1Amount);

        if (updatedData.installmentType === "installment") {
          updatedData.installment2Amount = amount - installment1Amount;
        }
      }

      return updatedData;
    });
  };

  const handleCourseChange = (courseId) => {
    const selectedCourse = courses.find((course) => course.id === courseId);
    setLearnerData((prev) => ({
      ...prev,
      courseId,
      courseName: selectedCourse?.name || "",
    }));
  };

  const handleUnlockedLessonsChange = (value) => {
    // If value is empty, don't update the state yet
    if (value === "") return;

    const lessonCount = parseInt(value, 10);
    setLearnerData((prev) => ({
      ...prev,
      unlockedLessons: Array.from({ length: lessonCount }, (_, i) => i + 1),
    }));
  };

  const handleInstallmentTypeChange = (value) => {
    setLearnerData((prev) => {
      const updatedData = {
        ...prev,
        installmentType: value,
      };

      // Recalculate installment2Amount when switching to installment mode
      if (value === "installment") {
        updatedData.installment2Amount =
          Number(prev.amount) - Number(prev.installment1Amount);
      } else {
        updatedData.installment2Amount = 0;
      }

      return updatedData;
    });
  };

  const createLearnerAndEnrollment = async () => {
    try {
      // Validate required fields
      if (!learnerData.name || !learnerData.phone || !learnerData.courseId) {
        toast({
          title: "Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      // --- Email Validation Check ---
      const isValidEmail = (email) => {
        // Regex to check for a basic email structure (e.g., user@domain.com)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };
      if (!isValidEmail(learnerData.email)) {
        toast({
          title: "Error",
          description: "Invalid email address.",
          variant: "destructive",
        });
        return;
      }
      if (learnerData.phone.length != 10) {
        toast({
          title: "Error",
          description: "Invalid phone number",
          variant: "destructive",
        });
        return;
      }

      // If unlockedLessons is empty, set it to half the course duration
      let dataToSend = { ...learnerData };
      if (dataToSend.unlockedLessons.length === 0) {
        const selectedCourse = courses.find(
          (course) => course.id === dataToSend.courseId,
        );
        if (selectedCourse) {
          // Unlock only 1 lesson for half_paid
          const unlockCount = 1;
          dataToSend.unlockedLessons = Array.from(
            { length: unlockCount },
            (_, i) => i + 1,
          );
        }
      }

      // Relational attributes set
      // Following attributes are derived from form data and set
      // to render correct pages later
      dataToSend.LL_received = dataToSend.has_a_DL ? true : false;

      // send to backend
      console.log("Sending data to edge function", dataToSend);
      const { data, error } = await supabase.functions.invoke(
        "create-learner-and-enrollment",
        {
          body: JSON.stringify(dataToSend),
        },
      );

      if (error) throw error;

      // Ensure we set the created learner ID and enrollment ID
      if (data && data.learner && data.learner.id) {
        setCreatedLearnerId(data.learner.id);

        // Store enrollment ID for payment link
        const enrollmentId = data.enrollment ? data.enrollment.id : null;

        toast({
          title: "Success",
          description: "Learner and enrollment created successfully!",
        });

        setIsCreateLearnerDialogOpen(false); // Close the create learner dialog

        // Open payment dialog if enrollment was created
        if (enrollmentId) {
          // Store enrollment ID in state for use when sending payment link
          setLearnerData((prev) => ({
            ...prev,
            enrollmentId,
          }));
          setIsPaymentDialogOpen(true);
        }
      } else {
        throw new Error("No learner ID returned");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "An error occurred",
        variant: "destructive",
      });
      setCreatedLearnerId(null); // Reset createdLearnerId in case of error
    }
  };

  const sendPaymentLink = async (
    learner,
    course,
    amount,
    installmentMode,
    enrollmentId,
  ) => {
    try {
      const paymentLink = `https://inlane-web-app.vercel.app/payment?phone=${learner.phone}`;
      console.error("Use edge function for email ");

      // Define the request body for email trigger.
      const bodyData = {
          "learnerEmail": learner?.email,
          "learnerName": learner?.name, 
          "course": course?.name,
          "amount": amount,
          "paymentLink": paymentLink
      };

      const { error: invokeError } = await supabase.functions.invoke("send-payment-link-email", {
          body: bodyData,
      });
      if (invokeError) {
        console.error(invokeError);
        toast({
          title: "Failed to send email",
          description: `Failed to send link sent to ${learner?.email}`,
        });
      } else {
        toast({
          title: "Success",
          description: `Payment link sent to ${learner?.email} successfully!`,
        });
      }


      const { error } = await supabase.functions.invoke("send-message", {
        body: {
          message_type: "PAYMENT_LINK",
          learner_id: learner.id,
          enrollment_id: enrollmentId, // Include enrollment ID for tracking
          course_name: course.name,
          payment_amount: amount,
          duration: course.duration,
          payment_link: paymentLink,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Payment link sent to ${learner.name} successfully!`,
      });

      // Close the payment dialog if it's open (for newly created learners)
      if (isPaymentDialogOpen) {
        setIsPaymentDialogOpen(false);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to send payment link",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className="min-h-screen bg-white p-8"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
        backgroundAttachment: "fixed", // This prevents the background from getting cut off
      }}
    >
      <div className="container mx-auto">
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
            Learner Management
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Create learners and manage enrollments
          </p>
        </div>

        <div className="grid gap-6">
          {/* Card for Creating Learner */}
          <Card className="transition-all hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-gray-100 p-2 text-green-500">
                  <UserPlus size={24} />
                </div>
                <div>
                  <CardTitle className="text-xl">Create Learner</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant="ghost"
                onClick={() => setIsCreateLearnerDialogOpen(true)}
              >
                Create New Learner
              </Button>
            </CardContent>
          </Card>

          {/* Incomplete Payments Card */}
          <IncompletePaymentsCard />

          {/* Dialog for Creating Learner */}
          <Dialog
            open={isCreateLearnerDialogOpen}
            onOpenChange={setIsCreateLearnerDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Learner</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={learnerData.name}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    value={learnerData.email}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={learnerData.phone}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="courseId" className="text-right">
                    Course
                  </Label>
                  <Select
                    onValueChange={handleCourseChange}
                    value={learnerData.courseId}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">
                    Amount
                  </Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    value={learnerData.amount}
                    onChange={handleInputChange}
                    min={0}
                    className="col-span-3"
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="installmentType" className="text-right">
                    Installment Type
                  </Label>
                  <Select
                    onValueChange={handleInstallmentTypeChange}
                    value={learnerData.installmentType}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full</SelectItem>
                      <SelectItem value="installment">Installment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="installment1Amount" className="text-right">
                    Installment 1
                  </Label>
                  <Input
                    id="installment1Amount"
                    name="installment1Amount"
                    type="number"
                    value={learnerData.installment1Amount}
                    onChange={handleInputChange}
                    min={0}
                    className="col-span-3"
                    disabled={learnerData.installmentType === "full"}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="installment2Amount" className="text-right">
                    Installment 2
                  </Label>
                  <Input
                    id="installment2Amount"
                    name="installment2Amount"
                    type="number"
                    value={learnerData.installment2Amount}
                    className="col-span-3"
                    disabled
                  />
                </div>
                <div className="grid hidden grid-cols-4 items-center gap-4">
                  <Label htmlFor="unlockedLessons" className="text-right">
                    Unlocked Lessons
                  </Label>
                  <Input
                    id="unlockedLessons"
                    name="unlockedLessons"
                    type="number"
                    value="2"
                    onChange={(e) =>
                      handleUnlockedLessonsChange(e.target.value)
                    }
                    className="col-span-3"
                    placeholder={`Leave empty to unlock half the course`}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="has_a_DL"
                    name="has_a_DL"
                    checked={learnerData.has_a_DL}
                    onChange={handleInputChange}
                  />
                  <Label htmlFor="has_a_DL">Has a Driving License</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="address_change_required"
                    name="address_change_required"
                    checked={learnerData.address_change_required}
                    onChange={handleInputChange}
                  />
                  <Label htmlFor="address_change_required">License address change required</Label>
                </div>
                <Button onClick={createLearnerAndEnrollment}>
                  Create Learner
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog for Sending Payment Link */}
          <Dialog
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Payment Link</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <p>
                  Learner <strong>{learnerData.name}</strong> has been created
                  successfully. Would you like to send the payment link now?
                </p>
                <Button
                  onClick={() => {
                    const course = courses.find(
                      (c) => c.id === learnerData.courseId,
                    );
                    const paymentAmount =
                      learnerData.installmentType === "installment"
                        ? learnerData.installment1Amount
                        : learnerData.amount;

                    sendPaymentLink(
                      {
                        id: createdLearnerId,
                        name: learnerData.name,
                        phone: learnerData.phone,
                      },
                      {
                        name: learnerData.courseName,
                        duration: course?.duration || 0,
                      },
                      paymentAmount,
                      learnerData.installmentType,
                      learnerData.enrollmentId, // Use the enrollment ID from state
                    );
                  }}
                >
                  Send Payment Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
