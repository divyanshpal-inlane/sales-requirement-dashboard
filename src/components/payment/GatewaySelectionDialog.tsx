import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type PaymentGateway = "icici" | "razorpay";

interface GatewaySelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectGateway: (gateway: PaymentGateway) => void;
  amount: number;
}

export function GatewaySelectionDialog({
  open,
  onOpenChange,
  onSelectGateway,
  amount,
}: GatewaySelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Payment Method</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Select your preferred payment gateway to pay{" "}
            <span className="font-semibold text-foreground">
              ₹{amount.toLocaleString("en-IN")}
            </span>
          </p>
          <div className="space-y-3">
            {/* ICICI Bank Option */}
            <button
              type="button"
              onClick={() => onSelectGateway("icici")}
              className="flex w-full items-center justify-between rounded-lg border-2 border-gray-200 p-4 transition-all hover:border-blue-500 hover:bg-blue-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                  <span className="text-lg font-bold text-orange-600">
                    ICICI
                  </span>
                </div>
                <div className="text-left">
                  <p className="font-medium">ICICI Bank</p>
                  <p className="text-xs text-gray-500">
                    Credit/Debit Card, Net Banking, UPI
                  </p>
                </div>
              </div>
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Razorpay Option */}
            <button
              type="button"
              onClick={() => onSelectGateway("razorpay")}
              className="flex w-full items-center justify-between rounded-lg border-2 border-gray-200 p-4 transition-all hover:border-blue-500 hover:bg-blue-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <span className="text-lg font-bold text-blue-600">R</span>
                </div>
                <div className="text-left">
                  <p className="font-medium">Razorpay</p>
                  <p className="text-xs text-gray-500">
                    Cards, UPI, Wallets, Net Banking
                  </p>
                </div>
              </div>
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
