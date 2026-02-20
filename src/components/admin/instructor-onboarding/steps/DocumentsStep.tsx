import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { IdProofType, StepProps } from "../types";

const ID_PROOF_TYPES: { value: IdProofType; label: string }[] = [
  { value: "aadhar", label: "Aadhar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "voter_id", label: "Voter ID" },
  { value: "passport", label: "Passport" },
];

export function DocumentsStep({ data, updateData }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold">Documents</h2>
        <p className="text-muted-foreground">
          Enter the instructor's document details
        </p>
      </div>

      <div className="space-y-4">
        {/* Driver's License */}
        <div className="space-y-2">
          <Label htmlFor="dl_number">Driver's License Number</Label>
          <Input
            id="dl_number"
            placeholder="Enter DL number"
            value={data.DL_number}
            onChange={(e) =>
              updateData({ DL_number: e.target.value.toUpperCase() })
            }
          />
        </div>

        {/* ID Proof Type */}
        <div className="space-y-2">
          <Label htmlFor="id_proof_type">ID Proof Type</Label>
          <Select
            value={data.id_proof_type || ""}
            onValueChange={(value) =>
              updateData({ id_proof_type: value as IdProofType })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select ID proof type" />
            </SelectTrigger>
            <SelectContent>
              {ID_PROOF_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ID Proof Number */}
        <div className="space-y-2">
          <Label htmlFor="id_proof_number">
            ID Proof Number
            {data.id_proof_type && <span className="text-red-500"> *</span>}
          </Label>
          <Input
            id="id_proof_number"
            placeholder={
              data.id_proof_type
                ? `Enter ${ID_PROOF_TYPES.find((t) => t.value === data.id_proof_type)?.label} number`
                : "Enter ID proof number"
            }
            value={data.id_proof_number}
            onChange={(e) =>
              updateData({ id_proof_number: e.target.value.toUpperCase() })
            }
          />
          {data.id_proof_type && !data.id_proof_number && (
            <p className="text-sm text-amber-600">
              ID proof number is required when type is selected
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
