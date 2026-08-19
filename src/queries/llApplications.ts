import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  assertLLStatusTransition,
  classifyLLStatusTransition,
  fieldsToClearOnLLRevert,
  isLLSegregationRouteCode,
  llSegregationRouteLabel,
} from "@/constants/llPipeline";
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
  /** Customer's preferred slot (homepage picker); ops confirms into dl_test_*. */
  dl_preferred_date: string | null;
  dl_preferred_rto: string | null;
  dl_test_date: string | null;
  dl_test_time: string | null;
  dl_test_rto: string | null;
  dl_test_rto_address: string | null;
  dl_retest_fee: number | null;
  dl_number: string | null;
  dl_expiry_date: string | null;
  dl_dispatch_eta: string | null;
  dl_tracking_ref: string | null;
  rejection_reason: string | null;
  /** Answers from the in-app LL application form. */
  form_data: Record<string, string> | null;
  form_submitted_at: string | null;
  escalated: boolean;
  escalation_reason: string | null;
  /** When the current status was entered (maintained by a DB trigger). */
  status_changed_at: string;
  /** Customer no-shows on the application call (2 -> Ops calls them). */
  call_missed_count: number;
  ll_issue_date: string | null;
  ll_expiry_date: string | null;
  /** Fresh govt fee quoted when scrutiny expires (falls back to default). */
  reapply_fee: number | null;
  /** Which scheduled nudges the ll-flow-reminders sweep already sent. */
  reminders_sent: Record<string, string>;
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
  event_type:
    | "status_change"
    | "status_reversal"
    | "field_update"
    | "note"
    | "escalation";
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

/**
 * WhatsApp notification for a status transition (from the RTO-flow spec).
 * Returns null when the state has no customer message.
 */
function llStatusMessageType(
  toStatus: string,
  callMissedCount: number,
  llType: string | null,
): string | null {
  switch (toStatus) {
    case "meet_booking_enabled":
      return "LL_DOCS_APPROVED_BOOK_SLOT";
    case "docs_rejected":
      return "LL_DOCS_REJECTED";
    case "call_missed_by_lane":
      return "LL_CALL_MISSED_BY_LANE";
    case "call_missed":
      return callMissedCount >= 2 ? "LL_CALL_MISSED_TWICE" : null;
    case "ll_approval_rejected":
      return "LL_APPROVAL_REJECTED";
    case "ll_issued":
      return "LL_NUMBER_ISSUED";
    // ── DL phase ───────────────────────────────────────────────────────
    case "ll_matured":
      return "LL_MATURED_SELECT_DL_DATE";
    case "dl_date_selection":
      // The maturing (direct-DL) track already got the ll_matured message.
      return llType === "with_classes"
        ? "CLASSES_COMPLETED_SELECT_DL_DATE"
        : null;
    case "dl_otp_required":
      return "DL_SLOT_OTP_CALLBACK";
    case "dl_test_scheduled":
      return "DL_TEST_CONFIRMED";
    case "dl_results_pending":
      return "DL_RESULT_PENDING";
    case "dl_test_passed":
      return "DL_TEST_PASSED";
    case "dl_test_failed":
      return "DL_TEST_FAILED_RETEST";
    case "dl_test_missed":
      return "DL_TEST_NO_SHOW_RESCHEDULE";
    case "dl_number_generated":
      return "DL_NUMBER_GENERATED";
    case "dl_delivery_pending":
      return "DL_CARD_DISPATCHED";
    case "dl_delivered":
      return "DL_DELIVERED_FINAL";
    case "dl_not_delivered":
      return "DL_NOT_DELIVERED_TICKET";
    default:
      return null;
  }
}

const FIELD_LABELS: Record<string, string> = {
  application_number: "LL Application Number",
  application_date: "LL Application Date",
  date_of_birth: "Date of Birth",
  batch_code: "Segregation route",
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
  ll_issue_date: "LL Issue Date",
  ll_expiry_date: "LL Valid Till",
  reapply_fee: "Reapply Govt Fee (Rs.)",
  call_missed_count: "Customer Call Misses",
  dl_preferred_date: "Customer's Preferred DL Test Date",
  dl_preferred_rto: "Customer's Preferred RTO",
  dl_test_time: "DL Test Time",
  dl_test_rto_address: "DL Test RTO Address",
  dl_retest_fee: "DL Retest Fee (Rs.)",
  dl_expiry_date: "DL Valid Till",
  dl_dispatch_eta: "DL Card Expected Delivery",
  dl_tracking_ref: "DL Card Tracking Ref",
};

export function useUpdateLLStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      application,
      toStatus,
      note,
      actorName,
      actorId,
      extraFields,
    }: {
      application: LLApplication;
      toStatus: string;
      note?: string;
      actorName?: string | null;
      /** Admin user id — stored on the timeline for stronger audit. */
      actorId?: string | null;
      /** Fields to persist together with the transition (e.g. ll_type, escalated). */
      extraFields?: Partial<LLApplication>;
    }) => {
      // Prefer draft batch_code if the transition is bundled with a route set.
      const batchCode =
        (extraFields?.batch_code as string | null | undefined) ??
        application.batch_code;

      const kind = classifyLLStatusTransition(
        application.status,
        toStatus,
        batchCode,
      );
      if (!kind) {
        throw new Error(
          `Illegal status move ${application.status} → ${toStatus} for route ${
            batchCode ?? "unset"
          }.`,
        );
      }
      assertLLStatusTransition({
        fromStatus: application.status,
        toStatus,
        batchCode,
        kind,
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        changes: actorId
          ? [{ field: "actor_id", label: "Actor ID", old: null, new: actorId }]
          : [],
      });

      // Customer WhatsApp update for this transition — fire and forget, a
      // messaging hiccup must not roll back the operational change.
      const messageType = llStatusMessageType(
        toStatus,
        (extraFields?.call_missed_count ?? application.call_missed_count) || 0,
        extraFields?.ll_type ?? application.ll_type,
      );
      if (messageType) {
        supabase.functions
          .invoke("send-message", {
            body: {
              message_type: messageType,
              learner_id: application.learner_id,
            },
          })
          .catch((e: Error) =>
            console.error("[llApplications] send-message failed:", e),
          );
      }
    },
    onSuccess: (_d, { application }) => {
      queryClient.invalidateQueries({ queryKey: ["ll-applications"] });
      queryClient.invalidateQueries({ queryKey: ["ll-pipeline-events"] });
      queryClient.invalidateQueries({
        queryKey: ["my-ll-application", application.learner_id],
      });
    },
  });
}

/**
 * Move an application back to an earlier stage (Ops mistake correction).
 * Requires a reason. Skips customer WhatsApp. Clears stage-gated fields that
 * no longer apply. Logged as event_type = status_reversal.
 */
export function useRevertLLStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      application,
      toStatus,
      reason,
      actorName,
      actorId,
    }: {
      application: LLApplication;
      toStatus: string;
      reason: string;
      actorName?: string | null;
      actorId?: string | null;
    }) => {
      const trimmed = reason.trim();
      if (!trimmed) {
        throw new Error("A reason is required when reverting a stage.");
      }
      assertLLStatusTransition({
        fromStatus: application.status,
        toStatus,
        batchCode: application.batch_code,
        kind: "revert",
      });

      const cleared = fieldsToClearOnLLRevert(toStatus);
      // RPC sets ll.transition_kind=revert so the DB trigger allows the move.
      const { error } = await sb.rpc("ll_revert_application", {
        p_application_id: application.id,
        p_to_status: toStatus,
        p_clear_fields: cleared,
      });
      if (error) throw error;

      const clearedLabels = Object.keys(cleared);
      await appendEvent({
        application_id: application.id,
        learner_id: application.learner_id,
        event_type: "status_reversal",
        from_status: application.status,
        to_status: toStatus,
        actor_name: actorName,
        note: trimmed,
        changes: [
          ...(actorId
            ? [
                {
                  field: "actor_id",
                  label: "Actor ID",
                  old: null as unknown,
                  new: actorId as unknown,
                },
              ]
            : []),
          ...clearedLabels.map((field) => ({
            field,
            label: FIELD_LABELS[field] ?? field,
            old:
              (application as unknown as Record<string, unknown>)[field] ??
              null,
            new: null as unknown,
          })),
        ],
      });
    },
    onSuccess: (_d, { application }) => {
      queryClient.invalidateQueries({ queryKey: ["ll-applications"] });
      queryClient.invalidateQueries({ queryKey: ["ll-pipeline-events"] });
      queryClient.invalidateQueries({
        queryKey: ["my-ll-application", application.learner_id],
      });
    },
  });
}

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

/**
 * Ops uploads the issued licence (PDF/image) so the customer's "Download
 * LL"/"Download DL" button works. Stored as an approved ll_documents row of
 * type "ll_card"/"dl_card"; re-uploading replaces the previous one.
 */
export function useUploadLLCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      application,
      file,
      actorName,
      docType = "ll_card",
    }: {
      application: LLApplication;
      file: File;
      actorName?: string | null;
      docType?: "ll_card" | "dl_card";
    }) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const path = `${application.learner_id}/${docType}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("ll-documents")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;

      const { error: deleteError } = await sb
        .from("ll_documents")
        .delete()
        .eq("application_id", application.id)
        .eq("doc_type", docType);
      if (deleteError) throw deleteError;

      const { error: insertError } = await sb.from("ll_documents").insert({
        application_id: application.id,
        learner_id: application.learner_id,
        doc_type: docType,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        status: "approved",
        reviewed_by: actorName ?? null,
        reviewed_at: new Date().toISOString(),
      });
      if (insertError) throw insertError;

      await appendEvent({
        application_id: application.id,
        learner_id: application.learner_id,
        event_type: "note",
        actor_name: actorName,
        note: `${docType === "dl_card" ? "DL" : "LL"} card uploaded — customer can now download it`,
      });
    },
    onSuccess: (_d, { application }) => {
      queryClient.invalidateQueries({ queryKey: ["ll-documents"] });
      queryClient.invalidateQueries({
        queryKey: ["my-ll-application", application.learner_id],
      });
      queryClient.invalidateQueries({ queryKey: ["ll-pipeline-events"] });
    },
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
        .map(([field, value]) => {
          const format =
            field === "batch_code"
              ? (v: unknown) =>
                  v == null || v === ""
                    ? null
                    : llSegregationRouteLabel(String(v))
              : (v: unknown) => v ?? null;
          return {
            field,
            label: FIELD_LABELS[field] ?? field,
            old: format(
              (application as unknown as Record<string, unknown>)[field],
            ),
            new: format(value),
          };
        });
      if (changes.length === 0) return;

      if (
        "batch_code" in fields &&
        fields.batch_code != null &&
        fields.batch_code !== "" &&
        !isLLSegregationRouteCode(String(fields.batch_code))
      ) {
        throw new Error(
          "Segregation route must be A, B, C, or D.",
        );
      }

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
