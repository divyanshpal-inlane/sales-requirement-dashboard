import { CheckCircle2, FileUp, Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  LL_DOC_TYPES,
  LL_FORM_FIELDS,
  llDocFileKey,
  llDocSlotsFor,
  llStageLabel,
} from "@/constants/llPipeline";
import { useLearner } from "@/queries/learner";
import { LLDocument } from "@/queries/llApplications";
import {
  LLDocumentUpload,
  useMyLLApplication,
  useSubmitLLApplication,
} from "@/queries/llCustomer";

const MAX_FILE_MB = 10;

/**
 * Native LL application form (WAI-75) — replaces the Google Form redirect.
 * Handles both first submission and resubmission after the RTO team rejects
 * one or more documents. Supports multi-slot uploads (ID front/back,
 * rental agreement + bill, etc.).
 */
export default function LLApplicationForm({ onDone }: { onDone?: () => void }) {
  const { toast } = useToast();
  const { data: learner } = useLearner();
  const { data: mine, isLoading } = useMyLLApplication(learner?.id);
  const submitMutation = useSubmitLLApplication();
  const [submitted, setSubmitted] = useState(false);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  /** Keyed by `${docType}:${slot}` */
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [subtypes, setSubtypes] = useState<Record<string, string>>({});
  const prefilled = useRef(false);

  const application = mine?.application ?? null;
  const docsBySlot: Record<string, LLDocument> = {};
  for (const d of mine?.documents ?? []) {
    const slot = d.doc_slot || "primary";
    docsBySlot[llDocFileKey(d.doc_type, slot)] = d;
  }

  useEffect(() => {
    if (prefilled.current || !learner || isLoading) return;
    prefilled.current = true;
    setAnswers({
      full_name: learner.name ?? "",
      email: learner.email ?? "",
      phone: learner.phone ?? "",
      date_of_birth: learner.dob ?? "",
      ...(application?.form_data ?? {}),
    });
    const initialSubtypes: Record<string, string> = {};
    for (const d of mine?.documents ?? [])
      if (d.doc_subtype) initialSubtypes[d.doc_type] = d.doc_subtype;
    setSubtypes(initialSubtypes);
  }, [learner, isLoading, application, mine]);

  if (!learner || isLoading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );

  const isResubmission = application?.status === "docs_rejected";

  if (submitted)
    return (
      <Card className="mx-auto mt-4 max-w-2xl">
        <CardHeader className="rounded-t-xl bg-primary text-white">
          <CardTitle className="text-2xl font-bold">
            Application Submitted 🎉
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <p className="text-base">
            Your details and documents are now{" "}
            <span className="font-semibold">under review</span> by our RTO team.
            We&apos;ll notify you if anything needs a fix — next up, book your
            OTP verification appointment.
          </p>
          <Button className="w-full py-3 text-lg" onClick={onDone}>
            Continue
          </Button>
        </CardContent>
      </Card>
    );

  const setAnswer = (key: string, value: string) =>
    setAnswers((p) => ({ ...p, [key]: value }));

  const pickFile = (fileKey: string, file: File | null) => {
    if (file && file.size > MAX_FILE_MB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Please keep files under ${MAX_FILE_MB} MB.`,
        variant: "destructive",
      });
      return;
    }
    setFiles((p) => ({ ...p, [fileKey]: file }));
  };

  const setSubtype = (docType: string, value: string) => {
    setSubtypes((p) => ({ ...p, [docType]: value }));
    // Clear file picks for slots that no longer apply after a subtype change
    // (e.g. dual → single address proof drops the secondary upload).
    const def = LL_DOC_TYPES.find((d) => d.key === docType);
    if (!def) return;
    const nextSlots = new Set(
      llDocSlotsFor(def, value).map((s) => llDocFileKey(docType, s.key)),
    );
    setFiles((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${docType}:`) && !nextSlots.has(key)) {
          delete next[key];
        }
      }
      return next;
    });
  };

  const handleSubmit = () => {
    const missing: string[] = [];
    for (const f of LL_FORM_FIELDS)
      if (f.required && !answers[f.key]?.trim()) missing.push(f.label);

    for (const d of LL_DOC_TYPES) {
      const subtype = subtypes[d.key];
      if (d.required && d.subtypes.length > 0 && !subtype) {
        missing.push(`${d.label} — pick the document type`);
        continue;
      }
      const slots = llDocSlotsFor(d, subtype);
      for (const slot of slots) {
        const fileKey = llDocFileKey(d.key, slot.key);
        const existing = docsBySlot[fileKey];
        const hasValidExisting = existing && existing.status !== "rejected";
        const hasNewFile = !!files[fileKey];
        if (d.required && !hasValidExisting && !hasNewFile) {
          const slotSuffix =
            slots.length > 1 || slot.key !== "primary"
              ? ` — ${slot.label}`
              : "";
          missing.push(`${d.label}${slotSuffix}`);
        }
      }
    }

    if (missing.length > 0) {
      toast({
        title: "Almost there",
        description: `Please complete: ${missing.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const uploads: LLDocumentUpload[] = Object.entries(files)
      .filter((e): e is [string, File] => !!e[1])
      .map(([fileKey, file]) => {
        const [docType, docSlot] = fileKey.split(":");
        return {
          docType,
          docSlot: docSlot || "primary",
          subtype: subtypes[docType] ?? null,
          file,
        };
      });

    submitMutation.mutate(
      {
        learnerId: learner.id,
        learnerName: learner.name,
        formData: answers,
        uploads,
      },
      {
        onSuccess: () => setSubmitted(true),
        onError: (e: Error) =>
          toast({
            title: "Submission failed",
            description: e.message,
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-8">
      {isResubmission && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Some documents need a fix</AlertTitle>
          <AlertDescription>
            {application?.rejection_reason ||
              "The RTO team rejected one or more documents. Please re-upload the ones marked below and resubmit."}
          </AlertDescription>
        </Alert>
      )}

      <Card className="mt-4">
        <CardHeader className="rounded-t-xl bg-primary text-white">
          <CardTitle className="text-xl font-bold">
            LL Application — Your Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          {LL_FORM_FIELDS.map((f) => (
            <div
              key={f.key}
              className={f.key === "address" ? "sm:col-span-2" : ""}
            >
              <Label className="mb-1 block text-sm">
                {f.label}
                {f.required && <span className="text-red-500"> *</span>}
              </Label>
              {f.type === "select" ? (
                <Select
                  value={answers[f.key] || undefined}
                  onValueChange={(v) => setAnswer(f.key, v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(f.options ?? []).map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.key === "address" ? (
                <Textarea
                  value={answers[f.key] ?? ""}
                  onChange={(e) => setAnswer(f.key, e.target.value)}
                  className="h-20"
                />
              ) : (
                <Input
                  type={f.type === "date" ? "date" : "text"}
                  value={answers[f.key] ?? ""}
                  onChange={(e) => setAnswer(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="rounded-t-xl bg-primary text-white">
          <CardTitle className="text-xl font-bold">Your Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {LL_DOC_TYPES.map((d) => {
            const subtype = subtypes[d.key];
            const slots = llDocSlotsFor(d, subtype);
            const anyRejected = slots.some((slot) => {
              const existing = docsBySlot[llDocFileKey(d.key, slot.key)];
              return (
                existing?.status === "rejected" &&
                !files[llDocFileKey(d.key, slot.key)]
              );
            });

            return (
              <div key={d.key} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-medium">
                    {d.label}
                    {d.required && <span className="text-red-500"> *</span>}
                  </Label>
                </div>
                {d.hint && (
                  <p className="mt-0.5 text-xs text-gray-500">{d.hint}</p>
                )}
                {anyRejected && (
                  <p className="mt-1 text-xs text-red-600">
                    One or more files were rejected — please re-upload the ones
                    marked below.
                  </p>
                )}

                {d.subtypes.length > 0 && (
                  <div className="mt-2">
                    <Select
                      value={subtype || undefined}
                      onValueChange={(v) => setSubtype(d.key, v)}
                    >
                      <SelectTrigger className="sm:w-72">
                        <SelectValue placeholder="Which document?" />
                      </SelectTrigger>
                      <SelectContent>
                        {d.subtypes.map((s) => (
                          <SelectItem key={s.key} value={s.key}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="mt-2 space-y-2">
                  {slots.map((slot) => {
                    const fileKey = llDocFileKey(d.key, slot.key);
                    const existing = docsBySlot[fileKey];
                    const newFile = files[fileKey];
                    const showSlotLabel =
                      slots.length > 1 || slot.key !== "primary";
                    return (
                      <div key={slot.key} className="space-y-1">
                        {showSlotLabel && (
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-gray-600">
                              {slot.label}
                            </p>
                            {existing && !newFile && (
                              <DocStatusBadge status={existing.status} />
                            )}
                          </div>
                        )}
                        {!showSlotLabel && existing && !newFile && (
                          <div className="flex justify-end">
                            <DocStatusBadge status={existing.status} />
                          </div>
                        )}
                        {existing?.status === "rejected" && !newFile && (
                          <p className="text-xs text-red-600">
                            Rejected
                            {existing.rejection_reason
                              ? `: ${existing.rejection_reason}`
                              : ""}{" "}
                            — please upload a new file.
                          </p>
                        )}
                        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                          <FileUp className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {newFile
                              ? newFile.name
                              : existing && existing.status !== "rejected"
                                ? `Uploaded: ${existing.file_name ?? "document"} (tap to replace)`
                                : `Upload ${showSlotLabel ? slot.label.toLowerCase() : "photo or PDF"}`}
                          </span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) =>
                              pickFile(fileKey, e.target.files?.[0] ?? null)
                            }
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {application && !isResubmission && application.form_submitted_at && (
        <p className="text-center text-xs text-gray-500">
          Current status: {llStageLabel(application.status)}
        </p>
      )}

      <div className="sticky bottom-0 border-t bg-white py-3">
        <Button
          className="w-full py-3 text-lg"
          disabled={submitMutation.isPending}
          onClick={handleSubmit}
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Submitting…
            </>
          ) : isResubmission ? (
            "Resubmit Application"
          ) : (
            "Submit Application"
          )}
        </Button>
      </div>
    </div>
  );
}

function DocStatusBadge({ status }: { status: LLDocument["status"] }) {
  if (status === "approved")
    return (
      <Badge
        className="border-green-300 bg-green-50 text-green-700"
        variant="outline"
      >
        <CheckCircle2 className="mr-1 h-3 w-3" /> Approved
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge
        className="border-red-300 bg-red-50 text-red-700"
        variant="outline"
      >
        <XCircle className="mr-1 h-3 w-3" /> Rejected
      </Badge>
    );
  return (
    <Badge
      className="border-blue-200 bg-blue-50 text-blue-700"
      variant="outline"
    >
      Under review
    </Badge>
  );
}
