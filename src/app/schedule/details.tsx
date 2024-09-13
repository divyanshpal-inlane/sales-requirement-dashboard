import { ArrowLeft } from "lucide-react";
import { useCallback, useState } from "react"; // Add this import
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { useLearnerUpdate } from "@/queries/learner";

export default function ScheduleDetails() {
  const { mutate: updateLearner } = useLearnerUpdate();
  const { user } = useAuth();
  // Add state for address and pin code
  const [address, setAddress] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");

  const navigate = useNavigate();

  const onContinue = useCallback(() => {
    updateLearner(
      {
        data: { city: pinCode, pick_up_location: address },
        phone: user?.phone,
      },
      {
        onSuccess: () => {
          navigate("/createSchedule/slots");
        },
      },
    );
  }, [address, pinCode, user]);

  return (
    <div className="flex h-full w-full flex-col rounded-md">
      <div className="flex flex-col rounded-b-[40px] bg-primary">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
            asChild
          >
            <Link to="/schedule">
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <span className="text-lg font-semibold text-primary-foreground">
            1/3
          </span>
        </div>
        <div className="relative z-10 rounded-b-[40px] bg-primary p-6 text-primary-foreground">
          <h1 className="mb-1 text-xl font-semibold">Pick-up location</h1>
          <p className="">Our instructor&apos;s will meet you here</p>
        </div>
      </div>
      <div className="mx-auto mt-8 flex w-full max-w-96 flex-col items-center gap-10 bg-white p-6">
        <div className="w-full space-y-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="input1">Address</Label>
            <Input
              id="input1"
              type="text"
              placeholder="Koramangla, Indiranagar"
              value={address} // Bind value to state
              onChange={(e) => setAddress(e.target.value)} // Update state on change
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="input2">Pin code</Label>
            <Input
              id="input2"
              type="text"
              placeholder="500001"
              value={pinCode} // Bind value to state
              onChange={(e) => setPinCode(e.target.value)} // Update state on change
            />
          </div>
        </div>
        <Button className="w-full" onClick={() => onContinue()}>
          Continue
        </Button>
      </div>
    </div>
  );
}
