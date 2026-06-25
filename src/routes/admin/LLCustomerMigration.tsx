import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { downloadCSV } from "@/queries/lessonsDashboard";
import {
  analyzeLLRows,
  buildEnrollmentInsert,
  buildLearnerInsert,
  buildPaymentInsert,
  buildTemplateCsv,
  parseCsv,
  ParsedLLRow,
} from "@/utils/llMigrationCsv";

type RowStatus = "valid" | "duplicate" | "invalid";

interface ImportResult {
  created: number;
  failed: number;
  errors: string[];
}

export default function LLCustomerMigration() {
  const { toast } = useToast();
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedLLRow[]>([]);
  const [duplicates, setDuplicates] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const statusOf = (r: ParsedLLRow): RowStatus =>
    r.errors.length > 0
      ? "invalid"
      : duplicates.has(r.phone)
        ? "duplicate"
        : "valid";

  const counts = useMemo(() => {
    const c = { valid: 0, duplicate: 0, invalid: 0 };
    for (const r of rows) c[statusOf(r)]++;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, duplicates]);

  const handleTemplate = () =>
    downloadCSV("ll_customer_migration_template.csv", buildTemplateCsv());

  const handleFile = async (file: File) => {
    setResult(null);
    setAnalyzing(true);
    try {
      const text = await file.text();
      const { rows: parsed } = analyzeLLRows(parseCsv(text));
      // Flag rows whose phone already exists (skip-duplicates).
      const phones = Array.from(
        new Set(parsed.map((r) => r.phone).filter(Boolean)),
      );
      const dupes = new Set<string>();
      if (phones.length) {
        const { data } = await supabase
          .from("Learner")
          .select("phone")
          .in("phone", phones);
        for (const d of data ?? []) if (d.phone) dupes.add(d.phone);
      }
      setFileName(file.name);
      setRows(parsed);
      setDuplicates(dupes);
    } catch (e) {
      toast({
        title: "Couldn't read the file",
        description: e instanceof Error ? e.message : "Please check the CSV.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImport = async () => {
    const validRows = rows.filter((r) => statusOf(r) === "valid");
    if (validRows.length === 0) return;
    setImporting(true);
    const res: ImportResult = { created: 0, failed: 0, errors: [] };
    const importedPhones = new Set(duplicates);

    for (const r of validRows) {
      try {
        const { data: learner, error: e1 } = await supabase
          .from("Learner")
          .insert(buildLearnerInsert(r) as never)
          .select("id")
          .single();
        if (e1 || !learner) throw e1 ?? new Error("Learner insert failed");
        const learnerId = (learner as { id: string }).id;

        if (r.courseId) {
          const { data: payment } = await supabase
            .from("payment")
            .insert(buildPaymentInsert(r, learnerId) as never)
            .select("id")
            .single();
          const paymentId = (payment as { id: string } | null)?.id ?? null;
          const { error: e3 } = await supabase
            .from("enrollment")
            .insert(buildEnrollmentInsert(r, learnerId, paymentId) as never);
          if (e3) throw e3;
        }
        res.created++;
        importedPhones.add(r.phone);
      } catch (err) {
        res.failed++;
        res.errors.push(
          `Row ${r.rowNumber} (${r.name || r.phone}): ${
            err instanceof Error ? err.message : "failed"
          }`,
        );
      }
    }

    setDuplicates(importedPhones); // imported rows now read as duplicates
    setResult(res);
    setImporting(false);
    toast({
      title: `Imported ${res.created} customer${res.created === 1 ? "" : "s"}`,
      description: res.failed ? `${res.failed} failed — see details.` : undefined,
      variant: res.failed ? "destructive" : undefined,
    });
  };

  const STATUS_BADGE: Record<RowStatus, string> = {
    valid: "border-emerald-200 bg-emerald-50 text-emerald-700",
    duplicate: "border-amber-200 bg-amber-50 text-amber-700",
    invalid: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                LL Customer Migration
              </h1>
              <p className="text-sm text-muted-foreground">
                Bulk-import existing Learner&apos;s License customers from a CSV.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleTemplate}>
            <Download className="mr-1 h-4 w-4" />
            Download template
          </Button>
        </div>

        {/* Upload */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm hover:bg-muted/40">
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {fileName ?? "Choose CSV file"}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Columns: name, phone (required), email, area, pick_up_location,
              ll_stage, ll_application_id, ll_received_date, has_a_dl, course,
              total_amount, amount_paid…
            </p>
          </CardContent>
        </Card>

        {/* Summary + import */}
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className={STATUS_BADGE.valid}>
              {counts.valid} ready
            </Badge>
            <Badge variant="outline" className={STATUS_BADGE.duplicate}>
              {counts.duplicate} duplicate (skipped)
            </Badge>
            <Badge variant="outline" className={STATUS_BADGE.invalid}>
              {counts.invalid} invalid
            </Badge>
            <Button
              size="sm"
              className="ml-auto"
              disabled={importing || counts.valid === 0}
              onClick={handleImport}
            >
              {importing ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1 h-4 w-4" />
              )}
              Import {counts.valid} customer{counts.valid === 1 ? "" : "s"}
            </Button>
          </div>
        )}

        {/* Result */}
        {result && (
          <Card className={result.failed ? "border-amber-300" : "border-emerald-300"}>
            <CardContent className="space-y-1 p-4 text-sm">
              <div className="font-medium">
                ✅ Created {result.created} · ⚠ {result.failed} failed
              </div>
              {result.errors.length > 0 && (
                <ul className="list-inside list-disc text-xs text-red-600">
                  {result.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Preview table */}
        {rows.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <ScrollArea>
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <tr className="[&>th]:p-2 [&>th]:text-left">
                      <th>#</th>
                      <th>Status</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>LL stage</th>
                      <th>Course</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const s = statusOf(r);
                      return (
                        <tr key={r.rowNumber} className="border-b [&>td]:p-2">
                          <td className="text-muted-foreground">{r.rowNumber}</td>
                          <td>
                            <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[s]}`}>
                              {s === "duplicate" ? "duplicate" : s}
                            </Badge>
                          </td>
                          <td className="font-medium">{r.name || "—"}</td>
                          <td className="tabular-nums">{r.phone || "—"}</td>
                          <td>{r.stage}</td>
                          <td>{r.courseLabel ?? "—"}</td>
                          <td className="text-xs text-muted-foreground">
                            {s === "invalid" ? (
                              <span className="flex items-center gap-1 text-red-600">
                                <AlertTriangle className="h-3 w-3" />
                                {r.errors.join("; ")}
                              </span>
                            ) : s === "duplicate" ? (
                              "phone already exists"
                            ) : (
                              ""
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
