import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

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
 * Fills the Lane Motor Driving School Form-5 Certificate (A5, 420 x 595.55).
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
  const LINE_LIFT = 4;

  const fit = (text: string, maxWidth: number, base = 10) => {
    let size = base;
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
    return { out, size };
  };

  const drawAnswer = (
    text: string | undefined | null,
    x: number,
    y: number,
    maxWidth: number,
  ) => {
    if (!text) return;
    const { out, size } = fit(text, maxWidth);
    page.drawText(out, { x, y: y + LINE_LIFT, size, font, color: textColor });
  };

  // Greedy word-wrap across multiple (x, y, maxWidth) slots.
  const drawWrapped = (
    text: string | undefined | null,
    slots: { x: number; y: number; maxWidth: number }[],
    size = 10,
  ) => {
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

  drawAnswer(data.certificateNo, 50, 383, 100); // No.
  drawAnswer(data.date, 305, 383, 95); // Date
  drawAnswer(data.name, 222, 359, 180); // Shri/Smt./Kumari ___
  drawAnswer(data.guardian, 145, 335, 255); // Son/Wife/Daughter of ___
  drawWrapped(data.address, [
    { x: 82, y: 311, maxWidth: 318 },
    { x: 28, y: 287, maxWidth: 372 },
  ]); // residing at ___ (2 lines)
  drawAnswer(data.enrolledOn, 168, 263, 130); // enrolled in this school on ___
  drawAnswer(data.serialNumber, 170, 239, 100); // serial number ___
  drawAnswer(data.vehicleClass, 30, 192, 238); // training in driving of ___
  drawAnswer(data.periodFrom, 160, 167, 240); // for a period from ___
  drawAnswer(data.periodTo, 38, 143, 160); // to ___ satisfactorily

  return pdfDoc.save();
}
