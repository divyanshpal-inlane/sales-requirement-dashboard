import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { useCourses } from "@/queries/payment";

interface PaymentDetails {
  amount: number;
  email: string;
  phone: string;
  paymentType: "course" | "reschedule";
  courseId?: string;
  requestId?: string;
  name: string;
}

function PaymentPage() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: courses, isLoading: coursesLoading } = useCourses();

  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    amount: Number(searchParams.get("amount")) || 0,
    email: searchParams.get("email") || "",
    phone: searchParams.get("phone") || "",
    paymentType:
      (searchParams.get("type") as "course" | "reschedule") || "course",
    courseId: searchParams.get("courseId") || "",
    requestId: searchParams.get("requestId") || undefined,
    name: searchParams.get("name") || "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCourseChange = (courseId: string) => {
    const selectedCourse = courses?.find((course) => course.id === courseId);
    setPaymentDetails((prev) => ({
      ...prev,
      courseId,
      amount: selectedCourse?.price || 0,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "process-payment",
        {
          body: paymentDetails,
        },
      );

      if (error) throw error;

      // Create a form element
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.gatewayURL;

      // Add all the required fields from the response
      Object.entries(data.formData).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      // Append the form to the document body and submit
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form); // Clean up the form after submission
    } catch (err) {
      console.error("Payment initiation failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Payment initiation failed. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const type =
    searchParams.get("type") === "reschedule" ? "reschedule" : "course";

  if (coursesLoading) {
    return (
      <div className="container mx-auto max-w-md py-8">
        <Card>
          <CardHeader>
            <CardTitle>Loading courses...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {type === "course" && (
              <div>
                <label
                  htmlFor="courseId"
                  className="mb-1 block text-sm font-medium"
                >
                  Select Course
                </label>
                <Select
                  value={paymentDetails.courseId}
                  onValueChange={handleCourseChange}
                  disabled={coursesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses?.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name} - {course.total_lessons} Lessons
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label
                htmlFor="amount"
                className="mb-1 block text-sm font-medium"
              >
                Amount
              </label>
              <Input
                id="amount"
                name="amount"
                type="number"
                value={paymentDetails.amount}
                onChange={handleInputChange}
                disabled
                className="w-full"
              />
            </div>
            {type === "course" && (
              <>
                <div>
                  <label
                  htmlFor="name"
                  className="mb-1 block text-sm font-medium"
                  >
                    Name
                    </label>
                    <Input
                    id="name"
                    name="name"
                    type="text"
                    value={paymentDetails.name}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                    />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={paymentDetails.email}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1 block text-sm font-medium"
                  >
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={paymentDetails.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                    pattern="[0-9]{10}"
                    title="Please enter a valid 10-digit phone number"
                  />
                </div>
              </>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={
                isLoading ||
                (!paymentDetails.courseId && type === "course") ||
                (!paymentDetails.requestId && type === "reschedule")
              }
            >
              {isLoading ? "Processing..." : "Proceed to Pay"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentPage;
