import { Link as LinkIcon, UserPlus } from "lucide-react";
import React, { useEffect, useState } from "react";

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
  });

  const [createdLearnerId, setCreatedLearnerId] = useState(null);
  const [isCreateLearnerDialogOpen, setIsCreateLearnerDialogOpen] =
    useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [unpaidEnrollments, setUnpaidEnrollments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

  // Fetch unpaid enrollments - enrollments with payment_id set to null
  const fetchUnpaidEnrollments = async () => {
    setIsLoading(true);
    try {
      // Get all enrollments where payment_id is null, with related learner and course data
      const { data: unpaidEnrollmentsList, error: enrollmentError } =
        await supabase
          .from("enrollment")
          .select(`
            id,
            amount,
            payment_status,
            unlocked_lessons,
            installment_mode,
            installment1_amount,
            installment2_amount,
            learner_id,
            course_id,
            learner:learner_id (id, name, phone, email),
            course:course_id (id, name, duration)
          `)
          .is('payment_id', null); // This is the key filter - only get records where payment_id is null

      if (enrollmentError) throw enrollmentError;
      
      setUnpaidEnrollments(unpaidEnrollmentsList || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch unpaid enrollments",
        variant: "destructive",
      });
      console.error("Error fetching unpaid enrollments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch unpaid enrollments on component mount
  useEffect(() => {
    fetchUnpaidEnrollments();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLearnerData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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
    const lessonCount = parseInt(value, 10);
    setLearnerData((prev) => ({
      ...prev,
      unlockedLessons: Array.from({ length: lessonCount }, (_, i) => i + 1),
    }));
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

      const { data, error } = await supabase.functions.invoke(
        "create-learner-and-enrollment",
        {
          body: JSON.stringify(learnerData),
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

        // Refresh the unpaid enrollments list
        fetchUnpaidEnrollments();
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

      // Refresh the list to update the UI
      fetchUnpaidEnrollments();
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to send payment link",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/30 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
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

          {/* Card for Unpaid Enrollments */}
          <Card className="transition-all hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-gray-100 p-2 text-amber-500">
                  <LinkIcon size={24} />
                </div>
                <div>
                  <CardTitle className="text-xl">Unpaid Enrollments</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto rounded border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Learner</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-3 text-center">
                          Loading...
                        </td>
                      </tr>
                    ) : unpaidEnrollments.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-3 text-center">
                          No unpaid enrollments found
                        </td>
                      </tr>
                    ) : (
                      unpaidEnrollments.map((enrollment) => (
                        <tr
                          key={enrollment.id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 font-medium">
                            {enrollment.learner?.name || "N/A"}
                          </td>
                          <td className="px-4 py-3">
                            {enrollment.learner?.phone || "N/A"}
                          </td>
                          <td className="px-4 py-3">
                            {enrollment.course?.name || "N/A"}
                          </td>
                          <td className="px-4 py-3">
                            {enrollment.installment_mode === "installment"
                              ? `₹${enrollment.installment1_amount} (1st)`
                              : `₹${enrollment.amount}`}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() =>
                                sendPaymentLink(
                                  enrollment.learner,
                                  enrollment.course,
                                  enrollment.installment_mode === "installment"
                                    ? enrollment.installment1_amount
                                    : enrollment.amount,
                                  enrollment.installment_mode,
                                  enrollment.id,
                                )
                              }
                            >
                              Send Payment Link
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="flex justify-end p-3">
                  <Button
                    size="sm"
                    onClick={fetchUnpaidEnrollments}
                    variant="outline"
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

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
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="installmentType" className="text-right">
                    Installment Type
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      setLearnerData((prev) => ({
                        ...prev,
                        installmentType: value,
                      }))
                    }
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
                    className="col-span-3"
                    disabled={learnerData.installmentType === "full"}
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
                    value={
                      learnerData.installmentType === "installment"
                        ? learnerData.amount - learnerData.installment1Amount
                        : 0
                    }
                    className="col-span-3"
                    disabled
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="unlockedLessons" className="text-right">
                    Unlocked Lessons
                  </Label>
                  <Input
                    id="unlockedLessons"
                    name="unlockedLessons"
                    type="number"
                    onChange={(e) =>
                      handleUnlockedLessonsChange(e.target.value)
                    }
                    className="col-span-3"
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