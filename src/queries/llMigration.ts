// Shared Supabase side of the LL customer migration — used by both the bulk
// CSV import and the single-customer form so they behave identically.
import { supabase } from "@/lib/supabaseClient";
import {
  buildEnrollmentInsert,
  buildLearnerInsert,
  buildPaymentInsert,
  ParsedLLRow,
} from "@/utils/llMigrationCsv";

function dbErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message: unknown }).message;
    if (typeof msg === "string" && msg) return msg;
  }
  return "Unknown database error";
}

// Create one migrated learner (+ optional payment/enrollment when a course is
// given). Returns null on success, or an error message on failure.
export async function importLLCustomer(row: ParsedLLRow): Promise<string | null> {
  const { data: learner, error: learnerError } = await supabase
    .from("Learner")
    .insert(buildLearnerInsert(row) as never)
    .select("id")
    .single();
  if (learnerError) return dbErrorMessage(learnerError);
  if (!learner) return "Learner insert returned no row";
  const learnerId = (learner as { id: string }).id;

  if (!row.courseId) return null;

  const { data: payment, error: paymentError } = await supabase
    .from("payment")
    .insert(buildPaymentInsert(row, learnerId) as never)
    .select("id")
    .single();
  if (paymentError) {
    return `Payment failed: ${dbErrorMessage(paymentError)}`;
  }
  const paymentId = (payment as { id: string }).id;

  const { error: enrollmentError } = await supabase
    .from("enrollment")
    .insert(buildEnrollmentInsert(row, learnerId, paymentId) as never);
  if (enrollmentError) {
    return `Enrollment failed: ${dbErrorMessage(enrollmentError)}`;
  }

  return null;
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
