import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

import { StepProps } from "../types";

const CONTRACT_TERMS = `
INSTRUCTOR AGREEMENT

This Agreement is made between Inlane Driving School (hereinafter referred to as "Company") and the Instructor (hereinafter referred to as "Instructor").

1. SERVICES
The Instructor agrees to provide driving instruction services to learners assigned by the Company. The Instructor shall conduct lessons professionally and in accordance with the Company's standards and guidelines.

2. SCHEDULE & AVAILABILITY
- The Instructor agrees to maintain accurate availability in the Company's system.
- The Instructor will honor all confirmed lesson bookings.
- Cancellations must be communicated at least 24 hours in advance, except in emergencies.

3. VEHICLE REQUIREMENTS
- The Instructor shall use only the registered vehicle for lessons.
- The vehicle must be properly maintained, insured, and meet all legal requirements.
- The Instructor is responsible for ensuring the vehicle has dual controls and safety features.

4. CONDUCT & PROFESSIONALISM
- The Instructor shall maintain professional conduct at all times.
- The Instructor shall not discriminate against any learner.
- The Instructor shall ensure the safety and comfort of all learners.
- The Instructor shall not engage in any behavior that could harm the Company's reputation.

5. CONFIDENTIALITY
The Instructor agrees to keep all learner information confidential and not share it with third parties without consent.

6. PAYMENT TERMS
- Payment for services will be processed according to the Company's payment schedule.
- The Instructor agrees to the payment rates as communicated by the Company.

7. COMPLIANCE
- The Instructor shall comply with all traffic laws and regulations.
- The Instructor shall maintain a valid driving license at all times.
- The Instructor shall immediately report any incidents or accidents.

8. TERMINATION
Either party may terminate this agreement with appropriate notice as per Company policy.

9. AMENDMENTS
The Company reserves the right to amend these terms with reasonable notice.

By accepting this agreement, the Instructor acknowledges having read, understood, and agreed to all terms and conditions stated herein.
`;

export function ContractStep({ data, updateData }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold">Terms & Agreement</h2>
        <p className="text-muted-foreground">
          Review and accept the instructor agreement
        </p>
      </div>

      {/* Contract Text */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[350px] p-4">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {CONTRACT_TERMS}
              </pre>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Accept Checkbox */}
      <div className="flex items-start space-x-3 rounded-lg border bg-muted/30 p-4">
        <Checkbox
          id="accept-contract"
          checked={data.contractAccepted}
          onCheckedChange={(checked) =>
            updateData({ contractAccepted: !!checked })
          }
        />
        <div className="space-y-1">
          <Label
            htmlFor="accept-contract"
            className="cursor-pointer font-medium"
          >
            I have read and accept the terms and conditions
            <span className="text-red-500"> *</span>
          </Label>
          <p className="text-sm text-muted-foreground">
            By checking this box, you confirm that the instructor has reviewed
            and agreed to the terms of this agreement.
          </p>
        </div>
      </div>

      {!data.contractAccepted && (
        <p className="text-center text-sm text-amber-600">
          You must accept the terms to proceed
        </p>
      )}
    </div>
  );
}
