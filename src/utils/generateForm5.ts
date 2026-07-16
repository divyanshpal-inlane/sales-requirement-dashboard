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
 * Fills the Inlane Motor Driving School Form-5 Certificate.
 *
 * The template is a Canva export with MediaBox [0, 8.04, 315, 455.04] —
 * i.e. a ~315 x 447 pt visible page whose origin sits 8 pt above y = 0.
 * The coordinates below are absolute pdf-lib user-space values (the 8 pt
 * MediaBox offset is already baked in), measured against the dotted
 * blanks by rasterising the template.
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
  // Lift values a couple of points so they rest on the dotted blank, not
  // through it. (The page is roughly half A4, so lifts/sizes are ~half of
  // the old A4 template's values.)
  const LINE_LIFT = 2;
  const BASE_SIZE = 9;
  const MIN_SIZE = 6;

  const fit = (text: string, maxWidth: number, base = BASE_SIZE) => {
    let size = base;
    while (size > MIN_SIZE && font.widthOfTextAtSize(text, size) > maxWidth) {
      size -= 0.25;
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
    size = BASE_SIZE,
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

  drawAnswer(data.certificateNo, 36, 294, 74); // No.
  drawAnswer(data.date, 234, 294, 58); // Date
  drawAnswer(data.name, 216, 276, 77); // Shri/Smt./Kumari ___
  drawAnswer(data.guardian, 114, 258.5, 179); // Son/Wife/Daughter of ___
  drawWrapped(data.address, [
    { x: 53, y: 240.5, maxWidth: 240 },
    { x: 27, y: 222.5, maxWidth: 262 },
  ]); // residing at ___ (2 lines)
  drawAnswer(data.enrolledOn, 138, 204.5, 80); // enrolled in this school on ___
  drawAnswer(data.serialNumber, 131, 186.5, 74); // serial number ___
  drawAnswer(data.vehicleClass, 23, 153, 177); // training in driving of ___
  drawAnswer(data.periodFrom, 131, 133, 162); // for a period from ___
  drawAnswer(data.periodTo, 32, 117, 134); // to ___ satisfactorily

  return pdfDoc.save();
}
