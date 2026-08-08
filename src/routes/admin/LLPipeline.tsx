import { addDays, format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import LLDocumentsReview from "@/components/admin/LLDocumentsReview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  isLLFailureStatus,
  LL_BATCHES,
  LL_FAILURE_STAGES,
  LL_PHASES,
  LL_SERVICES,
  LL_STAGE_MAP,
  LLPhaseKey,
  llStageLabel,
  llStagePhase,
} from "@/constants/llPipeline";
import {
  LLApplication,
  useCreateLLApplication,
  useLLApplications,
  useLLLearnerSearch,
  useLLPipelineEvents,
  useUpdateLLFields,
  useUpdateLLStatus,
} from "@/queries/llApplications";
import { useCurrentUser } from "@/queries/userManagement";

type QueueKey = "all" | LLPhaseKey | "escalations";

export default function LLPipeline() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: currentUser } = useCurrentUser();
  const actorName = currentUser?.name ?? null;

  const { data: applications, isLoading } = useLLApplications();
  const [queue, setQueue] = useState<QueueKey>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Date filter (feedback item 8): view entries created/updated in a range.
  const [dateField, setDateField] = useState<"created_at" | "updated_at">(
    "updated_at",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const updateStatus = useUpdateLLStatus();
  const updateFields = useUpdateLLFields();

  const filtered = useMemo(() => {
    let list = applications ?? [];
    if (queue === "escalations") {
      list = list.filter((a) => a.escalated || isLLFailureStatus(a.status));
    } else if (queue !== "all") {
      list = list.filter((a) => llStagePhase(a.status) === queue);
    }
    if (dateFrom) {
      list = list.filter((a) => a[dateField].slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((a) => a[dateField].slice(0, 10) <= dateTo);
    }
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (a) =>
          a.Learner?.name?.toLowerCase().includes(term) ||
          a.Learner?.phone?.includes(term) ||
          a.application_number?.toLowerCase().includes(term) ||
          a.ll_number?.toLowerCase().includes(term),
      );
    }
    return list;
  }, [applications, queue, searchTerm, dateField, dateFrom, dateTo]);

  const selected = filtered.find((a) => a.id === selectedId)
    ? ((applications ?? []).find((a) => a.id === selectedId) ?? null)
    : null;

  const queueCounts = useMemo(() => {
    const counts: Record<string, number> = { all: applications?.length ?? 0 };
    for (const p of LL_PHASES) counts[p.key] = 0;
    counts.escalations = 0;
    for (const a of applications ?? []) {
      counts[llStagePhase(a.status)] =
        (counts[llStagePhase(a.status)] ?? 0) + 1;
      if (a.escalated || isLLFailureStatus(a.status)) counts.escalations += 1;
    }
    return counts;
  }, [applications]);

  return (
    <div
      className="flex min-h-screen flex-col bg-white p-4"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="border-b bg-white px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">LL → DL Pipeline</h1>
          </div>
          <NewApplicationButton actorName={actorName} />
        </div>
      </div>

      {/* Queue tabs */}
      <div className="flex flex-wrap gap-1 border-b bg-white px-4 py-2">
        {[
          { key: "all" as QueueKey, label: "All" },
          ...LL_PHASES.map((p) => ({ key: p.key as QueueKey, label: p.label })),
          { key: "escalations" as QueueKey, label: "⚠ Escalations" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setQueue(t.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              queue === t.key
                ? t.key === "escalations"
                  ? "bg-red-600 text-white"
                  : "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {t.label} {queueCounts[t.key] ?? 0}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <Select
            value={dateField}
            onValueChange={(v) =>
              setDateField(v as "created_at" | "updated_at")
            }
          >
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_at">Updated</SelectItem>
              <SelectItem value="created_at">Created</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            className="h-7 w-32 text-xs"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span className="text-xs text-gray-400">–</span>
          <Input
            type="date"
            className="h-7 w-32 text-xs"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-2 p-4 md:grid-cols-3">
        {/* Application list */}
        <Card className="md:col-span-1">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Applications</CardTitle>
            <div className="relative mt-1">
              <Search className="absolute left-2 top-2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Name, phone, application no…"
                className="h-8 pl-8 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ScrollArea className="h-[calc(100vh-300px)]">
              {isLoading ? (
                <div className="py-10 text-center text-sm text-gray-500">
                  Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">
                  No applications in this queue.
                </div>
              ) : (
                filtered.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={`mb-2 block w-full rounded-md border p-2 text-left transition hover:bg-gray-50 ${
                      selectedId === a.id
                        ? "border-indigo-500 bg-indigo-50"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {a.Learner?.name ?? "Unknown learner"}
                      </span>
                      {(a.escalated || isLLFailureStatus(a.status)) && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {a.Learner?.phone}
                    </div>
                    <StatusBadge status={a.status} />
                  </button>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Detail panel */}
        <div className="md:col-span-2">
          {selected ? (
            <ApplicationDetail
              application={selected}
              actorName={actorName}
              onTransition={(toStatus, note, extraFields) =>
                updateStatus.mutate(
                  {
                    application: selected,
                    toStatus,
                    note,
                    actorName,
                    extraFields,
                  },
                  {
                    onSuccess: () =>
                      toast({
                        title: "Status updated",
                        description: `${selected.Learner?.name ?? "Application"} → ${llStageLabel(toStatus)}`,
                      }),
                    onError: (e: Error) =>
                      toast({
                        title: "Error",
                        description: e.message,
                        variant: "destructive",
                      }),
                  },
                )
              }
              onSaveFields={(fields) =>
                updateFields.mutate(
                  { application: selected, fields, actorName },
                  {
                    onSuccess: () => toast({ title: "Details saved" }),
                    onError: (e: Error) =>
                      toast({
                        title: "Error",
                        description: e.message,
                        variant: "destructive",
                      }),
                  },
                )
              }
              isBusy={updateStatus.isPending || updateFields.isPending}
            />
          ) : (
            <Card className="h-full border-dashed">
              <CardContent className="flex h-full items-center justify-center py-20 text-gray-400">
                Select an application to see its journey, update its status, and
                enter RTO details.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const failure = isLLFailureStatus(status);
  const done = status === "dl_delivered";
  return (
    <Badge
      variant="outline"
      className={`mt-1 text-[10px] ${
        failure
          ? "border-red-300 bg-red-50 text-red-700"
          : done
            ? "border-green-300 bg-green-50 text-green-700"
            : "border-blue-200 bg-blue-50 text-blue-700"
      }`}
    >
      {llStageLabel(status)}
    </Badge>
  );
}

function ApplicationDetail({
  application,
  actorName,
  onTransition,
  onSaveFields,
  isBusy,
}: {
  application: LLApplication;
  actorName: string | null;
  onTransition: (
    toStatus: string,
    note?: string,
    extraFields?: Partial<LLApplication>,
  ) => void;
  onSaveFields: (fields: Partial<LLApplication>) => void;
  isBusy: boolean;
}) {
  const stage = LL_STAGE_MAP[application.status];
  const failure = LL_FAILURE_STAGES[application.status];
  const { data: events } = useLLPipelineEvents(application.id);
  const [note, setNote] = useState("");

  // Editable Ops fields (draft state, saved together)
  const [draft, setDraft] = useState<Partial<LLApplication>>({});
  const value = (k: keyof LLApplication) =>
    (draft[k] ?? application[k] ?? "") as string;
  const setValue = (k: keyof LLApplication, v: string | null) =>
    setDraft((p) => ({ ...p, [k]: v === "" ? null : v }));

  const services: string[] = Array.isArray(draft.services)
    ? (draft.services as string[])
    : (application.services ?? []);

  const advanceTargets = stage?.next ?? [];

  return (
    <div className="space-y-2">
      <Card>
        <CardHeader className="p-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {application.Learner?.name}{" "}
              <span className="text-sm font-normal text-gray-500">
                {application.Learner?.phone} · {application.Learner?.area}
              </span>
            </CardTitle>
            <StatusBadge status={application.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-3 pt-0">
          {/* Transition controls */}
          <div className="rounded-md border p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Move this application
            </div>
            <Textarea
              placeholder="Optional note for the timeline (reason, remarks…)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mb-2 h-16 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {failure ? (
                <Button
                  size="sm"
                  disabled={isBusy}
                  onClick={() => {
                    onTransition(
                      failure.recoverTo,
                      note || "Recovered from failure",
                    );
                    setNote("");
                  }}
                >
                  <ArrowRight className="mr-1 h-4 w-4" />
                  Resume: {llStageLabel(failure.recoverTo)}
                </Button>
              ) : (
                advanceTargets.map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    disabled={isBusy}
                    onClick={() => {
                      // Post-LL branch selection also records ll_type.
                      const extra: Partial<LLApplication> | undefined =
                        t === "ob_form_enabled"
                          ? { ll_type: "with_classes" }
                          : t === "ll_maturing"
                            ? { ll_type: "direct_dl" }
                            : undefined;
                      onTransition(t, note || undefined, extra);
                      setNote("");
                    }}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    {llStageLabel(t)}
                  </Button>
                ))
              )}
              {stage?.failure && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  disabled={isBusy}
                  onClick={() => {
                    onTransition(stage.failure!.key, note || undefined);
                    setNote("");
                  }}
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  {stage.failure.label}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className={
                  application.escalated
                    ? "border-green-400 text-green-700 hover:bg-green-50"
                    : "border-amber-400 text-amber-700 hover:bg-amber-50"
                }
                disabled={isBusy}
                onClick={() =>
                  onSaveFields({
                    escalated: !application.escalated,
                    escalation_reason: application.escalated
                      ? null
                      : note || "Escalated by Ops",
                  })
                }
              >
                <AlertTriangle className="mr-1 h-4 w-4" />
                {application.escalated ? "Clear escalation" : "Escalate"}
              </Button>
            </div>
            {application.escalated && (
              <p className="mt-2 text-xs text-amber-700">
                Escalated:{" "}
                {application.escalation_reason || "no reason recorded"}
              </p>
            )}
          </div>

          {/* Customer's form submission + uploaded documents */}
          <LLDocumentsReview application={application} actorName={actorName} />

          {/* Ops data entry */}
          <div className="rounded-md border p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              RTO details
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Field label="LL Application Number">
                <Input
                  className="h-8 text-sm"
                  value={value("application_number")}
                  onChange={(e) =>
                    setValue("application_number", e.target.value)
                  }
                />
              </Field>
              <Field label="Date of Birth">
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={value("date_of_birth")}
                  onChange={(e) => setValue("date_of_birth", e.target.value)}
                />
              </Field>
              <Field label="LL Application Date">
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={value("application_date")}
                  onChange={(e) => setValue("application_date", e.target.value)}
                />
              </Field>
              <Field label="Batch">
                <Select
                  value={value("batch_code") || undefined}
                  onValueChange={(v) => setValue("batch_code", v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Segregation batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {LL_BATCHES.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Scrutiny Approved Date">
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={value("scrutiny_approved_date")}
                  onChange={(e) =>
                    setValue("scrutiny_approved_date", e.target.value)
                  }
                />
              </Field>
              <Field label="Scrutiny Expiry Date (auto: +7 days)">
                <Input
                  className="h-8 bg-gray-50 text-sm"
                  readOnly
                  tabIndex={-1}
                  value={
                    value("scrutiny_approved_date")
                      ? format(
                          addDays(new Date(value("scrutiny_approved_date")), 7),
                          "dd-MM-yyyy",
                        )
                      : "—"
                  }
                />
              </Field>
              <Field label="LL Number">
                <Input
                  className="h-8 text-sm"
                  value={value("ll_number")}
                  onChange={(e) => setValue("ll_number", e.target.value)}
                />
              </Field>
              <Field label="LL Matures On">
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={value("ll_matures_at")}
                  onChange={(e) => setValue("ll_matures_at", e.target.value)}
                />
              </Field>
              <Field label="DL Test Application Number">
                <Input
                  className="h-8 text-sm"
                  value={value("dl_application_number")}
                  onChange={(e) =>
                    setValue("dl_application_number", e.target.value)
                  }
                />
              </Field>
              <Field label="DL Test Application Date">
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={value("dl_application_date")}
                  onChange={(e) =>
                    setValue("dl_application_date", e.target.value)
                  }
                />
              </Field>
              <Field label="DL Test Date">
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={value("dl_test_date")}
                  onChange={(e) => setValue("dl_test_date", e.target.value)}
                />
              </Field>
              <Field label="DL Test RTO">
                <Input
                  className="h-8 text-sm"
                  value={value("dl_test_rto")}
                  onChange={(e) => setValue("dl_test_rto", e.target.value)}
                />
              </Field>
              <Field label="DL Number">
                <Input
                  className="h-8 text-sm"
                  value={value("dl_number")}
                  onChange={(e) => setValue("dl_number", e.target.value)}
                />
              </Field>
              <Field
                label="Rejection Reason"
                className="col-span-2 md:col-span-3"
              >
                <Input
                  className="h-8 text-sm"
                  placeholder="Latest scrutiny / approval rejection reason"
                  value={value("rejection_reason")}
                  onChange={(e) => setValue("rejection_reason", e.target.value)}
                />
              </Field>
            </div>

            {/* Services */}
            <div className="mt-3">
              <div className="mb-1 text-xs font-medium text-gray-500">
                Services on this application
              </div>
              <div className="flex flex-wrap gap-1">
                {LL_SERVICES.map((s) => {
                  const active = services.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          services: active
                            ? services.filter((k) => k !== s.key)
                            : [...services, s.key],
                        }))
                      }
                      className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                disabled={isBusy || Object.keys(draft).length === 0}
                onClick={() => {
                  onSaveFields(draft);
                  setDraft({});
                }}
              >
                Save details
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-md border p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Timeline
            </div>
            <ScrollArea className="max-h-64">
              {(events ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">No events yet.</p>
              ) : (
                <ul className="space-y-2">
                  {(events ?? []).map((e) => (
                    <li key={e.id} className="flex gap-2 text-sm">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <div>
                        <div>
                          {e.event_type === "status_change" ? (
                            <>
                              {e.from_status ? (
                                <>
                                  <span className="text-gray-500">
                                    {llStageLabel(e.from_status)}
                                  </span>{" "}
                                  →{" "}
                                </>
                              ) : null}
                              <span className="font-medium">
                                {e.to_status ? llStageLabel(e.to_status) : ""}
                              </span>
                            </>
                          ) : e.event_type === "field_update" ? (
                            <span>
                              {e.changes
                                .map(
                                  (c) =>
                                    `${c.label}: ${c.old ?? "—"} → ${
                                      Array.isArray(c.new)
                                        ? c.new.join(", ")
                                        : (c.new ?? "—")
                                    }`,
                                )
                                .join("; ")}
                            </span>
                          ) : (
                            <span>{e.note}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {format(new Date(e.created_at), "dd MMM yyyy, HH:mm")}
                          {e.actor_name ? ` · ${e.actor_name}` : ""}
                          {e.event_type === "status_change" && e.note
                            ? ` · ${e.note}`
                            : ""}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs text-gray-600">{label}</label>
      {children}
    </div>
  );
}

function NewApplicationButton({ actorName }: { actorName: string | null }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(
    null,
  );
  const [services, setServices] = useState<string[]>(["ll"]);
  const { data: results } = useLLLearnerSearch(term);
  const createMutation = useCreateLLApplication();

  const create = () => {
    if (!selectedLearnerId) return;
    createMutation.mutate(
      { learnerId: selectedLearnerId, services, actorName },
      {
        onSuccess: () => {
          toast({ title: "Application created" });
          setOpen(false);
          setTerm("");
          setSelectedLearnerId(null);
          setServices(["ll"]);
        },
        onError: (e: Error) =>
          toast({
            title: "Error",
            description: e.message.includes(
              "idx_ll_applications_learner_active",
            )
              ? "This learner already has an active LL application."
              : e.message,
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" /> New Application
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start an LL → DL journey</DialogTitle>
            <DialogDescription>
              Pick the learner and the services sold. The application starts at
              “Payment Received”.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search learner by name / phone / email (min 3 chars)"
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                setSelectedLearnerId(null);
              }}
            />
            {term.trim().length >= 3 && (
              <div className="max-h-40 overflow-y-auto rounded-md border">
                {(results ?? []).map(
                  (l: {
                    id: string;
                    name: string | null;
                    phone: string | null;
                  }) => (
                    <button
                      key={l.id}
                      onClick={() => setSelectedLearnerId(l.id)}
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        selectedLearnerId === l.id ? "bg-indigo-50" : ""
                      }`}
                    >
                      <span className="font-medium">{l.name}</span>{" "}
                      <span className="text-gray-500">{l.phone}</span>
                    </button>
                  ),
                )}
                {(results ?? []).length === 0 && (
                  <p className="px-3 py-2 text-sm text-gray-400">No matches.</p>
                )}
              </div>
            )}
            <div>
              <div className="mb-1 text-xs font-medium text-gray-500">
                Services
              </div>
              <div className="flex flex-wrap gap-1">
                {LL_SERVICES.map((s) => {
                  const active = services.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      onClick={() =>
                        setServices((prev) =>
                          active
                            ? prev.filter((k) => k !== s.key)
                            : [...prev, s.key],
                        )
                      }
                      className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={create}
                disabled={!selectedLearnerId || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
