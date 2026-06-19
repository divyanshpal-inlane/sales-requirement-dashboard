import { AdminEarningsRow } from "@/queries/instructorEarnings";

/**
 * CSV export for the admin Instructor Earnings overview.
 */

/** Triggers a browser download. A UTF-8 BOM is prepended so Excel renders the
 * ₹ symbol and names correctly. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Cell = string | number | null | undefined;

function esc(val: Cell): string {
  if (val == null) return "";
  const s = String(val);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers.map(esc).join(",")];
  for (const r of rows) lines.push(r.map(esc).join(","));
  return lines.join("\n");
}

export function buildEarningsCsv(rows: AdminEarningsRow[]): string {
  const headers = [
    "Instructor",
    "Phone",
    "KAM",
    "KAM Phone",
    "Per-class Rate",
    "Classes (this month)",
    "Earnings (this month)",
    "Pending Payout",
  ];
  const out: Cell[][] = [];
  let tClasses = 0,
    tEarnings = 0,
    tPending = 0;

  for (const r of rows) {
    out.push([
      r.name,
      r.phone,
      r.kamName,
      r.kamPhone,
      Math.round(r.perClassRate),
      r.classesThisMonth,
      Math.round(r.earningsThisMonth),
      Math.round(r.pendingPayout),
    ]);
    tClasses += r.classesThisMonth;
    tEarnings += r.earningsThisMonth;
    tPending += r.pendingPayout;
  }

  out.push([
    "TOTAL",
    "",
    "",
    "",
    "",
    tClasses,
    Math.round(tEarnings),
    Math.round(tPending),
  ]);

  return toCsv(headers, out);
}

export function earningsCsvFilename(dateStr: string): string {
  return `instructor-earnings_${dateStr}.csv`;
}
