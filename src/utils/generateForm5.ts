import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import { toWinAnsi } from "@/utils/winAnsi";

export interface Form5CertificateData {
  certificateNo?: string;
  date?: string;
  name: string; // filled after preprinted "Shri / Smt. / Kumari"
  guardian?: string; // filled after preprinted "Son / Wife / Daughter of"
  address?: string; // "residing at"
  enrolledOn?: string;
  serialNumber?: string;
  vehicleClass?: string;
  periodFrom?: string;
  periodTo?: string;
}

/**
 * Fills the Inlane Motor Driving School Form-5 Certificate (A4, 595 x 842).
 *
 * Blanks are inline within the certificate sentences; positions were measured
 * from the template. Coordinates below are pdf-lib (origin = bottom-left).
 */
export async function generateForm5PDF(
  data: Form5CertificateData,
): Promise<Uint8Array> {
  const templateBytes = await fetch(
    "/assets/form-5-certificate-template.pdf",
  ).then((res) => {
    if (!res.ok) throw new Error("Failed to load Form-5 certificate template");
    return res.arrayBuffer();
  });

  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const textColor = rgb(0.05, 0.05, 0.25);
  // Lift values a few points so they rest on the dotted blank, not through it.
  const LINE_LIFT = 6;

  const fit = (text: string, maxWidth: number, base = 14) => {
    let size = base;
    while (size > 10 && font.widthOfTextAtSize(text, size) > maxWidth) {
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
    return { out, size };
  };

  const drawAnswer = (
    text: string | undefined | null,
    x: number,
    y: number,
    maxWidth: number,
  ) => {
    text = text && toWinAnsi(text);
    if (!text) return;
    const { out, size } = fit(text, maxWidth);
    page.drawText(out, { x, y: y + LINE_LIFT, size, font, color: textColor });
  };

  // Greedy word-wrap across multiple (x, y, maxWidth) slots.
  const drawWrapped = (
    text: string | undefined | null,
    slots: { x: number; y: number; maxWidth: number }[],
    size = 14,
  ) => {
    text = text && toWinAnsi(text);
    if (!text) return;
    const words = text.split(/\s+/).filter(Boolean);
    let wi = 0;
    for (let s = 0; s < slots.length && wi < words.length; s++) {
      const { x, y, maxWidth } = slots[s];
      let line = "";
      while (wi < words.length) {
        const trial = line ? `${line} ${words[wi]}` : words[wi];
        if (line && font.widthOfTextAtSize(trial, size) > maxWidth) break;
        line = trial;
        wi++;
      }
      if (s === slots.length - 1 && wi < words.length) {
        while (
          line.length > 1 &&
          font.widthOfTextAtSize(`${line}…`, size) > maxWidth
        ) {
          line = line.slice(0, -1);
        }
        line += "…";
      }
      page.drawText(line, { x, y: y + LINE_LIFT, size, font, color: textColor });
    }
  };

  drawAnswer(data.certificateNo, 71, 541, 142); // No.
  drawAnswer(data.date, 448, 541, 118); // Date
  drawAnswer(data.name, 314, 508, 255); // Shri/Smt./Kumari ___
  drawAnswer(data.guardian, 205, 474, 361); // Son/Wife/Daughter of ___
  drawWrapped(data.address, [
    { x: 116, y: 440, maxWidth: 450 },
    { x: 40, y: 406, maxWidth: 527 },
  ]); // residing at ___ (2 lines)
  drawAnswer(data.enrolledOn, 238, 372, 184); // enrolled in this school on ___
  drawAnswer(data.serialNumber, 241, 338, 142); // serial number ___
  drawAnswer(data.vehicleClass, 42, 271, 337); // training in driving of ___
  drawAnswer(data.periodFrom, 227, 236, 340); // for a period from ___
  drawAnswer(data.periodTo, 54, 202, 227); // to ___ satisfactorily

  return pdfDoc.save();
}
