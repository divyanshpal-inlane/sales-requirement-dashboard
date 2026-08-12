// The LL -> DL journey state machine, transcribed from the Ops flow board.
// Each stage belongs to a phase (rendered as queue tabs on the admin page).
// `next` lists the stage(s) a "happy path" advance can go to — more than one
// entry means Ops picks the branch (e.g. post-LL: classes vs direct DL).
// `failure` describes the red-box outcome for a stage and where recovery
// re-enters the flow.

export type LLPhaseKey =
  | "documents"
  | "application_call"
  | "rto_submission"
  | "ll_test"
  | "post_ll"
  | "dl_test";

export const LL_PHASES: { key: LLPhaseKey; label: string }[] = [
  { key: "documents", label: "Docs & Payment" },
  { key: "application_call", label: "Application Call" },
  { key: "rto_submission", label: "RTO Submission" },
  { key: "ll_test", label: "LL Test" },
  { key: "post_ll", label: "Post-LL" },
  { key: "dl_test", label: "DL Test & Delivery" },
];

export interface LLFailure {
  key: string;
  label: string;
  recoverTo: string;
}

export interface LLStage {
  key: string;
  label: string;
  phase: LLPhaseKey;
  next: string[];
  /** Red-box outcomes reachable from this stage, with their recovery targets. */
  failures?: LLFailure[];
  /** Ops fields that become relevant at this stage (shown highlighted). */
  fields?: string[];
}

export const LL_STAGES: LLStage[] = [
  // ── Phase 1: Payment & documents ─────────────────────────────────────
  {
    key: "payment_received",
    label: "Payment Received",
    phase: "documents",
    next: ["docs_link_sent"],
  },
  {
    key: "docs_link_sent",
    label: "Document Upload Link Sent",
    phase: "documents",
    next: ["docs_submitted"],
    // Board rule: not filled after 2 days -> escalate to Ops.
  },
  {
    key: "docs_submitted",
    label: "Documents Submitted",
    phase: "documents",
    next: ["docs_under_review"],
  },
  {
    key: "docs_under_review",
    label: "Documents Under Review",
    phase: "documents",
    next: ["meet_booking_enabled"],
    failures: [
      {
        key: "docs_rejected",
        label: "Docs Rejected / Incomplete",
        recoverTo: "docs_submitted",
      },
    ],
  },

  // ── Phase 2: Google Meet application call ────────────────────────────
  {
    key: "meet_booking_enabled",
    label: "Meet Booking Enabled",
    phase: "application_call",
    next: ["appointment_booked"],
    // Board rule: reminders at 24h/48h, then Ops follow-up queue.
  },
  {
    key: "appointment_booked",
    label: "Appointment Booked",
    phase: "application_call",
    next: ["rto_application_generated"],
    failures: [
      {
        key: "call_missed",
        label: "Missed by Customer",
        recoverTo: "appointment_booked",
        // Board rule: 2 misses -> Ops calls the customer to finish over phone.
      },
      {
        key: "call_missed_by_lane",
        label: "Missed by Lane / Technical Issue",
        recoverTo: "appointment_booked",
        // Customer gets an apology + free reschedule.
      },
    ],
  },
  {
    key: "rto_application_generated",
    label: "RTO Application Generated",
    phase: "application_call",
    next: ["govt_payment_pending"],
    fields: ["services"],
  },

  // ── Phase 3: Govt payment & RTO submission ───────────────────────────
  {
    key: "govt_payment_pending",
    label: "Govt Payment Pending",
    phase: "rto_submission",
    next: ["application_ready"],
    failures: [
      {
        key: "govt_payment_failed",
        label: "Payment Failed",
        recoverTo: "govt_payment_pending",
      },
    ],
  },
  {
    key: "application_ready",
    label: "Ready for Scrutiny (No. & Date entered)",
    phase: "rto_submission",
    next: ["in_scrutiny_queue"],
    fields: ["application_number", "application_date", "batch_code"],
  },
  {
    key: "in_scrutiny_queue",
    label: "In RTO Scrutiny Queue",
    phase: "rto_submission",
    next: ["assigned_to_runner"],
  },
  {
    key: "assigned_to_runner",
    label: "Assigned to RTO Runner",
    phase: "rto_submission",
    next: ["submitted_at_rto"],
  },
  {
    key: "submitted_at_rto",
    label: "Submitted at RTO",
    phase: "rto_submission",
    next: ["waiting_rto_verification"],
  },
  {
    key: "waiting_rto_verification",
    label: "Waiting for RTO Verification",
    phase: "rto_submission",
    next: ["ll_test_enabled"],
    failures: [
      {
        key: "scrutiny_rejected",
        label: "Scrutiny Not Approved",
        recoverTo: "submitted_at_rto",
      },
    ],
  },

  // ── Phase 4: LL test & approval ──────────────────────────────────────
  {
    key: "ll_test_enabled",
    label: "LL Test Enabled",
    phase: "ll_test",
    next: ["ll_test_passed"],
    fields: ["scrutiny_approved_date", "scrutiny_expiry_date"],
    failures: [
      {
        key: "ll_test_failed",
        label: "LL Test Failed",
        recoverTo: "ll_test_enabled",
        // Board rule: Ops pays retest fee + calls customer; retry after 24h.
      },
      {
        key: "scrutiny_expired",
        label: "Scrutiny Expired (7 days)",
        recoverTo: "meet_booking_enabled",
        // Set automatically by ll_expire_scrutiny(); customer pays a fresh
        // govt fee (reapply_fee) and the application call restarts.
      },
    ],
  },
  {
    key: "ll_test_passed",
    label: "LL Test Passed",
    phase: "ll_test",
    next: ["ll_approval_pending"],
  },
  {
    key: "ll_approval_pending",
    label: "LL Approval Pending",
    phase: "ll_test",
    next: ["ll_issued"],
    failures: [
      {
        key: "ll_approval_rejected",
        label: "LL Approval Rejected",
        recoverTo: "meet_booking_enabled",
        // RTO returned the application — Ops corrects and resubmits via a
        // fresh application call.
      },
    ],
  },
  {
    key: "ll_issued",
    label: "LL Issued (LL No. entered)",
    phase: "ll_test",
    next: ["ob_form_enabled", "ll_maturing"],
    fields: ["ll_number", "ll_issue_date", "ll_expiry_date"],
  },

  // ── Phase 5: Post-LL branch ──────────────────────────────────────────
  {
    key: "ob_form_enabled",
    label: "OB Form Enabled (with Classes)",
    phase: "post_ll",
    next: ["classes_in_progress"],
  },
  {
    key: "classes_in_progress",
    label: "Classes In Progress",
    phase: "post_ll",
    next: ["dl_date_selection"],
  },
  {
    key: "ll_maturing",
    label: "LL Maturing (1-month timer)",
    phase: "post_ll",
    next: ["ll_matured"],
    fields: ["ll_matures_at"],
  },
  {
    key: "ll_matured",
    label: "LL Matured",
    phase: "post_ll",
    next: ["dl_date_selection"],
  },
  {
    key: "dl_date_selection",
    label: "DL Date Options Enabled",
    phase: "post_ll",
    next: ["dl_date_preference_received"],
  },

  // ── Phase 6: DL test & delivery ──────────────────────────────────────
  {
    key: "dl_date_preference_received",
    label: "DL Date Preference Received",
    phase: "dl_test",
    next: ["dl_test_scheduled", "dl_otp_required"],
    fields: ["dl_preferred_date", "dl_preferred_rto"],
    // Customer picked a date+RTO on the homepage; ops confirms the slot with
    // the RTO (via dl_otp_required when a Parivahan OTP call is needed).
  },
  {
    key: "dl_otp_required",
    label: "Slot Booking — OTP Required",
    phase: "dl_test",
    next: ["dl_test_scheduled"],
  },
  {
    key: "dl_test_scheduled",
    label: "DL Test Confirmed",
    phase: "dl_test",
    next: ["dl_results_pending"],
    fields: [
      "dl_application_number",
      "dl_application_date",
      "dl_test_date",
      "dl_test_time",
      "dl_test_rto",
      "dl_test_rto_address",
    ],
    failures: [
      {
        key: "dl_test_missed",
        label: "DL Test Not Attended",
        recoverTo: "dl_test_scheduled",
      },
    ],
  },
  {
    key: "dl_results_pending",
    label: "DL Test Done — Results Pending",
    phase: "dl_test",
    next: ["dl_test_passed"],
    failures: [
      {
        key: "dl_test_failed",
        label: "DL Test Failed",
        recoverTo: "dl_test_scheduled",
      },
    ],
  },
  {
    key: "dl_test_passed",
    label: "DL Test Passed",
    phase: "dl_test",
    next: ["dl_number_generated"],
  },
  {
    key: "dl_number_generated",
    label: "DL Number Generated",
    phase: "dl_test",
    next: ["dl_delivery_pending"],
    fields: ["dl_number", "dl_expiry_date"],
  },
  {
    key: "dl_delivery_pending",
    label: "DL Card Dispatched / Delivery Pending",
    phase: "dl_test",
    next: ["dl_delivered"],
    fields: ["dl_dispatch_eta", "dl_tracking_ref"],
    failures: [
      {
        key: "dl_not_delivered",
        label: "DL Not Delivered (auto-ticket)",
        recoverTo: "dl_delivery_pending",
      },
    ],
  },
  {
    key: "dl_delivered",
    label: "DL Delivered — Journey Complete",
    phase: "dl_test",
    next: [],
  },
];

/** Failure statuses are storable statuses too — index them for lookups. */
export const LL_FAILURE_STAGES: Record<
  string,
  { label: string; recoverTo: string; phase: LLPhaseKey }
> = Object.fromEntries(
  LL_STAGES.flatMap((s) =>
    (s.failures ?? []).map((f) => [
      f.key,
      { label: f.label, recoverTo: f.recoverTo, phase: s.phase },
    ]),
  ),
);

export const LL_STAGE_MAP: Record<string, LLStage> = Object.fromEntries(
  LL_STAGES.map((s) => [s.key, s]),
);

export function llStageLabel(status: string): string {
  return (
    LL_STAGE_MAP[status]?.label ?? LL_FAILURE_STAGES[status]?.label ?? status
  );
}

export function llStagePhase(status: string): LLPhaseKey {
  return (
    LL_STAGE_MAP[status]?.phase ??
    LL_FAILURE_STAGES[status]?.phase ??
    "documents"
  );
}

export function isLLFailureStatus(status: string): boolean {
  return status in LL_FAILURE_STAGES;
}

/** Services Ops can tick on the RTO application (from the board's checkbox list). */
export const LL_SERVICES: { key: string; label: string }[] = [
  { key: "ll", label: "LL" },
  { key: "classes", label: "Classes" },
  { key: "dl", label: "DL" },
  { key: "dl_renewal", label: "DL Renewal" },
  { key: "address_change_ka", label: "Address change KA to KA" },
  { key: "name_correction", label: "Name Correction" },
  { key: "backlog", label: "Backlog" },
  { key: "duplicate_dl", label: "Duplicate DL" },
  { key: "idp", label: "IDP" },
  {
    key: "dl_address_change_other_state",
    label: "DL address change (other state → KA)",
  },
];

export const LL_BATCHES = ["LN001-007", "LN008-011", "LN012-015", "LN016-019"];

// ── Customer-facing journey (homepage states) ────────────────────────────

/** Where the customer takes the online LL test after scrutiny passes. */
export const PARIVAHAN_LL_TEST_URL =
  "https://sarathi.parivahan.gov.in/sarathiservice/stateSelection.do";

/**
 * Fresh government fee quoted when RTO scrutiny expires (LL test not taken
 * within 7 days). Ops can override per application via
 * ll_applications.reapply_fee.
 */
export const LL_REAPPLY_FEE_DEFAULT = 450;

/** DL retest fee quoted when the DL test is failed (ops-overridable). */
export const DL_RETEST_FEE_DEFAULT = 300;

/** RTOs the customer can pick for the DL test (Bengaluru). */
export const DL_RTO_OPTIONS = [
  "Koramangala RTO (KA-01)",
  "Rajajinagar RTO (KA-02)",
  "Indiranagar RTO (KA-03)",
  "Yeshwanthpur RTO (KA-04)",
  "Jayanagar RTO (KA-05)",
  "KR Puram RTO (KA-53)",
  "Electronic City RTO (KA-51)",
  "Marathahalli RTO (KA-03)",
];

/** What to carry to the DL test (confirmed-test card + reminder checklist). */
export const DL_TEST_CHECKLIST = [
  "Original Learner's Licence",
  "Aadhaar card (original)",
  "The vehicle you will be tested on",
];

/**
 * DL-phase statuses that get their own customer homepage screens. These are
 * also surfaced on the normal (classes) homepage via PostLLHomeCard, because
 * classes-track learners have left the LL flow by then.
 */
export const DL_PHASE_CUSTOMER_STATUSES = [
  "ll_matured",
  "dl_date_selection",
  "dl_date_preference_received",
  "dl_otp_required",
  "dl_test_scheduled",
  "dl_test_missed",
  "dl_results_pending",
  "dl_test_failed",
  "dl_test_passed",
  "dl_number_generated",
  "dl_delivery_pending",
  "dl_not_delivered",
  "dl_delivered",
];

/** Statuses where the homepage shows "sent for scrutiny at the RTO". */
export const LL_IN_RTO_PROCESS_STATUSES = [
  "rto_application_generated",
  "govt_payment_pending",
  "govt_payment_failed",
  "application_ready",
  "in_scrutiny_queue",
  "assigned_to_runner",
  "submitted_at_rto",
  "waiting_rto_verification",
];

/** Statuses at/after LL approval where the homepage shows the LL card. */
export const LL_APPROVED_STATUSES = [
  "ll_issued",
  "ob_form_enabled",
  "classes_in_progress",
  "ll_maturing",
  "ll_matured",
  "dl_date_selection",
  "dl_test_scheduled",
  "dl_test_missed",
  "dl_results_pending",
  "dl_test_failed",
  "dl_test_passed",
  "dl_number_generated",
  "dl_delivery_pending",
  "dl_not_delivered",
];

// ── In-app LL application form (replaces the Google Form) ────────────────
// Documents the customer must upload, from the "DL Docs? Sorted in Seconds!"
// checklist shown in the app (public/assets/documents_list.jpg).

export interface LLDocTypeDef {
  key: string;
  label: string;
  required: boolean;
  /** Accepted proof kinds the customer picks from (empty = no picker). */
  subtypes: { key: string; label: string }[];
  hint?: string;
}

export const LL_DOC_TYPES: LLDocTypeDef[] = [
  {
    key: "photo",
    label: "Passport-size Photo",
    required: true,
    subtypes: [],
    hint: "Clear, recent photo with a plain background",
  },
  {
    key: "signature",
    label: "Signature",
    required: true,
    subtypes: [],
    hint: "Sign on plain white paper and photograph/scan it",
  },
  {
    key: "age_proof",
    label: "Age Proof",
    required: true,
    subtypes: [
      { key: "voter_id", label: "Voter ID" },
      { key: "passport", label: "Passport" },
      { key: "birth_certificate", label: "Birth Certificate" },
      { key: "tenth_marksheet", label: "10th Marksheet" },
      { key: "lic_policy", label: "LIC Insurance Policy" },
    ],
  },
  {
    key: "address_proof",
    label: "Address Proof (current address)",
    required: true,
    subtypes: [
      { key: "aadhaar", label: "Aadhaar" },
      { key: "passport", label: "Passport" },
      { key: "voter_id", label: "Voter ID" },
      { key: "bank_passbook", label: "Bank Passbook" },
      { key: "ration_card", label: "Ration Card" },
      {
        key: "rental_agreement",
        label: "Rental Agreement + Electricity/Gas Bill",
      },
      {
        key: "self_affidavit",
        label: "Notarized Self-Affidavit + supporting proof",
      },
    ],
  },
  {
    key: "id_proof",
    label: "ID Proof",
    required: true,
    subtypes: [
      { key: "aadhaar", label: "Aadhaar" },
      { key: "pan", label: "PAN" },
      { key: "passport", label: "Passport" },
    ],
  },
];

export const LL_DOC_TYPE_MAP: Record<string, LLDocTypeDef> = Object.fromEntries(
  LL_DOC_TYPES.map((d) => [d.key, d]),
);

/** Personal-detail questions on the LL application form (stored in form_data). */
export const LL_FORM_FIELDS: {
  key: string;
  label: string;
  type: "text" | "date" | "select";
  required: boolean;
  options?: string[];
}[] = [
  {
    key: "full_name",
    label: "Full Name (as on documents)",
    type: "text",
    required: true,
  },
  { key: "email", label: "Email", type: "text", required: true },
  { key: "phone", label: "Phone", type: "text", required: true },
  {
    key: "date_of_birth",
    label: "Date of Birth",
    type: "date",
    required: true,
  },
  {
    key: "gender",
    label: "Gender",
    type: "select",
    required: true,
    options: ["Male", "Female", "Other"],
  },
  {
    key: "blood_group",
    label: "Blood Group",
    type: "select",
    required: false,
    options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"],
  },
  {
    key: "father_or_spouse_name",
    label: "Father's / Spouse's Name",
    type: "text",
    required: true,
  },
  {
    key: "place_of_birth",
    label: "Place of Birth",
    type: "text",
    required: true,
  },
  {
    key: "educational_qualification",
    label: "Educational Qualification",
    type: "select",
    required: false,
    options: [
      "Below 10th",
      "10th Pass",
      "12th Pass",
      "Graduate",
      "Post-Graduate",
      "Other",
    ],
  },
  {
    key: "address",
    label: "Current Full Address",
    type: "text",
    required: true,
  },
  { key: "pincode", label: "Pincode", type: "text", required: true },
];
