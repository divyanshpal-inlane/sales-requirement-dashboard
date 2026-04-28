import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { zipSync } from "https://esm.sh/fflate@0.8.0";
// Updated to a version where encodeBase64 is strictly defined
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

// =========================================================
// CONFIGURATIONS
// =========================================================
const TABLES_TO_BACKUP = [
  "Learner",
  "Schedule",
  "enrollment",
  "payment",
  "reschedule_requests",
  "schedule_preferences",
  "Admin",
  "Courses",
  "Lesson",
  "Serviceable_Areas",
];
const EMAIL_RECIPIENTS = ["nikhilesh@inlane.in"];
const BACKUP_WINDOW_HOURS = 24;

const SMTP_CONFIG = {
  hostname: "smtp.gmail.com",
  port: 465,
  tls: true,
  auth: {
    username: Deno.env.get("SMTP_USERNAME")!,
    password: Deno.env.get("SMTP_PASSWORD")!,
  },
};
const SMTP_FROM = Deno.env.get("SMTP_FROM")!;

// Supabase Init
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =========================================================
// MAIN LOGIC
// =========================================================

serve(async (_req) => {
  try {
    console.log("🚀 Starting backup process...");
    const zipData: Record<string, Uint8Array> = {};
    let tableRowsHtml = "";

    const windowTime = new Date(
      Date.now() - BACKUP_WINDOW_HOURS * 60 * 60 * 1000,
    ).toISOString();

    for (const table of TABLES_TO_BACKUP) {
      const { data, error } = await supabase.from(table).select("*");
      if (error) throw new Error(`Fetch error [${table}]: ${error.message}`);

      const { count: newCount } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .gt("created_at", windowTime);

      const headers =
        data && data.length > 0 ? Object.keys(data[0]).join(",") : "";
      const rows = (data || []).map((row) =>
        Object.values(row)
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(","),
      );
      const csvContent = headers
        ? [headers, ...rows].join("\n")
        : "No data found";

      zipData[`${table}.csv`] = new TextEncoder().encode(csvContent);

      tableRowsHtml += `
        <tr>
          <td style="border:1px solid #ddd;padding:8px;">${table}</td>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;">${data?.length || 0}</td>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;color:${(newCount ?? 0) > 0 ? "#2e7d32" : "#757575"}; font-weight:bold;">
            +${newCount ?? 0}
          </td>
        </tr>`;
    }

    const zippedBuffer = zipSync(zipData);
    const base64Zip = encodeBase64(zippedBuffer);

    const htmlBody = `
      <html>
        <body style="font-family:sans-serif;color:#333;">
          <h2>Daily Backup Report</h2>
          <table style="border-collapse:collapse;width:100%;max-width:500px;">
            <thead>
              <tr style="background-color:#f8f9fa;">
                <th style="border:1px solid #ddd;padding:8px;text-align:left;">Table</th>
                <th style="border:1px solid #ddd;padding:8px;">Total</th>
                <th style="border:1px solid #ddd;padding:8px;">New (24h)</th>
              </tr>
            </thead>
            <tbody>${tableRowsHtml}</tbody>
          </table>
        </body>
      </html>`;

    const client = new SMTPClient({ connection: SMTP_CONFIG });

    await client.send({
      from: SMTP_FROM,
      to: EMAIL_RECIPIENTS,
      subject: `Inlane Backup - ${new Date().toLocaleDateString()}`,
      html: htmlBody,
      attachments: [
        {
          filename: `backup_${new Date().toISOString().split("T")[0]}.zip`,
          content: base64Zip,
          encoding: "base64",
          contentType: "application/zip",
        },
      ],
    });

    await client.close();
    return new Response(JSON.stringify({ message: "Success" }), {
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
});
