import { ArrowLeft } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";

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

export default function Aadhar() {
  const [selectedState, setSelectedState] = useState<string>("");
  const { mutate, isPending } = useLearnerUpdate();
  const navigate = useNavigate();

  const handleContinueClick = useCallback(() => {
    if (!selectedState) {
      alert("No selected state");
      return;
    }
    mutate(
      {
        aadhar_state: selectedState,
      },
      {
        onSuccess: () => navigate("/onboard/dl"),
      },
    );
  }, [mutate, navigate, selectedState]);

  return (
    <div className="flex h-full w-full flex-col rounded-md">
      <div className="flex flex-col rounded-b-[40px] bg-primary">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <span className="text-lg font-semibold text-primary-foreground">
            1/2
          </span>
        </div>
        <div className="relative z-10 rounded-b-[40px] bg-primary p-6 text-primary-foreground">
          <h1 className="mb-2 text-2xl font-bold">
            Where is your aadhar regitered?
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
                <SelectItem value="andhra-pradesh">Andhra Pradesh</SelectItem>
                <SelectItem value="arunachal-pradesh">
                  Arunachal Pradesh
                </SelectItem>
                <SelectItem value="assam">Assam</SelectItem>
                <SelectItem value="bihar">Bihar</SelectItem>
                <SelectItem value="chhattisgarh">Chhattisgarh</SelectItem>
                <SelectItem value="goa">Goa</SelectItem>
                <SelectItem value="gujarat">Gujarat</SelectItem>
                <SelectItem value="haryana">Haryana</SelectItem>
                <SelectItem value="himachal-pradesh">
                  Himachal Pradesh
                </SelectItem>
                <SelectItem value="jammu-and-kashmir">
                  Jammu and Kashmir
                </SelectItem>
                <SelectItem value="jharkhand">Jharkhand</SelectItem>
                <SelectItem value="karnataka">Karnataka</SelectItem>
                <SelectItem value="kerala">Kerala</SelectItem>
                <SelectItem value="madhya-pradesh">Madhya Pradesh</SelectItem>
                <SelectItem value="maharashtra">Maharashtra</SelectItem>
                <SelectItem value="manipur">Manipur</SelectItem>
                <SelectItem value="meghalaya">Meghalaya</SelectItem>
                <SelectItem value="mizoram">Mizoram</SelectItem>
                <SelectItem value="nagaland">Nagaland</SelectItem>
                <SelectItem value="odisha">Odisha</SelectItem>
                <SelectItem value="punjab">Punjab</SelectItem>
                <SelectItem value="rajasthan">Rajasthan</SelectItem>
                <SelectItem value="sikkim">Sikkim</SelectItem>
                <SelectItem value="tamil-nadu">Tamil Nadu</SelectItem>
                <SelectItem value="telangana">Telangana</SelectItem>
                <SelectItem value="tripura">Tripura</SelectItem>
                <SelectItem value="uttarakhand">Uttarakhand</SelectItem>
                <SelectItem value="uttar-pradesh">Uttar Pradesh</SelectItem>
                <SelectItem value="west-bengal">West Bengal</SelectItem>
                <SelectItem value="andaman-and-nicobar-islands">
                  Andaman and Nicobar Islands
                </SelectItem>
                <SelectItem value="chandigarh">Chandigarh</SelectItem>
                <SelectItem value="dadra-and-nagar-haveli-and-daman-and-diu">
                  Dadra and Nagar Haveli and Daman and Diu
                </SelectItem>
                <SelectItem value="delhi">Delhi</SelectItem>
                <SelectItem value="lakshadweep">Lakshadweep</SelectItem>
                <SelectItem value="puducherry">Puducherry</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleContinueClick}
          className="w-full"
          disabled={isPending}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
