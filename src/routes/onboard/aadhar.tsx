import { ArrowLeft } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLearnerUpdate } from "@/queries/learner";
import { useQueryClient } from "@tanstack/react-query";

export default function Aadhar() {
  const [selectedState, setSelectedState] = useState<string>("");
  const { mutate, isPending } = useLearnerUpdate();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleContinueClick = useCallback(() => {
    if (!selectedState) {
      alert("No selected state");
      return;
    }
    mutate(
      {
        aadhar_state: selectedState,
        onboarding_completed: true,
      },
      {
        onSuccess: async () => {
          await queryClient.refetchQueries({ queryKey: ["learner"] });

          //  navigate home as licence info already filled by admin
          localStorage.setItem("onboardingDone", "true");

          navigate("/home");
        },
      },
    );
  }, [mutate, navigate, selectedState, queryClient]);

  const states = [
    "Andaman and Nicobar Islands",
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chandigarh",
    "Chhattisgarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jammu and Kashmir",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Lakshadweep",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Puducherry",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
  ].sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex h-full w-full flex-col rounded-md">
      <div className="flex flex-col rounded-b-[40px] bg-primary">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
            onClick={() => navigate("/onboard/birthday")}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <span className="text-lg font-semibold text-primary-foreground">
            2/2
          </span>
        </div>
        <div className="relative z-10 rounded-b-[40px] bg-primary p-6 text-primary-foreground">
          <h1 className="mb-2 text-2xl font-semibold">
            Where is your aadhar registered?
          </h1>
          <p className="text">
            We use this for the learner&apos;s license application
          </p>
        </div>
      </div>
      <div className="flex grow flex-col justify-between bg-white p-6">
        <div className="mt-8 space-y-4">
          <Select
            value={selectedState}
            onValueChange={(val) => setSelectedState(val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {states.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleContinueClick}
          className="w-full"
          disabled={isPending || !selectedState}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
