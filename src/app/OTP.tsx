import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";

import PurpleGradient from "@/components/layout/purple";
import { OTPInput } from "@/components/OTP";
import { Button } from "@/components/ui/button";
import { useUpcomingLesson, useUpdateScheduleStatus } from "@/queries/learner";

export default function OTP() {
  const { lessonId } = useParams();
  const [OTP, setOTP] = useState("");
  const [isOTPCorrect, setIsOTPCorrect] = useState<null | boolean>(null);
  const navigate = useNavigate();

  const { data, isLoading, error } = useUpcomingLesson();
  const { mutate } = useUpdateScheduleStatus();

  const handleOtpChange = (otp: string) => {
    setOTP(otp);
    console.log("OTP:", otp);
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const handleSubmit = () => {
    const upcomingSchedule = data?.upcomingSchedule;

    if (upcomingSchedule?.otp === OTP) {
      setIsOTPCorrect(true);
      console.log("OTP is correct");
      mutate(
        {
          scheduleId: upcomingSchedule.id,
          status: "IN_PROGRESS",
        },
        {
          onSuccess: () => {
            navigate("/timer");
          },
        },
      );
    } else {
      setIsOTPCorrect(false);
      console.log("OTP is incorrect");
    }
  };

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

        <Button onClick={handleSubmit} className="w-full" variant={"purple"}>
          Submit OTP
        </Button>

        {isOTPCorrect === false && (
          <p className="mt-8 text-center text-orange-600">
            ❌ Incorrect OTP, Please try again!
          </p>
        )}
      </div>
    </PurpleGradient>
  );
}
