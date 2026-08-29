import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import { loadInstructorSignatureBytes } from "@/utils/formSignatures";
import { loadPdfTemplate } from "@/utils/formTemplates";
import { toWinAnsi } from "@/utils/winAnsi";

export interface Form14Data {
  enrollmentNumber: string;
  name: string;
  guardianName: string; // "Son/Wife/Daughter of"
  permanentAddress: string;
  temporaryAddress?: string;
  dob: string;
  vehicleClass: string; // e.g. "LMV"
  enrollmentDate: string;
  llNumber: string;
  llExpiry?: string;
  completionDate?: string;
  competenceTestDate?: string;
  dlNumber?: string;
  dlIssueDate?: string;
  dlAuthority?: string;
  remarks?: string;
  phone?: string;
  email?: string;
}

/**
 * Generates a filled Form-14 PDF by overlaying learner data on the official
 * template (/assets/form-14-template.pdf, A4 595.2 x 842 pts).
 *
 * The template's dotted answer lines were measured from the template itself:
 * they run from x≈387 to x≈529, one per numbered field. Values are drawn at the
 * answer column (x≈392) on each row's baseline so they sit on the dotted line
 * instead of overlapping the question labels on the left.
 */
export async function generateForm14PDF(data: Form14Data): Promise<Uint8Array> {
  const templateBytes = await loadPdfTemplate(
    "/assets/form-14-template.pdf",
    "Form-14 template",
  );

  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fontSize = 10;
  const textColor = rgb(0.05, 0.05, 0.25); // dark navy for filled text

  // Answer column: dotted fill lines run from x≈387 to x≈529. Start values just
  // inside the line and allow long ones to extend slightly into the right margin.
  const answerX = 392;
  const answerMaxWidth = 195;
  // The template's dotted lines sit slightly above the text baseline; lift
  // values a few points so they rest on the line instead of striking through it.
  const LINE_LIFT = 4;

  // Draw a value at the answer column, auto-shrinking the font (down to 7pt)
  // and then ellipsis-truncating so it never spills onto the next row.
  const drawAnswer = (
    text: string | undefined | null,
    y: number,
    opts?: { x?: number; maxWidth?: number; size?: number },
  ) => {
    text = text && toWinAnsi(text);
    if (!text) return;
    const x = opts?.x ?? answerX;
    const maxWidth = opts?.maxWidth ?? answerMaxWidth;
    let size = opts?.size ?? fontSize;
    while (size > 7 && font.widthOfTextAtSize(text, size) > maxWidth) {
      size -= 0.5;
    }
    let out = text;
    if (font.widthOfTextAtSize(out, size) > maxWidth) {
      while (
        out.length > 1 &&
        font.widthOfTextAtSize(out + "…", size) > maxWidth
      ) {
        out = out.slice(0, -1);
      }
      out += "…";
    }
    page.drawText(out, { x, y: y + LINE_LIFT, size, font, color: textColor });
  };

  // Y baselines (pdf-lib origin = bottom-left), measured from the template's
  // dotted lines (y = 842 - line.bottom, +~2pt so text sits on the line).
  const join = (parts: (string | undefined)[]) =>
    parts.filter(Boolean).join("  |  ");

  // "Register for the year ..." — on the header line, just after "year"
  const enrollYear = data.enrollmentDate
    ? new Date(data.enrollmentDate).getFullYear().toString()
    : new Date().getFullYear().toString();
  drawAnswer(enrollYear, 683, { x: 175, maxWidth: 110 });

  drawAnswer(data.enrollmentNumber, 666); // 1. Enrolment number
  drawAnswer(data.name, 651); // 2. Name of the trainee
  drawAnswer(data.guardianName, 634); // 3. Son/wife/daughter of
  drawAnswer(data.permanentAddress, 602); // 4(a). Permanent address
  drawAnswer(data.temporaryAddress, 586); // 4(b). Temporary address
  drawAnswer(data.dob, 570); // 5. Date of birth
  drawAnswer(data.vehicleClass, 554); // 6. Class of vehicle
  drawAnswer(data.enrollmentDate, 538); // 7. Date of enrolment
  drawAnswer(
    join([data.llNumber, data.llExpiry ? `Exp: ${data.llExpiry}` : undefined]),
    522,
  ); // 8. LL number and expiry
  drawAnswer(data.completionDate, 506); // 9. Date of completion
  drawAnswer(data.competenceTestDate, 490); // 10. Date of passing test
  drawAnswer(
    join([
      data.dlNumber,
      data.dlIssueDate ? `Issued: ${data.dlIssueDate}` : undefined,
      data.dlAuthority ? `Auth: ${data.dlAuthority}` : undefined,
    ]),
    459,
  ); // 11. DL number, date, authority
  drawAnswer(
    join([
      data.remarks,
      data.phone ? `Ph: ${data.phone}` : undefined,
      data.email ? `Em: ${data.email}` : undefined,
    ]),
    443,
  ); // 12. Remarks

  // 13. Signature of the licence holder/instructor — sit on the dotted line.
  const signatureBytes = await loadInstructorSignatureBytes();
  const signature = await pdfDoc.embedPng(signatureBytes);
  const sigMaxW = 180;
  const sigMaxH = 22;
  const aspect = signature.width / signature.height;
  let sigW = sigMaxW;
  let sigH = sigW / aspect;
  if (sigH > sigMaxH) {
    sigH = sigMaxH;
    sigW = sigH * aspect;
  }
  page.drawImage(signature, {
    x: answerX,
    y: 425,
    width: sigW,
    height: sigH,
  });

  return pdfDoc.save();
}

/**
 * Trigger a browser download of the generated PDF.
 */
export function downloadPDF(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
