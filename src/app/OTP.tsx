import { ArrowLeft } from "lucide-react";
import { useParams } from "react-router";

import PurpleGradient from "@/components/layout/purple";
import { OTPInput } from "@/components/OTP";
import { Button } from "@/components/ui/button";

export default function OTP() {
  const handleOtpChange = (otp: string) => {
    console.log("OTP:", otp);
  };

  const { lessonId } = useParams();

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
          <h1 className="text-xl">Test Date</h1>
          <div className="w-6" />
        </div>

        <div className="relative mb-6 overflow-hidden rounded-3xl bg-white shadow-lg">
          <img
            src="/assets/laptop-typing.png"
            alt="Person using laptop"
            className="object-fit h-48 w-full"
          />
          <div className="absolute left-[40%] top-[45%] self-center">
            <p className="text-lg font-bold">Lesson {lessonId}</p>
          </div>
        </div>

        <div className="mb-6 flex justify-center">
          <OTPInput length={6} onChange={handleOtpChange} />
        </div>

        <Button className="w-full" variant={"purple"}>
          Submit OTP
        </Button>
      </div>
    </PurpleGradient>
  );
}
