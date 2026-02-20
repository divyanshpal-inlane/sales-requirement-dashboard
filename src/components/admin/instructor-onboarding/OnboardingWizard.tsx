import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2, UserPlus } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabaseAdmin } from "@/context/auth-context";
import { supabase } from "@/lib/supabaseClient";

import { StepIndicator } from "./StepIndicator";
// Import step components
import { BasicInfoStep } from "./steps/BasicInfoStep";
import { CalendarImportStep } from "./steps/CalendarImportStep";
import { ContractStep } from "./steps/ContractStep";
import { DocumentsStep } from "./steps/DocumentsStep";
import { ReviewStep } from "./steps/ReviewStep";
import { ServiceAreaStep } from "./steps/ServiceAreaStep";
import { UnavailabilityStep } from "./steps/UnavailabilityStep";
import { VehicleDetailsStep } from "./steps/VehicleDetailsStep";
import { initialOnboardingData, InstructorOnboardingData } from "./types";

const TOTAL_STEPS = 8;

// Email validation helper
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<InstructorOnboardingData>(
    initialOnboardingData,
  );

  // Update form data helper
  const updateFormData = useCallback(
    (updates: Partial<InstructorOnboardingData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  // Validate current step
  const validateStep = (step: number): ValidationResult => {
    const errors: string[] = [];

    switch (step) {
      case 1: // Basic Info
        if (!formData.name.trim()) {
          errors.push("Name is required");
        } else if (formData.name.trim().length < 2) {
          errors.push("Name must be at least 2 characters");
        }
        if (!formData.phone.trim()) {
          errors.push("Phone number is required");
        } else if (formData.phone.length !== 10) {
          errors.push("Phone number must be exactly 10 digits");
        }
        if (formData.email && !isValidEmail(formData.email)) {
          errors.push("Invalid email format");
        }
        break;

      case 2: // Documents
        if (formData.id_proof_type && !formData.id_proof_number) {
          errors.push("ID proof number is required when type is selected");
        }
        break;

      case 3: // Vehicle Details
        if (!formData.car_fuel_type) {
          errors.push("Fuel type is required");
        }
        if (!formData.car_make) {
          errors.push("Transmission type is required");
        }
        if (!formData.car_mode.trim()) {
          errors.push("Car model is required");
        }
        if (!formData.car_number.trim()) {
          errors.push("Vehicle registration number is required");
        }
        break;

      case 4: // Service Area
        if (!formData.address.trim()) {
          errors.push("Address is required");
        }
        if (!formData.latitude || !formData.longitude) {
          errors.push("Please select a valid address from the dropdown");
        }
        if (!formData.radius || formData.radius < 1) {
          errors.push("Service radius is required");
        }
        if (formData.areas.length === 0) {
          errors.push("At least one serviceable area is required");
        }
        break;

      case 5: // Unavailability
        // Optional step, no required validation
        break;

      case 6: // Calendar Import
        // Optional step, no required validation
        break;

      case 7: // Contract
        if (!formData.contractAccepted) {
          errors.push("You must accept the terms and conditions");
        }
        break;

      case 8: // Review
        if (!formData.initialPassword.trim()) {
          errors.push("Initial password is required");
        } else if (formData.initialPassword.length < 6) {
          errors.push("Password must be at least 6 characters");
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  };

  // Handle next step
  const handleNext = () => {
    const validation = validateStep(currentStep);
    if (!validation.valid) {
      toast({
        title: "Validation Error",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  // Handle back step
  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Handle step click from review page
  const handleStepClick = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: InstructorOnboardingData) => {
      // 1. Check if phone already exists in Instructor table
      const { data: existingInstructor } = await supabase
        .from("Instructor")
        .select("id_instructor")
        .eq("phone", data.phone)
        .maybeSingle();

      if (existingInstructor) {
        throw new Error("An instructor with this phone number already exists");
      }

      // 2. Check if auth user already exists
      // Note: We can't directly check auth users, but the createUser will fail if exists

      // 3. Create Supabase Auth account
      const phoneNumber = `+91${data.phone}`;
      const userEmail = data.email || `${data.phone}@instructor.inlane.app`;
      console.log("Creating auth user for phone:", phoneNumber);

      // First check if auth user already exists
      try {
        const { data: existingUsers } =
          await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
          (u) =>
            u.phone === phoneNumber ||
            u.phone === data.phone ||
            u.email === userEmail,
        );
        if (existingUser) {
          throw new Error(
            `A user with this phone (${phoneNumber}) or email (${userEmail}) already exists in auth system. User ID: ${existingUser.id}`,
          );
        }
      } catch (listError: any) {
        if (listError.message?.includes("already exists")) {
          throw listError;
        }
        console.warn("Could not check existing users:", listError);
      }

      // Try creating with phone using admin API
      let authData: any = null;
      let authError: any = null;
      let createdWithPhone = false;

      // Method 1: Try admin API with phone (preferred for phone-based login)
      try {
        const result = await supabaseAdmin.auth.admin.createUser({
          phone: phoneNumber,
          password: data.initialPassword,
          email: userEmail,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: {
            user_role: "instructor",
            name: data.name,
          },
        });

        if (!result.error) {
          authData = result.data;
          createdWithPhone = true;
          console.log("Created user with admin API (phone)");
        } else {
          console.warn("Admin API failed:", result.error.message);
          authError = result.error;
        }
      } catch (err) {
        console.warn("Admin API exception:", err);
      }

      // Method 2: Fallback to signUp with phone if admin fails
      if (!authData?.user) {
        console.log("Trying signUp with phone...");
        const signUpResult = await supabase.auth.signUp({
          phone: phoneNumber,
          password: data.initialPassword,
          options: {
            data: {
              user_role: "instructor",
              name: data.name,
              email: userEmail,
            },
          },
        });

        if (!signUpResult.error && signUpResult.data?.user) {
          authData = signUpResult.data;
          createdWithPhone = true;
          console.log("Created user with signUp (phone)");
        } else if (signUpResult.error) {
          console.warn("Phone signUp failed:", signUpResult.error.message);
        }
      }

      // Method 3: Last resort - create with email only
      if (!authData?.user) {
        console.log("Trying signUp with email only...");
        const emailResult = await supabase.auth.signUp({
          email: userEmail,
          password: data.initialPassword,
          options: {
            data: {
              user_role: "instructor",
              name: data.name,
              phone: data.phone,
            },
          },
        });

        authData = emailResult.data;
        authError = emailResult.error;

        if (authData?.user) {
          console.log(
            "Created user with email (phone login won't work - instructor must use email)",
          );
        }
      }

      // If all auth methods fail, still create the instructor record
      // The auth user can be created manually later
      let authUserId: string | null = null;

      if (authData?.user) {
        authUserId = authData.user.id;
        console.log(
          "Auth user created:",
          authUserId,
          "Phone login:",
          createdWithPhone,
        );
      } else {
        console.warn(
          "Auth user creation failed - creating instructor without auth account",
        );
        console.warn("Auth error:", authError?.message);
        // Don't throw - continue to create instructor record
      }

      // 4. Add new areas to Serviceable_Areas if needed
      for (const area of data.areas) {
        const { data: existingArea } = await supabase
          .from("Serviceable_Areas")
          .select("id, name")
          .ilike("name", area)
          .maybeSingle();

        if (!existingArea) {
          await supabase.from("Serviceable_Areas").insert({ name: area });
        }
      }

      // 5. Create Instructor record (only include columns that exist in the table)
      const instructorRecord: Record<string, any> = {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        DL_number: data.DL_number || null,
        car_make: data.car_make,
        car_mode: data.car_mode,
        car_number: data.car_number,
        car_fuel_type: data.car_fuel_type,
        experience: data.experience || null,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        radius: data.radius,
        areas: data.areas,
        unavailability: data.unavailability,
        enabled: true,
        signed_up: new Date().toISOString(),
        // Calendar import (optional)
        imported_calendar_events:
          data.importedCalendarEvents.length > 0
            ? data.importedCalendarEvents
            : null,
        imported_calendar_updated_at:
          data.importedCalendarEvents.length > 0
            ? new Date().toISOString()
            : null,
      };

      // Only add optional columns if they exist (these were added via migration)
      // These will be ignored if column doesn't exist due to error handling
      console.log("Creating instructor record:", instructorRecord);

      const { data: newInstructor, error: instructorError } = await supabase
        .from("Instructor")
        .insert(instructorRecord)
        .select()
        .single();

      if (instructorError) {
        console.error("Instructor insert error:", instructorError);

        // Rollback: Try to delete the auth user if instructor creation fails
        if (authUserId) {
          try {
            const deleteResult =
              await supabaseAdmin.auth.admin.deleteUser(authUserId);
            console.log("Rolled back auth user:", deleteResult);
          } catch (rollbackError) {
            console.error("Failed to rollback auth user:", rollbackError);
          }
        }
        throw new Error(
          `Failed to create instructor: ${instructorError.message}`,
        );
      }

      return {
        instructor: newInstructor,
        credentials: {
          phone: data.phone,
          email: userEmail,
          password: data.initialPassword,
          usePhoneLogin: createdWithPhone,
          authCreated: !!authUserId,
        },
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["instructors"] });
      queryClient.invalidateQueries({ queryKey: ["serviceable-areas"] });

      if (!result.credentials.authCreated) {
        // Auth user was not created - show warning
        toast({
          title: "Instructor Record Created",
          description:
            "WARNING: Login account could not be created due to Supabase auth error. Create auth user manually.",
          variant: "destructive",
        });
      } else {
        const loginMethod = result.credentials.usePhoneLogin
          ? `Phone: +91${result.credentials.phone}`
          : `Email: ${result.credentials.email}`;

        toast({
          title: "Instructor Created Successfully!",
          description: loginMethod,
        });
      }

      // Copy credentials to clipboard
      const credentials = result.credentials.usePhoneLogin
        ? `Phone: +91${result.credentials.phone}\nPassword: ${result.credentials.password}`
        : `Email: ${result.credentials.email}\nPhone: +91${result.credentials.phone}\nPassword: ${result.credentials.password}`;
      navigator.clipboard.writeText(credentials);

      toast({
        title: "Credentials Copied",
        description: "Login credentials have been copied to clipboard",
      });

      navigate("/admin/instructors");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleSubmit = () => {
    const validation = validateStep(currentStep);
    if (!validation.valid) {
      toast({
        title: "Validation Error",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate(formData);
  };

  // Render current step
  const renderStep = () => {
    const stepProps = { data: formData, updateData: updateFormData };

    switch (currentStep) {
      case 1:
        return <BasicInfoStep {...stepProps} />;
      case 2:
        return <DocumentsStep {...stepProps} />;
      case 3:
        return <VehicleDetailsStep {...stepProps} />;
      case 4:
        return <ServiceAreaStep {...stepProps} />;
      case 5:
        return <UnavailabilityStep {...stepProps} />;
      case 6:
        return <CalendarImportStep {...stepProps} />;
      case 7:
        return <ContractStep {...stepProps} />;
      case 8:
        return <ReviewStep {...stepProps} onStepClick={handleStepClick} />;
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/instructors")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Instructors
        </Button>
        <h1 className="text-2xl font-bold">Onboard New Instructor</h1>
        <p className="text-muted-foreground">
          Complete all steps to create a new instructor account
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} onStepClick={handleStepClick} />

      {/* Step Content */}
      <Card className="mt-6">
        <CardContent className="pt-6">{renderStep()}</CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1 || submitMutation.isPending}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {currentStep < TOTAL_STEPS ? (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Instructor
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
