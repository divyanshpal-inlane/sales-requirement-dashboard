import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import PurpleGradient from "@/components/layout/purple";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function LL_test_booking_1() {
  return (
    <PurpleGradient>
      <div className="flex h-full flex-col p-6">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl">LL Test Booking</h1>
          <div className="w-6" />
        </div>

        <div className="mb-6 overflow-hidden rounded-3xl bg-white shadow-lg">
          <img
            src="/assets/aadhar-card.png"
            alt="aadhar card"
            className="object-fit h-56 w-full"
          />
        </div>

        <Label className="mb-4 text-xl">
          Is your Aadhaar registered in the current state of residence?
        </Label>
        <p className="mb-12">
          Example, My Aadhaar is registered in Bangalore and I am staying in
          Bangalore currently
        </p>

        <div className="flex flex-row justify-center gap-12">
          <Link to="/bookLL-2/1">
            <Button className="mt-auto w-[90px]" variant={"purple"}>
              Yes
            </Button>
          </Link>
          <Link to="/bookLL-2/2">
            <Button className="mt-auto w-[90px]" variant={"purple"}>
              No
            </Button>
          </Link>
        </div>
      </div>
    </PurpleGradient>
  );
}
