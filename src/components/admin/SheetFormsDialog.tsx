import { format } from "date-fns";
import { Download, Loader2, Sheet, Users } from "lucide-react";
import React, { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  buildDataDumpCSV,
  downloadCSV,
  fetchTrainingPeriods,
  FormsEntry,
  generateAllFormsMergedPDF,
  matchLearnersByPhone,
  parseSheetCustomers,
  SheetCustomer,
} from "@/utils/formsBulk";
import { downloadPDF } from "@/utils/generateForm14";

interface SheetFormsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface MatchedRow {
  customer: SheetCustomer;
  entry: FormsEntry;
  matched: boolean;
}

/**
 * Paste customer rows from the compliance sheet's "Data dump for all forms"
 * tab; customers are matched to Learner rows by phone, backend fields
 * (residing at, serial no., first/last class) are pulled from the DB, and the
 * three RTO forms plus the filled sheet CSV are generated for all of them.
 */
export default function SheetFormsDialog({
  open,
  onClose,
}: SheetFormsDialogProps) {
  const { toast } = useToast();
  const [pasted, setPasted] = useState("");
  const [rows, setRows] = useState<MatchedRow[] | null>(null);
  const [busy, setBusy] = useState<null | "match" | "pdf" | "csv">(null);
  const [progress, setProgress] = useState("");

  const reset = () => {
    setPasted("");
    setRows(null);
    setBusy(null);
    setProgress("");
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const handleMatch = async () => {
    const { customers, skipped } = parseSheetCustomers(pasted);
    if (!customers.length) {
      toast({
        title: "No customers found",
        description:
          "Paste rows copied from the sheet — each row needs at least a name and a 10-digit phone number.",
        variant: "destructive",
      });
      return;
    }
    setBusy("match");
    try {
      const learnersByPhone = await matchLearnersByPhone(
        customers.map((c) => c.phone),
      );
      const matchedIds = customers
        .map((c) => learnersByPhone.get(c.phone)?.id)
        .filter(Boolean) as string[];
      const periods = await fetchTrainingPeriods(matchedIds);

      setRows(
        customers.map((customer) => {
          const learner = learnersByPhone.get(customer.phone);
          return {
            customer,
            matched: !!learner,
            entry: {
              // Unmatched customers still get forms from sheet data alone.
              learner: learner ?? {
                id: "",
                name: customer.name,
                phone: customer.phone,
              },
              period: learner ? periods.get(learner.id) : undefined,
              overrides: {
                name: customer.name,
                email: customer.email,
                dob: customer.dob,
                guardian: customer.guardian,
                enrolledOn: customer.enrolledOn,
                certDate: customer.certDate,
              },
            },
          };
        }),
      );
      if (skipped > 0) {
        toast({
          title: "Some lines skipped",
          description: `${skipped} line(s) had no valid phone number (headers are skipped automatically).`,
        });
      }
    } catch (error) {
      console.error("Error matching sheet customers:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to match customers",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const handlePDF = async () => {
    if (!rows?.length) return;
    setBusy("pdf");
    try {
      const pdfBytes = await generateAllFormsMergedPDF(
        rows.map((r) => r.entry),
        (done, total) => setProgress(`Generating ${done}/${total}...`),
      );
      downloadPDF(
        pdfBytes,
        `AllForms_Sheet_${format(new Date(), "yyyy-MM-dd")}.pdf`,
      );
      toast({
        title: "Success",
        description: `Form 14, 15 & Certificate generated for ${rows.length} customer(s).`,
      });
    } catch (error) {
      console.error("Error generating forms:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to generate forms",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
      setProgress("");
    }
  };

  const handleCSV = () => {
    if (!rows?.length) return;
    setBusy("csv");
    try {
      const csv = buildDataDumpCSV(rows.map((r) => r.entry));
      downloadCSV(
        csv,
        `DataDump_Filled_${format(new Date(), "yyyy-MM-dd")}.csv`,
      );
      toast({
        title: "Success",
        description: `Filled sheet exported for ${rows.length} customer(s).`,
      });
    } finally {
      setBusy(null);
    }
  };

  const matchedCount = rows?.filter((r) => r.matched).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sheet className="h-5 w-5 text-green-600" />
            Forms from Compliance Sheet
          </DialogTitle>
          <DialogDescription>
            Copy the customer rows from the sheet&apos;s &quot;Data dump for
            all forms&quot; tab and paste them below. Customers are matched to
            the database by phone number; residing at, serial no. and training
            period come from the backend.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <Textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={8}
            placeholder={
              "Paste rows here, e.g.\nBhavana V\t9901052130\tbhavana@gmail.com\t5/25/1996\tSagar Nagaraj"
            }
            className="font-mono text-xs"
          />
          <Button
            onClick={handleMatch}
            disabled={busy !== null || !pasted.trim()}
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
          >
            {busy === "match" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Users className="mr-2 h-4 w-4" />
            )}
            Match with database
          </Button>

          {rows && (
            <>
              <div className="text-sm text-gray-700">
                {rows.length} customer(s) — {matchedCount} matched,{" "}
                {rows.length - matchedCount} not found in DB (their forms use
                sheet data only).
              </div>
              <div className="max-h-56 overflow-y-auto rounded-lg border">
                {rows.map((row, i) => (
                  <div
                    key={`${row.customer.phone}-${i}`}
                    className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-b-0"
                  >
                    <div>
                      <span className="font-medium">
                        {row.customer.name || "(no name)"}
                      </span>
                      <span className="ml-2 text-gray-500">
                        {row.customer.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {row.entry.period?.first && (
                        <span className="text-xs text-gray-500">
                          {row.entry.period.first} → {row.entry.period.last}
                        </span>
                      )}
                      <Badge
                        className={
                          row.matched
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {row.matched ? "Matched" : "Not in DB"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex w-full gap-2">
            <Button
              onClick={handlePDF}
              disabled={busy !== null || !rows?.length}
              className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {busy === "pdf" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {busy === "pdf" && progress ? progress : "All Forms (PDF)"}
            </Button>
            <Button
              onClick={handleCSV}
              disabled={busy !== null || !rows?.length}
              className="flex-1 bg-green-600 text-white hover:bg-green-700"
            >
              {busy === "csv" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sheet className="mr-2 h-4 w-4" />
              )}
              Filled Sheet (CSV)
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={busy !== null}
            className="w-full"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
