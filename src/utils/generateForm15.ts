import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  rgb,
  StandardFonts,
} from "pdf-lib";

import { loadInstructorSignatureBytes } from "@/utils/formSignatures";
import { loadPdfTemplate } from "@/utils/formTemplates";
import { toWinAnsi } from "@/utils/winAnsi";

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
  /** Learner e-signature captured during onboarding. */
  traineeSignatureBytes?: ArrayBuffer;
  traineeSignatureMimeType?: string;
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

const INSTRUCTOR_SIG_COL = 4;
const TRAINEE_SIG_COL = 5;
const SIG_CELL_PADDING = 3;

/** Row bounds for the session table (pdf-lib y, origin = bottom-left). */
function rowCellBounds(topY: number, rowIndex: number) {
  const cellTop = topY - rowIndex * ROW_H;
  const cellBottom = cellTop - ROW_H;
  return { cellTop, cellBottom };
}

/**
 * Fills Form-15 ("Register showing driving hours spent by a trainee"), A4
 * 595.2 x 842. Fills the four header fields and, when `sessions` are given,
 * one table row per driving session (the template's two preprinted blank rows
 * are painted over and the grid redrawn to fit; overflow continues on extra
 * pages). The instructor-signature column is filled from the school signature
 * image; the trainee column is filled from the learner's onboarding
 * e-signature when supplied.
 *
 * Dotted answer lines (measured from the template) run x≈390→529 at these
 * baselines (pdf-lib y from bottom):
 *   school: 680, trainee: 647, enrolment no.: 613, enrolment date: 579
 */
export async function generateForm15PDF(data: Form15Data): Promise<Uint8Array> {
  const templateBytes = await loadPdfTemplate(
    "/assets/form-15-template.pdf",
    "Form-15 template",
  );

  const pdfDoc = await PDFDocument.load(templateBytes);
  const firstPage = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const textColor = rgb(0.05, 0.05, 0.25);
  const lineColor = rgb(0, 0, 0);
  // Lift values a few points so they rest on the dotted line, not through it.
  const LINE_LIFT = 4;

  const drawAnswer = (text: string | undefined, y: number) => {
    text = text && toWinAnsi(text);
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
    const signatureBytes = await loadInstructorSignatureBytes();
    const instructorSignature = await pdfDoc.embedPng(signatureBytes);
    const traineeSignature = data.traineeSignatureBytes
      ? data.traineeSignatureMimeType === "image/jpeg"
        ? await pdfDoc.embedJpg(data.traineeSignatureBytes)
        : await pdfDoc.embedPng(data.traineeSignatureBytes)
      : undefined;
    fillSessionsTable(
      pdfDoc,
      firstPage,
      font,
      textColor,
      lineColor,
      sessions,
      instructorSignature,
      traineeSignature,
    );
  }

  return pdfDoc.save();
}

/** Fit and center a signature inside one table row. */
function drawSignature(
  page: PDFPage,
  image: PDFImage,
  column: number,
  topY: number,
  rowIndex: number,
) {
  const { cellBottom } = rowCellBounds(topY, rowIndex);
  const cellLeft = COLS[column] + SIG_CELL_PADDING;
  const cellRight = COLS[column + 1] - SIG_CELL_PADDING;
  const cellW = cellRight - cellLeft;
  const innerH = ROW_H - SIG_CELL_PADDING * 2;

  const aspect = image.width / image.height;
  let drawW = cellW;
  let drawH = drawW / aspect;
  if (drawH > innerH) {
    drawH = innerH;
    drawW = drawH * aspect;
  }

  const x = cellLeft + (cellW - drawW) / 2;
  const y = cellBottom + SIG_CELL_PADDING + (innerH - drawH) / 2;
  page.drawImage(image, { x, y, width: drawW, height: drawH });
}

function fillSessionsTable(
  pdfDoc: PDFDocument,
  firstPage: PDFPage,
  font: PDFFont,
  textColor: ReturnType<typeof rgb>,
  lineColor: ReturnType<typeof rgb>,
  sessions: Form15Session[],
  instructorSignature: PDFImage,
  traineeSignature?: PDFImage,
) {
  const left = COLS[0];
  const right = COLS[COLS.length - 1];
  const tableLeft = left - 0.5;
  const tableRight = right + 0.5;

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
    for (let i = 0; i <= rows; i++) {
      const y = topY - i * ROW_H;
      page.drawLine({
        start: { x: tableLeft, y },
        end: { x: tableRight, y },
        thickness: LINE_W,
        color: lineColor,
      });
    }
  };

  /** Paint over template grid lines before redrawing the session table. */
  const eraseTableArea = (page: PDFPage, topY: number, rows: number) => {
    if (rows <= 0) return;
    const bottomY = topY - rows * ROW_H;
    page.drawRectangle({
      x: tableLeft - 1,
      y: bottomY - 2,
      width: tableRight - tableLeft + 2,
      height: topY - bottomY + 4,
      color: rgb(1, 1, 1),
    });
  };

  const drawRowText = (
    page: PDFPage,
    text: string,
    col: number,
    topY: number,
    rowIndex: number,
    base = 9,
  ) => {
    text = toWinAnsi(text);
    const maxWidth = COLS[col + 1] - COLS[col] - 6;
    let size = base;
    while (size > 5 && font.widthOfTextAtSize(text, size) > maxWidth) {
      size -= 0.5;
    }
    const { cellBottom } = rowCellBounds(topY, rowIndex);
    // drawText y is the glyph baseline. Helvetica cap-height is ~0.72×size,
    // so the visual centre of digits sits ~0.36×size above the baseline.
    const y = cellBottom + ROW_H / 2 - size * 0.36;
    const x = COLS[col] + (COLS[col + 1] - COLS[col]) / 2;
    page.drawText(text, {
      x: x - font.widthOfTextAtSize(text, size) / 2,
      y,
      size,
      font,
      color: textColor,
    });
  };

  const drawRows = (page: PDFPage, topY: number, rows: Form15Session[]) => {
    drawGrid(page, topY, rows.length);
    rows.forEach((s, i) => {
      drawRowText(page, s.date, 0, topY, i);
      drawRowText(page, s.fromHrs, 1, topY, i);
      drawRowText(page, s.toHrs, 2, topY, i);
      drawRowText(page, s.vehicleClass || "LMV", 3, topY, i);
      drawSignature(page, instructorSignature, INSTRUCTOR_SIG_COL, topY, i);
      if (traineeSignature) {
        drawSignature(page, traineeSignature, TRAINEE_SIG_COL, topY, i);
      }
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
    x: tableLeft - 1,
    y: PREPRINTED_BOTTOM - 2,
    width: tableRight - tableLeft + 2,
    height: HEADER_BOTTOM - PREPRINTED_BOTTOM + 4,
    color: rgb(1, 1, 1),
  });

  const { width: pageW, height: pageH } = firstPage.getSize();
  const firstPageRows = Math.floor(
    (HEADER_BOTTOM - PAGE_BOTTOM_MARGIN) / ROW_H,
  );
  eraseTableArea(firstPage, HEADER_BOTTOM, firstPageRows);
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
    eraseTableArea(page, dataTop, pageRows);
    drawRows(page, dataTop, remaining.slice(0, pageRows));
    remaining = remaining.slice(pageRows);
  }
}
