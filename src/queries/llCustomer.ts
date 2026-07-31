import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useUser } from "@/context/auth-context";
import { supabase } from "@/lib/supabaseClient";

import { LLApplication, LLDocument } from "./llApplications";

// Same pattern as llApplications.ts — the generated database types don't
// include the ll_* tables yet; regenerate types to remove this.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

/** Statuses that end a journey — anything else counts as the active one. */
const CLOSED_STATUSES = ["dl_delivered", "closed"];

export interface MyLLApplication {
  application: LLApplication | null;
  documents: LLDocument[];
}

/** The learner's active LL application + uploaded documents (customer side). */
export function useMyLLApplication(learnerId: string | null | undefined) {
  return useQuery({
    queryKey: ["my-ll-application", learnerId],
    queryFn: async (): Promise<MyLLApplication> => {
      const { data: application, error } = await sb
        .from("ll_applications")
        .select("*")
        .eq("learner_id", learnerId)
        .not("status", "in", `(${CLOSED_STATUSES.join(",")})`)
        .maybeSingle();
      if (error) throw error;
      if (!application) return { application: null, documents: [] };

      const { data: documents, error: docsError } = await sb
        .from("ll_documents")
        .select("*")
        .eq("application_id", application.id)
        .order("created_at", { ascending: true });
      if (docsError) throw docsError;

      return {
        application: application as unknown as LLApplication,
        documents: (documents ?? []) as unknown as LLDocument[],
      };
    },
    enabled: !!learnerId,
  });
}

export interface LLDocumentUpload {
  docType: string;
  subtype: string | null;
  file: File;
}

/**
 * Submit (or resubmit) the in-app LL application form: uploads documents,
 * saves the answers, and auto-moves the application to "Documents under
 * review" (LL-DL_Flow_Feedback item 1 — no manual ops action).
 */
export function useSubmitLLApplication() {
  const queryClient = useQueryClient();
  const { phone } = useUser();

  return useMutation({
    mutationFn: async ({
      learnerId,
      learnerName,
      formData,
      uploads,
    }: {
      learnerId: string;
      learnerName: string | null;
      formData: Record<string, string>;
      uploads: LLDocumentUpload[];
    }) => {
      // 1. Find (or create) the learner's active application.
      const { data: existing, error: findError } = await sb
        .from("ll_applications")
        .select("id, status")
        .eq("learner_id", learnerId)
        .not("status", "in", `(${CLOSED_STATUSES.join(",")})`)
        .maybeSingle();
      if (findError) throw findError;

      let applicationId: string = existing?.id;
      if (!applicationId) {
        const { data: created, error: createError } = await sb
          .from("ll_applications")
          .insert({
            learner_id: learnerId,
            services: ["ll"],
            status: "docs_submitted",
          })
          .select("id, status")
          .single();
        if (createError) throw createError;
        applicationId = created.id;
        await sb.from("ll_pipeline_events").insert({
          application_id: applicationId,
          learner_id: learnerId,
          event_type: "status_change",
          to_status: "docs_submitted",
          actor_name: learnerName,
          note: "Application created from the in-app LL form",
          changes: [],
        });
      }

      // 2. Upload documents; each upload replaces the previous row (and
      //    review verdict) for that doc_type.
      for (const u of uploads) {
        const ext = u.file.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${learnerId}/${u.docType}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("ll-documents")
          .upload(path, u.file, { cacheControl: "3600", upsert: true });
        if (uploadError)
          throw new Error(
            `Upload failed for ${u.docType}: ${uploadError.message}`,
          );

        const { error: deleteError } = await sb
          .from("ll_documents")
          .delete()
          .eq("application_id", applicationId)
          .eq("doc_type", u.docType);
        if (deleteError) throw deleteError;

        const { error: insertError } = await sb.from("ll_documents").insert({
          application_id: applicationId,
          learner_id: learnerId,
          doc_type: u.docType,
          doc_subtype: u.subtype,
          storage_path: path,
          file_name: u.file.name,
          mime_type: u.file.type,
          status: "pending",
        });
        if (insertError) throw insertError;
      }

      // 3. Save the answers and auto-advance to "Documents under review".
      const fromStatus = existing?.status ?? "docs_submitted";
      const { error: updateError } = await sb
        .from("ll_applications")
        .update({
          form_data: formData,
          date_of_birth: formData.date_of_birth || null,
          form_submitted_at: new Date().toISOString(),
          status: "docs_under_review",
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicationId);
      if (updateError) throw updateError;

      await sb.from("ll_pipeline_events").insert({
        application_id: applicationId,
        learner_id: learnerId,
        event_type: "status_change",
        from_status: fromStatus,
        to_status: "docs_under_review",
        actor_name: learnerName,
        note:
          fromStatus === "docs_rejected"
            ? "Customer resubmitted the LL form after rejection"
            : "Customer submitted the LL form — documents under review",
        changes: [],
      });

      // 4. Keep the existing booking gate working.
      const { error: learnerError } = await sb
        .from("Learner")
        .update({ is_LL_form_filled: true })
        .eq("id", learnerId);
      if (learnerError) throw learnerError;

      return applicationId;
    },
    onSuccess: (_id, { learnerId }) => {
      queryClient.invalidateQueries({
        queryKey: ["my-ll-application", learnerId],
      });
      queryClient.invalidateQueries({ queryKey: ["learner", phone] });
      queryClient.invalidateQueries({ queryKey: ["ll-applications"] });
    },
  });
}
