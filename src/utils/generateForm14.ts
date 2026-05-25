import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

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
 * Generates a filled Form-14 PDF by overlaying learner data on the official template.
 *
 * The template is loaded from /assets/form-14-template.pdf (public directory).
 * All text is drawn at fixed Y-coordinates that correspond to the dotted lines
 * below each field label in the standard CMV Rules Form 14 layout.
 *
 * Page size: A4 (595.22 x 842 pts)
 */
export async function generateForm14PDF(data: Form14Data): Promise<Uint8Array> {
  // Load the template PDF from public assets
  const templateUrl = "/assets/form-14-template.pdf";
  const templateBytes = await fetch(templateUrl).then((res) => {
    if (!res.ok) throw new Error("Failed to load Form-14 template");
    return res.arrayBuffer();
  });

  const pdfDoc = await PDFDocument.load(templateBytes);
  const pages = pdfDoc.getPages();
  const page = pages[0];

  // Embed a standard font for the filled-in data
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fontSize = 11;
  const smallFontSize = 10;
  const textColor = rgb(0.05, 0.05, 0.25); // dark navy for filled text

  // Left margin for all data entries (after the dotted lines)
  const leftMargin = 72;

  // ---- Coordinate mapping ----
  // The Form-14 PDF has 13 fields, each with a label line and a dotted fill line.
  // These Y-coordinates target the dotted lines where data should be written.
  // Y is measured from BOTTOM of the page in pdf-lib.
  //
  // The form has these sections (top to bottom):
  //   Title/header: ~top 120pt
  //   "Register for the year": ~705
  //   1. Enrolment number: ~670
  //   2. Name of the trainee: ~635
  //   3. Son/wife/daughter of: ~600
  //   4(a). Permanent address: ~565
  //   4(b). Temporary address: ~530
  //   5. Date of birth: ~495
  //   6. Class of vehicle: ~460
  //   7. Date of enrolment: ~425
  //   8. LL number and expiry: ~390
  //   9. Date of completion: ~355
  //   10. Date of passing test: ~320
  //   11. DL number, date, authority: ~285
  //   12. Remarks: ~245
  //   13. Signature: ~210

  // Helper to draw text at a given position
  const drawField = (
    text: string,
    x: number,
    y: number,
    options?: { size?: number; font?: typeof font },
  ) => {
    if (!text) return;
    page.drawText(text, {
      x,
      y,
      size: options?.size || fontSize,
      font: options?.font || font,
      color: textColor,
    });
  };

  // Register year — extract year from enrollment date
  const enrollYear = data.enrollmentDate
    ? new Date(data.enrollmentDate).getFullYear().toString()
    : new Date().getFullYear().toString();
  drawField(enrollYear, 300, 705);

  // 1. Enrolment number
  drawField(data.enrollmentNumber, leftMargin, 670);

  // 2. Name of the trainee
  drawField(data.name, leftMargin, 635);

  // 3. Son/wife/daughter of
  drawField(data.guardianName, leftMargin, 600);

  // 4(a). Permanent address
  // Handle long addresses by truncating or wrapping
  const maxCharsPerLine = 70;
  if (data.permanentAddress && data.permanentAddress.length > maxCharsPerLine) {
    const line1 = data.permanentAddress.substring(0, maxCharsPerLine);
    const line2 = data.permanentAddress.substring(maxCharsPerLine);
    drawField(line1, leftMargin, 565);
    drawField(line2, leftMargin, 553, { size: smallFontSize });
  } else {
    drawField(data.permanentAddress, leftMargin, 565);
  }

  // 4(b). Temporary address
  if (data.temporaryAddress) {
    drawField(data.temporaryAddress, leftMargin, 530);
  }

  // 5. Date of birth
  drawField(data.dob, leftMargin, 495);

  // 6. Class of vehicle
  drawField(data.vehicleClass, leftMargin, 460);

  // 7. Date of enrolment
  drawField(data.enrollmentDate, leftMargin, 425);

  // 8. Learner's licence number and date of expiry
  const llText = [
    data.llNumber,
    data.llExpiry ? `Expiry: ${data.llExpiry}` : "",
  ]
    .filter(Boolean)
    .join("  |  ");
  drawField(llText, leftMargin, 390);

  // 9. Date of completion of the course
  drawField(data.completionDate || "", leftMargin, 355);

  // 10. Date of passing the test of competence
  drawField(data.competenceTestDate || "", leftMargin, 320);

  // 11. Driving licence number, date, and authority
  const dlText = [
    data.dlNumber,
    data.dlIssueDate ? `Issued: ${data.dlIssueDate}` : "",
    data.dlAuthority ? `Authority: ${data.dlAuthority}` : "",
  ]
    .filter(Boolean)
    .join("  |  ");
  drawField(dlText, leftMargin, 285);

  // 12. Remarks — include phone and email as reference
  const remarksLines = [
    data.remarks,
    data.phone ? `Phone: ${data.phone}` : "",
    data.email ? `Email: ${data.email}` : "",
  ].filter(Boolean);
  drawField(remarksLines.join("  |  "), leftMargin, 245, {
    size: smallFontSize,
  });

  // Field 13 (Signature) is left blank for manual signature

  // Serialize the PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
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
