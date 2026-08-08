import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabaseClient";

// The generated database types don't include the new ll_* tables yet
// (same pattern as noShowFees.ts) — regenerate types to remove this.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export interface LLApplication {
  id: string;
  learner_id: string;
  status: string;
  services: string[];
  ll_type: "with_classes" | "direct_dl" | null;
  application_number: string | null;
  application_date: string | null;
  date_of_birth: string | null;
  batch_code: string | null;
  ll_number: string | null;
  scrutiny_approved_date: string | null;
  /** Generated column: scrutiny_approved_date + 7 days. Never write it. */
  scrutiny_expiry_date: string | null;
  ll_matures_at: string | null;
  dl_application_number: string | null;
  dl_application_date: string | null;
  dl_test_date: string | null;
  dl_test_rto: string | null;
  dl_number: string | null;
  rejection_reason: string | null;
  /** Answers from the in-app LL application form. */
  form_data: Record<string, string> | null;
  form_submitted_at: string | null;
  escalated: boolean;
  escalation_reason: string | null;
  created_at: string;
  updated_at: string;
  Learner: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    area: string | null;
  } | null;
}

export interface LLPipelineEvent {
  id: string;
  application_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  actor_name: string | null;
  note: string | null;
  changes: { field: string; label: string; old: unknown; new: unknown }[];
  created_at: string;
}

export function useLLApplications() {
  return useQuery({
    queryKey: ["ll-applications"],
    queryFn: async (): Promise<LLApplication[]> => {
      const { data, error } = await sb
        .from("ll_applications")
        .select("*, Learner(id, name, phone, email, area)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LLApplication[];
    },
    staleTime: 30 * 1000,
  });
}

export function useLLPipelineEvents(applicationId: string | null) {
  return useQuery({
    queryKey: ["ll-pipeline-events", applicationId],
    queryFn: async (): Promise<LLPipelineEvent[]> => {
      const { data, error } = await sb
        .from("ll_pipeline_events")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LLPipelineEvent[];
    },
    enabled: !!applicationId,
  });
}

/** Learner search for the "New Application" dialog. */
export function useLLLearnerSearch(term: string) {
  return useQuery({
    queryKey: ["ll-learner-search", term],
    queryFn: async () => {
      const like = `%${term}%`;
      const { data, error } = await sb
        .from("Learner")
        .select("id, name, phone, email")
        .or(`name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
    enabled: term.trim().length >= 3,
  });
}

async function appendEvent(event: {
  application_id: string;
  learner_id?: string | null;
  event_type: "status_change" | "field_update" | "note" | "escalation";
  from_status?: string | null;
  to_status?: string | null;
  actor_name?: string | null;
  note?: string | null;
  changes?: { field: string; label: string; old: unknown; new: unknown }[];
}) {
  const { error } = await sb.from("ll_pipeline_events").insert({
    changes: [],
    ...event,
  });
  // Timeline write failures shouldn't block the operational update, but they
  // must not be silent either.
  if (error) console.error("[llApplications] event insert failed:", error);
}

export function useCreateLLApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      learnerId,
      services,
      actorName,
    }: {
      learnerId: string;
      services: string[];
      actorName?: string | null;
    }) => {
      const { data, error } = await sb
        .from("ll_applications")
        .insert({ learner_id: learnerId, services, status: "payment_received" })
        .select("id")
        .single();
      if (error) throw error;
      await appendEvent({
        application_id: data.id,
        learner_id: learnerId,
        event_type: "status_change",
        to_status: "payment_received",
        actor_name: actorName,
        note: "Application created",
      });
      return data.id as string;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["ll-applications"] }),
  });
}

export function useUpdateLLStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      application,
      toStatus,
      note,
      actorName,
      extraFields,
    }: {
      application: LLApplication;
      toStatus: string;
      note?: string;
      actorName?: string | null;
      /** Fields to persist together with the transition (e.g. ll_type, escalated). */
      extraFields?: Partial<LLApplication>;
    }) => {
      const { Learner: _l, ...fields } = extraFields ?? {};
      const { error } = await sb
        .from("ll_applications")
        .update({
          status: toStatus,
          updated_at: new Date().toISOString(),
          ...fields,
        })
        .eq("id", application.id);
      if (error) throw error;
      await appendEvent({
        application_id: application.id,
        learner_id: application.learner_id,
        event_type: "status_change",
        from_status: application.status,
        to_status: toStatus,
        actor_name: actorName,
        note: note ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ll-applications"] });
      queryClient.invalidateQueries({ queryKey: ["ll-pipeline-events"] });
    },
  });
}

const FIELD_LABELS: Record<string, string> = {
  application_number: "LL Application Number",
  application_date: "LL Application Date",
  date_of_birth: "Date of Birth",
  batch_code: "Batch",
  ll_number: "LL Number",
  scrutiny_approved_date: "Scrutiny Approved Date",
  ll_matures_at: "LL Matures On",
  dl_application_number: "DL Test Application Number",
  dl_application_date: "DL Test Application Date",
  dl_test_date: "DL Test Date",
  dl_test_rto: "DL Test RTO",
  dl_number: "DL Number",
  rejection_reason: "Rejection Reason",
  services: "Services",
  ll_type: "LL Type",
  escalated: "Escalated",
  escalation_reason: "Escalation Reason",
};

// ── Uploaded documents (in-app LL application form) ──────────────────────

export interface LLDocument {
  id: string;
  application_id: string;
  learner_id: string | null;
  doc_type: string;
  doc_subtype: string | null;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export function llDocumentUrl(doc: LLDocument): string {
  return supabase.storage.from("ll-documents").getPublicUrl(doc.storage_path)
    .data.publicUrl;
}

export function useLLDocuments(applicationId: string | null) {
  return useQuery({
    queryKey: ["ll-documents", applicationId],
    queryFn: async (): Promise<LLDocument[]> => {
      const { data, error } = await sb
        .from("ll_documents")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as LLDocument[];
    },
    enabled: !!applicationId,
  });
}

/** RTO team verdict on a single uploaded document. */
export function useReviewLLDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      doc,
      status,
      rejectionReason,
      actorName,
      docLabel,
    }: {
      doc: LLDocument;
      status: "approved" | "rejected";
      rejectionReason?: string;
      actorName?: string | null;
      docLabel: string;
    }) => {
      const { error } = await sb
        .from("ll_documents")
        .update({
          status,
          rejection_reason:
            status === "rejected" ? (rejectionReason ?? null) : null,
          reviewed_by: actorName ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", doc.id);
      if (error) throw error;
      await appendEvent({
        application_id: doc.application_id,
        learner_id: doc.learner_id,
        event_type: "note",
        actor_name: actorName,
        note:
          status === "approved"
            ? `Document approved: ${docLabel}`
            : `Document rejected: ${docLabel}${rejectionReason ? ` — ${rejectionReason}` : ""}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ll-documents"] });
      queryClient.invalidateQueries({ queryKey: ["ll-pipeline-events"] });
    },
  });
}

export function useUpdateLLFields() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      application,
      fields,
      actorName,
    }: {
      application: LLApplication;
      fields: Partial<LLApplication>;
      actorName?: string | null;
    }) => {
      const changes = Object.entries(fields)
        .filter(
          ([k, v]) =>
            JSON.stringify(v) !==
            JSON.stringify(
              (application as unknown as Record<string, unknown>)[k],
            ),
        )
        .map(([field, value]) => ({
          field,
          label: FIELD_LABELS[field] ?? field,
          old:
            (application as unknown as Record<string, unknown>)[field] ?? null,
          new: value ?? null,
        }));
      if (changes.length === 0) return;

      const { error } = await sb
        .from("ll_applications")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", application.id);
      if (error) throw error;
      await appendEvent({
        application_id: application.id,
        learner_id: application.learner_id,
        event_type: "field_update",
        actor_name: actorName,
        changes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ll-applications"] });
      queryClient.invalidateQueries({ queryKey: ["ll-pipeline-events"] });
    },
  });
}
