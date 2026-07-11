import { format } from "date-fns";
import { PDFDocument } from "pdf-lib";

import { supabase } from "@/lib/supabaseClient";
import { Form14Data, generateForm14PDF } from "@/utils/generateForm14";
import { Form5CertificateData, generateForm5PDF } from "@/utils/generateForm5";
import { Form15Data, generateForm15PDF } from "@/utils/generateForm15";

// Fixed values from the Form-5 certificate spec sheet.
export const SCHOOL_NAME = "Inlane Motor Driving Training School";
export const SCHOOL_ADDRESS =
  "Plot No 194 3rd Floor Double Road Indiranagar, KA, 560038";
export const VEHICLE_CLASS = "LMV (Light Motor Vehicle)";
export const FITNESS_CONFIRMED = "Yes - Satisfactory";
export const ISSUED_BY = "InLane Motor Driving Training School";

export interface BulkFormLearner {
  id: string;
  name: string | null;
  phone: string;
  email?: string | null;
  dob?: string | null;
  aadhar_state?: string | null;
  pick_up_location?: string | null;
  area?: string | null;
  city?: string | null;
  pincode?: string | null;
  created_at?: string;
  LL_application_id?: string | null;
  LL_id?: string | null;
  DL_id?: string | null;
  DL_received_date?: string | null;
}

export interface TrainingPeriod {
  first: string | null; // yyyy-MM-dd
  last: string | null; // yyyy-MM-dd
}

const fmt = (iso: string | null | undefined) =>
  iso ? format(new Date(iso), "dd/MM/yyyy") : "";

/**
 * First/last class per learner from the Schedule table (cancelled rows
 * excluded). Queries in chunks and pages past PostgREST's 1000-row cap.
 */
export async function fetchTrainingPeriods(
  learnerIds: string[],
): Promise<Map<string, TrainingPeriod>> {
  const periods = new Map<string, TrainingPeriod>();
  const CHUNK = 100;
  const PAGE_SIZE = 1000;

  for (let i = 0; i < learnerIds.length; i += CHUNK) {
    const chunk = learnerIds.slice(i, i + CHUNK);
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("Schedule")
        .select("learner_id, date")
        .in("learner_id", chunk)
        .neq("status", "cancelled")
        .order("date", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      for (const row of data ?? []) {
        if (!row.learner_id || !row.date) continue;
        const cur = periods.get(row.learner_id);
        if (!cur) {
          periods.set(row.learner_id, { first: row.date, last: row.date });
        } else {
          if (row.date < cur.first!) cur.first = row.date;
          if (row.date > cur.last!) cur.last = row.date;
        }
      }
      if (!data || data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }
  return periods;
}

export const serialNumberFor = (learner: BulkFormLearner) =>
  learner.id?.substring(0, 8).toUpperCase() || "";

const residingAt = (learner: BulkFormLearner) =>
  learner.pick_up_location ||
  [learner.area, learner.city, learner.pincode, learner.aadhar_state]
    .filter(Boolean)
    .join(", ");

/** Form 14/15/5 payloads for one learner, mirroring the Form14Generator defaults. */
export function buildBulkFormData(
  learner: BulkFormLearner,
  period: TrainingPeriod | undefined,
) {
  const serial = serialNumberFor(learner);
  const enrollmentDate = fmt(learner.created_at) || format(new Date(), "dd/MM/yyyy");
  const periodFrom = fmt(period?.first) || enrollmentDate;
  const periodTo = fmt(period?.last);
  const address = residingAt(learner);

  const form14: Form14Data = {
    enrollmentNumber: serial,
    name: learner.name || "",
    guardianName: "",
    permanentAddress: address,
    dob: fmt(learner.dob),
    vehicleClass: VEHICLE_CLASS,
    enrollmentDate,
    llNumber: learner.LL_id || learner.LL_application_id || "",
    completionDate: periodTo || undefined,
    dlNumber: learner.DL_id || undefined,
    dlIssueDate: fmt(learner.DL_received_date) || undefined,
    phone: learner.phone,
    email: learner.email || undefined,
  };

  const form15: Form15Data = {
    schoolName: SCHOOL_NAME.toUpperCase(),
    traineeName: learner.name || "",
    enrollmentNumber: serial,
    enrollmentDate,
  };

  const form5: Form5CertificateData = {
    certificateNo: serial,
    date: periodTo || format(new Date(), "dd/MM/yyyy"),
    name: learner.name || "",
    address,
    enrolledOn: enrollmentDate,
    serialNumber: serial,
    vehicleClass: VEHICLE_CLASS,
    periodFrom,
    periodTo: periodTo || undefined,
  };

  return { form14, form15, form5 };
}

/**
 * One merged PDF for every learner in the list: Form 14, Form 15 and the
 * Form-5 certificate per learner, in list order.
 */
export async function generateAllFormsMergedPDF(
  learners: BulkFormLearner[],
  periods: Map<string, TrainingPeriod>,
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array> {
  const merged = await PDFDocument.create();

  for (let i = 0; i < learners.length; i++) {
    const learner = learners[i];
    const { form14, form15, form5 } = buildBulkFormData(
      learner,
      periods.get(learner.id),
    );
    const parts = await Promise.all([
      generateForm14PDF(form14),
      generateForm15PDF(form15),
      generateForm5PDF(form5),
    ]);
    for (const bytes of parts) {
      const doc = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }
    onProgress?.(i + 1, learners.length);
  }

  return merged.save();
}

const CSV_HEADERS = [
  "Trainee Name",
  "Phone",
  "School Name",
  "School Address",
  "Residing At",
  "Serial No. (Form 14 In-Out Register)",
  "Class of Vehicle / Training",
  "Training Period From",
  "Training Period To",
  "Physical Fitness & Responsibility Confirmed",
  "Issued By",
  "Signatory",
];

const csvCell = (value: string) =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/** Certificate sheet rows (one per learner) matching the spec-sheet columns. */
export function buildCertificateSheetCSV(
  learners: BulkFormLearner[],
  periods: Map<string, TrainingPeriod>,
): string {
  const rows = learners.map((learner) => {
    const period = periods.get(learner.id);
    return [
      learner.name || "",
      learner.phone || "",
      SCHOOL_NAME,
      SCHOOL_ADDRESS,
      residingAt(learner),
      serialNumberFor(learner),
      VEHICLE_CLASS,
      fmt(period?.first),
      fmt(period?.last),
      FITNESS_CONFIRMED,
      ISSUED_BY,
      "", // Signatory — physical signature
    ]
      .map(csvCell)
      .join(",");
  });
  return [CSV_HEADERS.map(csvCell).join(","), ...rows].join("\n");
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
