import { ArrowLeft, Check, MapPin, Phone, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { OTPInput } from "@/components/OTP";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useLearnerDetails,
  useUpdateScheduleStatus,
  useVerifyOtp,
} from "@/queries/instructor";

const SuccessAnimation = () => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <div className="relative">
      <div className="absolute inset-0 animate-[ping_1s_ease-in-out_1] rounded-full bg-[#00CE84]/30" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#00CE84] transition-transform hover:scale-105">
        <Check className="h-8 w-8 text-white" />
      </div>
    </div>
    <p className="text-center text-xl font-medium text-[#00CE84]">
      Please start teaching...
    </p>
  </div>
);

const CountdownRedirect = ({ onComplete }: { onComplete: () => void }) => {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      onComplete();
    }
  }, [countdown, onComplete]);

  return (
    <div className="mt-4 text-center text-sm text-gray-500">
      Redirecting in {countdown} seconds...
    </div>
  );
};

const OTPVerification = () => {
  const { learnerId, scheduleId } = useParams();
  const [otp, setOTP] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  const { data: learnerData, isLoading: isLoadingLearner } =
    useLearnerDetails(learnerId);
  const { mutate: updateStatus } = useUpdateScheduleStatus();

  const {
    data: verificationData,
    isLoading: isLoadingVerification,
    error,
  } = useVerifyOtp({
    scheduleId,
    otp,
    enabled: otp.length === 6,
  });

  const handleOtpInputChange = (event) => {
    const value = event.target.value;
    
    // 1. Filter: Only allow digits
    const numericValue = value.replace(/\D/g, '');

    // 2. Limit: Enforce the maximum length
    const finalOtp = numericValue.slice(0, 6);

    setOTP(finalOtp);
    // console.log("otp set to ", finalOtp, otp);
  };

  const handleSubmit = () => {
    if (verificationData?.isValid && scheduleId) {
      updateStatus(
        {
          scheduleId,
          status: "ongoing",
          started_at: `${String(new Date().getDate()).padStart(2, '0')}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${new Date().getFullYear()} ${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}:${String(new Date().getSeconds()).padStart(2, '0')}`,
          ended_at: "",
        },
        {
          onSuccess: () => {
            setShowSuccess(true);
          },
        },
      );
    }
  };

  if (isLoadingLearner || isLoadingVerification) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00CE84] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-center text-red-500">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full max-h-[1000px] w-full overflow-hidden bg-white">
      <div className="relative w-full bg-gradient-to-b from-[#E8FFF5] to-white">
        {!showSuccess && (
          <div className="absolute left-4 top-4">
            <Button
              variant="ghost"
              className="gap-2 text-[#00CE84] hover:bg-[#E8FFF5]"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        )}

        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-md space-y-6 sm:space-y-8">
            {showSuccess ? (
              <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
                <SuccessAnimation />
                <CountdownRedirect onComplete={() => navigate("/")} />
              </div>
            ) : (
              <>
                <div className="text-center">
                  <h1 className="bg-gradient-to-r from-[#00CE84] to-[#04A76C] bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
                    Verify OTP
                  </h1>
                  {/* <p className="mt-2 text-sm text-gray-600 sm:text-base">
                    Schedule {scheduleId}
                  </p> */}
                </div>

                {learnerData && (
                  <Card className="overflow-hidden border-none bg-white shadow-lg">
                    <CardContent className="p-4 sm:p-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8FFF5]">
                            <User className="h-4 w-4 text-[#00CE84]" />
                          </div>
                          <span className="text-sm font-medium sm:text-base">
                            {learnerData.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8FFF5]">
                            <Phone className="h-4 w-4 text-[#00CE84]" />
                          </div>
                          <span className="text-sm font-medium sm:text-base">
                            {learnerData.phone}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8FFF5]">
                            <MapPin className="h-4 w-4 text-[#00CE84]" />
                          </div>
                          <span className="break-words text-sm font-medium sm:text-base">
                            {learnerData.pick_up_location}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-6">
                  <div className="flex flex-col items-center space-y-4">
                    <p className="text-center text-sm text-gray-600 sm:text-base">
                      Enter the 6-digit code to start teaching
                    </p>

                    <div className="w-full max-w-xs sm:max-w-md">
                      {/* {console.log("Re-rendering input");} */}
                      <input
                        type="tel" // Use 'tel' for better mobile keyboard experience (numeric)
                        value={otp}
                        onChange={handleOtpInputChange}
                        maxLength={6}
                        pattern="\d{6}" // HTML5 validation hint
                        className="border border-gray-300 rounded-lg p-3 text-2xl tracking-widest text-center"
                        placeholder="Enter 6-digit code"
                        style={{ width: '100%', letterSpacing: '20px' }} // Custom styling for wide spacing
                      />
                    </div>

                    {verificationData?.isValid === false && (
                      <p className="animate-shake text-sm text-red-500 sm:text-base">
                        ❌ Incorrect OTP, Please try again!
                      </p>
                    )}
                  </div>

                  <Button
                    className="w-full bg-[#00CE84] text-sm transition-all hover:scale-[1.02] hover:bg-[#04A76C] disabled:bg-gray-300 sm:text-base"
                    onClick={handleSubmit}
                    disabled={otp.length !== 6 || isLoadingVerification}
                  >
                    {isLoadingVerification ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      "Verify & Start"
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
