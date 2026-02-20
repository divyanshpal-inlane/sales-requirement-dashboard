import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { StepProps } from "../types";

export function BasicInfoStep({ data, updateData }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold">Basic Information</h2>
        <p className="text-muted-foreground">
          Enter the instructor's personal details
        </p>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Full Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Enter full name"
            value={data.name}
            onChange={(e) => updateData({ name: e.target.value })}
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone Number <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-2">
            <div className="flex items-center justify-center rounded-md border bg-muted px-3 text-sm">
              +91
            </div>
            <Input
              id="phone"
              type="tel"
              placeholder="10-digit phone number"
              value={data.phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                updateData({ phone: value });
              }}
              maxLength={10}
            />
          </div>
          {data.phone && data.phone.length !== 10 && (
            <p className="text-sm text-red-500">
              Phone number must be exactly 10 digits
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email (Optional)</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter email address"
            value={data.email}
            onChange={(e) => updateData({ email: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
