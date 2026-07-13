import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";

/** One driving session — a row in the Form-15 hours register. */
export interface Form15Session {
  date: string; // dd/MM/yyyy
  fromHrs: string; // HH:mm
  toHrs: string; // HH:mm
  vehicleClass?: string;
}

export interface Form15Data {
  schoolName: string;
  traineeName: string;
  enrollmentNumber: string;
  enrollmentDate: string;
  /** Driving sessions to list in the table; omit to leave it blank. */
  sessions?: Form15Session[];
}

/**
 * Table geometry measured from the template's content stream (pdf-lib
 * coordinates, origin = bottom-left). Columns: Date | From | To | Class of
 * vehicle | Signature of instructor | Signature of trainee.
 */
const COLS = [68.85, 145.13, 221.42, 297.7, 373.99, 449.97, 526.4];
const HEADER_BOTTOM = 483.13; // bottom line of the printed "1…6" header row
const PREPRINTED_BOTTOM = 381.82; // bottom of the template's two blank rows
const ROW_H = 23;
const PAGE_BOTTOM_MARGIN = 45;
const CONT_TABLE_TOP = 790; // table top on continuation pages
const CONT_HEADER_H = 44;
const LINE_W = 0.5;

const CONT_LABELS = [
  "Date",
  "From ... hrs",
  "To ... hrs",
  "Class of vehicle",
  "Signature of the instructor",
  "Signature or thumb impression of the trainee",
];

/**
 * Fills Form-15 ("Register showing driving hours spent by a trainee"), A4
 * 595.2 x 842. Fills the four header fields and, when `sessions` are given,
 * one table row per driving session (the template's two preprinted blank rows
 * are painted over and the grid redrawn to fit; overflow continues on extra
 * pages). Signature columns are always left blank for manual signing.
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
  const firstPage = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const textColor = rgb(0.05, 0.05, 0.25);
  const lineColor = rgb(0, 0, 0);
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
    firstPage.drawText(out, {
      x,
      y: y + LINE_LIFT,
      size,
      font,
      color: textColor,
    });
  };

  drawAnswer(data.schoolName, 680);
  drawAnswer(data.traineeName, 647);
  drawAnswer(data.enrollmentNumber, 613);
  drawAnswer(data.enrollmentDate, 579);

  const sessions = data.sessions ?? [];
  if (sessions.length > 0) {
    fillSessionsTable(pdfDoc, firstPage, font, textColor, lineColor, sessions);
  }

  return pdfDoc.save();
}

function fillSessionsTable(
  pdfDoc: PDFDocument,
  firstPage: PDFPage,
  font: PDFFont,
  textColor: ReturnType<typeof rgb>,
  lineColor: ReturnType<typeof rgb>,
  sessions: Form15Session[],
) {
  const left = COLS[0];
  const right = COLS[COLS.length - 1];

  const centerText = (
    page: PDFPage,
    text: string,
    col: number,
    y: number,
    base = 9,
  ) => {
    const maxWidth = COLS[col + 1] - COLS[col] - 6;
    let size = base;
    while (size > 5 && font.widthOfTextAtSize(text, size) > maxWidth) {
      size -= 0.5;
    }
    const x = COLS[col] + (COLS[col + 1] - COLS[col]) / 2;
    page.drawText(text, {
      x: x - font.widthOfTextAtSize(text, size) / 2,
      y,
      size,
      font,
      color: textColor,
    });
  };

  const drawGrid = (page: PDFPage, topY: number, rows: number) => {
    const bottomY = topY - rows * ROW_H;
    for (const x of COLS) {
      page.drawLine({
        start: { x, y: topY },
        end: { x, y: bottomY },
        thickness: LINE_W,
        color: lineColor,
      });
    }
    for (let i = 1; i <= rows; i++) {
      const y = topY - i * ROW_H;
      page.drawLine({
        start: { x: left, y },
        end: { x: right, y },
        thickness: LINE_W,
        color: lineColor,
      });
    }
  };

  const drawRows = (page: PDFPage, topY: number, rows: Form15Session[]) => {
    drawGrid(page, topY, rows.length);
    rows.forEach((s, i) => {
      const y = topY - i * ROW_H - ROW_H / 2 - 3;
      centerText(page, s.date, 0, y);
      centerText(page, s.fromHrs, 1, y);
      centerText(page, s.toHrs, 2, y);
      centerText(page, s.vehicleClass || "LMV", 3, y);
    });
  };

  // Word-wrap a label within a column, centered as a block.
  const drawWrappedLabel = (
    page: PDFPage,
    text: string,
    col: number,
    topY: number,
  ) => {
    const size = 7.5;
    const lineH = 9;
    const maxWidth = COLS[col + 1] - COLS[col] - 8;
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (line && font.widthOfTextAtSize(trial, size) > maxWidth) {
        lines.push(line);
        line = w;
      } else {
        line = trial;
      }
    }
    if (line) lines.push(line);
    const blockH = lines.length * lineH;
    let y = topY - (CONT_HEADER_H - blockH) / 2 - lineH + 2;
    for (const l of lines) {
      const x =
        COLS[col] +
        (COLS[col + 1] - COLS[col]) / 2 -
        font.widthOfTextAtSize(l, size) / 2;
      page.drawText(l, { x, y, size, font, color: textColor });
      y -= lineH;
    }
  };

  // Paint over the template's two preprinted blank rows (their inner lines
  // don't match the per-session row height), keeping the header row intact.
  firstPage.drawRectangle({
    x: left - 0.6,
    y: PREPRINTED_BOTTOM - 0.6,
    width: right - left + 1.2,
    height: HEADER_BOTTOM - PREPRINTED_BOTTOM,
    color: rgb(1, 1, 1),
  });

  const { width: pageW, height: pageH } = firstPage.getSize();
  const firstPageRows = Math.floor(
    (HEADER_BOTTOM - PAGE_BOTTOM_MARGIN) / ROW_H,
  );
  drawRows(firstPage, HEADER_BOTTOM, sessions.slice(0, firstPageRows));

  let remaining = sessions.slice(firstPageRows);
  while (remaining.length > 0) {
    const page = pdfDoc.addPage([pageW, pageH]);
    page.drawText("FORM 15 — DRIVING HOURS (CONTINUED)", {
      x: left,
      y: CONT_TABLE_TOP + 14,
      size: 10,
      font,
      color: textColor,
    });
    // Header row with the column labels, then the data grid below it.
    page.drawLine({
      start: { x: left, y: CONT_TABLE_TOP },
      end: { x: right, y: CONT_TABLE_TOP },
      thickness: LINE_W,
      color: lineColor,
    });
    for (const x of COLS) {
      page.drawLine({
        start: { x, y: CONT_TABLE_TOP },
        end: { x, y: CONT_TABLE_TOP - CONT_HEADER_H },
        thickness: LINE_W,
        color: lineColor,
      });
    }
    CONT_LABELS.forEach((label, col) =>
      drawWrappedLabel(page, label, col, CONT_TABLE_TOP),
    );
    const dataTop = CONT_TABLE_TOP - CONT_HEADER_H;
    page.drawLine({
      start: { x: left, y: dataTop },
      end: { x: right, y: dataTop },
      thickness: LINE_W,
      color: lineColor,
    });
    const pageRows = Math.floor((dataTop - PAGE_BOTTOM_MARGIN) / ROW_H);
    drawRows(page, dataTop, remaining.slice(0, pageRows));
    remaining = remaining.slice(pageRows);
  }
}
