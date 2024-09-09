import { ArrowLeft } from "lucide-react";

import { DatePickerDemo } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function Home() {
  return (
    <div className="flex h-full flex-col p-6 pb-20">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="icon" className="text-primary-foreground">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl">Test Date</h1>
        <div className="w-6" />
      </div>

      <div className="mb-6 overflow-hidden rounded-3xl bg-white shadow-lg">
        <img
          src="/api/placeholder/400/240"
          alt="Person using laptop"
          className="h-48 w-full object-cover"
        />
      </div>

      <Label className="mb-4 text-xl">
        When are you taking your Learners License Test?
      </Label>

      <DatePickerDemo />

      <Button className="mt-auto w-full" variant={"purple"}>
        Submit
      </Button>
    </div>
  );
}
