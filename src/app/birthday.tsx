import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

export default function Birthday() {
  return (
    <div className="flex h-full w-fit flex-col rounded-md">
      <div className="flex flex-col rounded-b-[20px] bg-primary">
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
          <h1 className="mb-2 text-2xl font-bold">When's your birthday?</h1>
          <p>We use this to check your eligibility to drive</p>
        </div>
      </div>
      <div className="flex grow flex-col justify-between bg-white p-6">
        <div className="mt-8 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input placeholder="Day" className="text-center" />
            <Input placeholder="Month" className="text-center" />
            <Input placeholder="Year" className="text-center" />
          </div>
        </div>
        <Button className="w-full">Continue</Button>
      </div>
    </div>
  );
}
