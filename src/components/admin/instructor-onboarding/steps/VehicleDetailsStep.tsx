import { useEffect } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CarFuelType, CarMakeType, StepProps } from "../types";

const FUEL_TYPES: { value: CarFuelType; label: string }[] = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "ev", label: "Electric (EV)" },
  { value: "cng", label: "CNG" },
  { value: "lpg", label: "LPG" },
];

const CAR_MAKES: { value: CarMakeType; label: string }[] = [
  { value: "Manual", label: "Manual" },
  { value: "Automatic", label: "Automatic" },
];

export function VehicleDetailsStep({ data, updateData }: StepProps) {
  // Auto-set car_make to "Automatic" when EV is selected
  useEffect(() => {
    if (data.car_fuel_type === "ev" && data.car_make !== "Automatic") {
      updateData({ car_make: "Automatic" });
    }
  }, [data.car_fuel_type, data.car_make, updateData]);

  return (
    <div className="space-y-6">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold">Vehicle Details</h2>
        <p className="text-muted-foreground">
          Enter the instructor's vehicle information
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Fuel Type */}
        <div className="space-y-2">
          <Label htmlFor="car_fuel_type">
            Fuel Type <span className="text-red-500">*</span>
          </Label>
          <Select
            value={data.car_fuel_type || ""}
            onValueChange={(value) =>
              updateData({ car_fuel_type: value as CarFuelType })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select fuel type" />
            </SelectTrigger>
            <SelectContent>
              {FUEL_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Car Make (Transmission) */}
        <div className="space-y-2">
          <Label htmlFor="car_make">
            Transmission Type <span className="text-red-500">*</span>
          </Label>
          <Select
            value={data.car_make}
            onValueChange={(value) =>
              updateData({ car_make: value as CarMakeType })
            }
            disabled={data.car_fuel_type === "ev"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select transmission" />
            </SelectTrigger>
            <SelectContent>
              {CAR_MAKES.map((make) => (
                <SelectItem key={make.value} value={make.value}>
                  {make.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data.car_fuel_type === "ev" && (
            <p className="text-sm text-muted-foreground">
              EVs are always automatic
            </p>
          )}
        </div>

        {/* Car Model */}
        <div className="space-y-2">
          <Label htmlFor="car_mode">
            Car Model <span className="text-red-500">*</span>
          </Label>
          <Input
            id="car_mode"
            placeholder="e.g., Maruti Swift, Hyundai i20"
            value={data.car_mode}
            onChange={(e) => updateData({ car_mode: e.target.value })}
          />
        </div>

        {/* Car Number */}
        <div className="space-y-2">
          <Label htmlFor="car_number">
            Vehicle Registration Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="car_number"
            placeholder="e.g., KA01AB1234"
            value={data.car_number}
            onChange={(e) =>
              updateData({ car_number: e.target.value.toUpperCase() })
            }
          />
        </div>

        {/* Experience */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="experience">Years of Experience</Label>
          <Input
            id="experience"
            type="number"
            min={0}
            max={50}
            placeholder="Enter years of experience"
            value={data.experience || ""}
            onChange={(e) =>
              updateData({ experience: parseInt(e.target.value) || 0 })
            }
          />
        </div>
      </div>
    </div>
  );
}
