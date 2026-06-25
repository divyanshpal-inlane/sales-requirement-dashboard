// Shared Supabase side of the LL customer migration — used by both the bulk
// CSV import and the single-customer form so they behave identically.
import { supabase } from "@/lib/supabaseClient";
import {
  buildEnrollmentInsert,
  buildLearnerInsert,
  buildPaymentInsert,
  ParsedLLRow,
} from "@/utils/llMigrationCsv";

// Create one migrated learner (+ optional payment/enrollment when a course is
// given). Returns null on success, or an error message on failure.
export async function importLLCustomer(row: ParsedLLRow): Promise<string | null> {
  try {
    const { data: learner, error: e1 } = await supabase
      .from("Learner")
      .insert(buildLearnerInsert(row) as never)
      .select("id")
      .single();
    if (e1 || !learner) throw e1 ?? new Error("Learner insert failed");
    const learnerId = (learner as { id: string }).id;

    if (row.courseId) {
      const { data: payment } = await supabase
        .from("payment")
        .insert(buildPaymentInsert(row, learnerId) as never)
        .select("id")
        .single();
      const paymentId = (payment as { id: string } | null)?.id ?? null;
      const { error: e3 } = await supabase
        .from("enrollment")
        .insert(buildEnrollmentInsert(row, learnerId, paymentId) as never);
      if (e3) throw e3;
    }
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "failed";
  }
}

export async function phoneExists(phone: string): Promise<boolean> {
  const { data } = await supabase
    .from("Learner")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  return !!data;
}

export async function existingPhones(phones: string[]): Promise<Set<string>> {
  const set = new Set<string>();
  if (!phones.length) return set;
  const { data } = await supabase
    .from("Learner")
    .select("phone")
    .in("phone", phones);
  for (const d of data ?? []) if (d.phone) set.add(d.phone as string);
  return set;
}
