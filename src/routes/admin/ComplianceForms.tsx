import { ArrowLeft, ClipboardList } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import SheetFormsDialog from "@/components/admin/SheetFormsDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ComplianceForms() {
  const [formsOpen, setFormsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Button asChild variant="ghost">
          <Link to="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Forms</h1>
          <p className="mt-2 text-gray-600">
            Generate RTO Form 14, Form 15 and training certificates for
            customers.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Forms from Compliance Sheet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Paste customer rows from the sheet&apos;s &quot;Data dump for all
              forms&quot; tab. Match customers by phone number, then download
              their forms as a PDF or export the filled sheet as a CSV.
              Customers without a matching learner record can use their sheet
              details.
            </p>
            <Button onClick={() => setFormsOpen(true)}>
              <ClipboardList className="mr-2 h-4 w-4" />
              Generate Forms
            </Button>
          </CardContent>
        </Card>
      </div>
      <SheetFormsDialog open={formsOpen} onClose={() => setFormsOpen(false)} />
    </div>
  );
}
