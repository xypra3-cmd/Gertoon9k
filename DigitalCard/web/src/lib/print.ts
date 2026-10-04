// Print geometry for a 90×55 mm business card with 3 mm bleed (96×61 mm), 300 dpi.
export const MM = {
  trimW: 90,
  trimH: 55,
  bleed: 3,
  get fullW() {
    return this.trimW + 2 * this.bleed;
  },
  get fullH() {
    return this.trimH + 2 * this.bleed;
  },
};

export const DPI = 300;
export const mmToPx300 = (mm: number) => Math.round((mm / 25.4) * DPI);
/** CSS px are 96 per inch. */
export const mmToCssPx = (mm: number) => (mm / 25.4) * 96;

/** 96×61 mm @ 300 dpi = 1134 × 720 px */
export const FULL_PX = { w: mmToPx300(MM.fullW), h: mmToPx300(MM.fullH) };
export const PIXEL_RATIO = FULL_PX.w / mmToCssPx(MM.fullW);

/** Crop a full-bleed PNG to the trim box (for A4 imposition). */
export async function cropToTrim(fullPngDataUrl: string): Promise<string> {
  const img = new Image();
  img.src = fullPngDataUrl;
  await img.decode();
  const scale = img.width / MM.fullW;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(MM.trimW * scale);
  canvas.height = Math.round(MM.trimH * scale);
  canvas
    .getContext('2d')!
    .drawImage(img, MM.bleed * scale, MM.bleed * scale, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

type Doc = import('jspdf').jsPDF;

/** Crop marks inside the bleed area of a single 96×61 page (they are trimmed away when cut). */
export function drawCornerMarks(doc: Doc) {
  const { bleed: b, fullW: W, fullH: H } = MM;
  doc.setLineWidth(0.1);
  doc.setDrawColor(0, 0, 0);
  const len = b - 0.5;
  for (const x of [b, W - b]) {
    doc.line(x, 0, x, len);
    doc.line(x, H, x, H - len);
  }
  for (const y of [b, H - b]) {
    doc.line(0, y, len, y);
    doc.line(W, y, W - len, y);
  }
}

/** 10-up imposition on A4 (2 × 5, trimmed cards butted together) with outer crop marks. */
export const A4 = { w: 210, h: 297, cols: 2, rows: 5 };
export function a4Origin() {
  const gridW = A4.cols * MM.trimW;
  const gridH = A4.rows * MM.trimH;
  return { x: (A4.w - gridW) / 2, y: (A4.h - gridH) / 2, gridW, gridH };
}

export function drawA4Marks(doc: Doc) {
  const { x, y, gridW, gridH } = a4Origin();
  doc.setLineWidth(0.1);
  const gap = 2;
  const len = 6;
  for (let c = 0; c <= A4.cols; c++) {
    const xx = x + c * MM.trimW;
    doc.line(xx, y - gap - len, xx, y - gap);
    doc.line(xx, y + gridH + gap, xx, y + gridH + gap + len);
  }
  for (let r = 0; r <= A4.rows; r++) {
    const yy = y + r * MM.trimH;
    doc.line(x - gap - len, yy, x - gap, yy);
    doc.line(x + gridW + gap, yy, x + gridW + gap + len, yy);
  }
}
