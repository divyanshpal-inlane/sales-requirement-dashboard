import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface Form15Data {
  schoolName: string;
  traineeName: string;
  enrollmentNumber: string;
  enrollmentDate: string;
}

/**
 * Fills Form-15 ("Register showing driving hours spent by a trainee"), A4
 * 595.2 x 842. Only the four header fields are filled — the driving-hours table
 * below is left blank for manual per-session entries.
 *
 * Dotted answer lines (measured from the template) run x≈390→529 at these
 * baselines (pdf-lib y from bottom):
 *   school: 680, trainee: 647, enrolment no.: 613, enrolment date: 579
 */
export async function generateForm15PDF(data: Form15Data): Promise<Uint8Array> {
  const templateBytes = await fetch("/assets/form-15-template.pdf").then(
    (res) => {
      if (!res.ok) throw new Error("Failed to load Form-15 template");
      return res.arrayBuffer();
    },
  );

  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const textColor = rgb(0.05, 0.05, 0.25);
  // Lift values a few points so they rest on the dotted line, not through it.
  const LINE_LIFT = 4;

  const drawAnswer = (text: string | undefined, y: number) => {
    if (!text) return;
    const x = 392;
    const maxWidth = 195;
    let size = 10;
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

  drawAnswer(data.schoolName, 680);
  drawAnswer(data.traineeName, 647);
  drawAnswer(data.enrollmentNumber, 613);
  drawAnswer(data.enrollmentDate, 579);

  return pdfDoc.save();
}
