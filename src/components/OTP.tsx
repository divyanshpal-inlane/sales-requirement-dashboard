import React, { useRef, useState } from "react";

interface OTPInputProps {
  length: number;
  onChange: (otp: string) => void;
}

export const OTPInput: React.FC<OTPInputProps> = ({ length, onChange }) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(""));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (element.value.length > 1) {
      // If someone pastes multiple numbers, only take the first one
      element.value = element.value[0];
    }

    const value = element.value.replace(/[^0-9]/g, ""); // Only allow digits
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    onChange(newOtp.join(""));

    // Focus the next input
    if (value && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    // Prevent form submission on enter key
    if (e.key === "Enter") {
      e.preventDefault();
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault(); // Prevent default backspace behavior
      const newOtp = [...otp];
      if (otp[index] === "" && index > 0) {
        // Move to the previous input if current is empty
        newOtp[index - 1] = "";
        setOtp(newOtp);
        onChange(newOtp.join(""));
        inputsRef.current[index - 1]?.focus();
      } else {
        // Clear the current input
        newOtp[index] = "";
        setOtp(newOtp);
        onChange(newOtp.join(""));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").slice(0, length);
    const digits = pastedData.replace(/[^0-9]/g, "").split("");

    const newOtp = [...otp];
    digits.forEach((digit, index) => {
      if (index < length) {
        newOtp[index] = digit;
      }
    });

    setOtp(newOtp);
    onChange(newOtp.join(""));

    // Focus the next empty input or the last input
    const nextEmptyIndex = newOtp.findIndex((val) => val === "");
    const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex;
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    // Wrap inputs in a form-preventing div
    <div
      onSubmit={(e) => e.preventDefault()}
      className="flex justify-center space-x-2"
    >
      {Array(length)
        .fill(0)
        .map((_, index) => (
          <input
            key={index}
            type="text"
            inputMode="numeric"
            maxLength={1}
            className="h-12 w-12 rounded border border-gray-300 text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={otp[index]}
            onChange={(e) => handleChange(e.target, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            ref={(el) => (inputsRef.current[index] = el)}
            // Prevent form submission on enter
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
              }
            }}
          />
        ))}
    </div>
  );
};
