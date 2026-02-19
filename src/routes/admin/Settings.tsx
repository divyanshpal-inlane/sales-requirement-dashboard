import {
  Check,
  CreditCard,
  Loader2,
  Settings as SettingsIcon,
} from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  PaymentGatewayMode,
  usePaymentGatewayMode,
  useUpdatePaymentGatewayMode,
} from "@/queries/appSettings";

type GatewayOption = {
  value: PaymentGatewayMode;
  label: string;
  description: string;
  icon: string;
};

const gatewayOptions: GatewayOption[] = [
  {
    value: "icici",
    label: "ICICI Bank Only",
    description: "All payments go through ICICI Bank (Orange PG)",
    icon: "ICICI",
  },
  {
    value: "razorpay",
    label: "Razorpay Only",
    description: "All payments go through Razorpay",
    icon: "R",
  },
  {
    value: "both",
    label: "Both (User Choice)",
    description: "Users can choose their preferred payment gateway",
    icon: "Both",
  },
];

export default function AdminSettings() {
  const { data: currentMode, isLoading } = usePaymentGatewayMode();
  const updateMode = useUpdatePaymentGatewayMode();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleModeChange = async (mode: PaymentGatewayMode) => {
    try {
      await updateMode.mutateAsync(mode);
      setSuccessMessage(
        `Payment gateway changed to: ${gatewayOptions.find((o) => o.value === mode)?.label}`,
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Failed to update payment gateway mode:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-white p-8"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-gray-700" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Admin Settings
              </h1>
              <p className="mt-1 text-muted-foreground">
                Configure application-wide settings
              </p>
            </div>
          </div>
        </div>

        {successMessage && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {updateMode.isError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              Failed to update setting. Please try again.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Payment Gateway</CardTitle>
                <CardDescription>
                  Choose which payment gateway(s) are available to users
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                Active Payment Gateway
              </Label>
              <div className="grid gap-3">
                {gatewayOptions.map((option) => {
                  const isSelected = currentMode === option.value;
                  const isUpdating = updateMode.isPending;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleModeChange(option.value)}
                      className={`flex w-full items-center justify-between rounded-lg border-2 p-4 text-left transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                      } ${isUpdating ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                            option.value === "icici"
                              ? "bg-orange-100"
                              : option.value === "razorpay"
                                ? "bg-blue-100"
                                : "bg-purple-100"
                          }`}
                        >
                          <span
                            className={`text-sm font-bold ${
                              option.value === "icici"
                                ? "text-orange-600"
                                : option.value === "razorpay"
                                  ? "text-blue-600"
                                  : "text-purple-600"
                            }`}
                          >
                            {option.icon}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{option.label}</p>
                          <p className="text-sm text-gray-500">
                            {option.description}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                          isSelected
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && <Check className="h-4 w-4 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">
                  <strong>Current Status:</strong>{" "}
                  {currentMode === "icici" && (
                    <span className="text-orange-600">
                      Only ICICI Bank payments are active
                    </span>
                  )}
                  {currentMode === "razorpay" && (
                    <span className="text-blue-600">
                      Only Razorpay payments are active
                    </span>
                  )}
                  {currentMode === "both" && (
                    <span className="text-purple-600">
                      Users can choose between ICICI Bank and Razorpay
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
