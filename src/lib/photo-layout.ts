// Layout for the photo spread: prints scattered across a table, different on every visit.
//
// Goals, in order:
// 1. Fill the available width edge to edge; when the prints don't fit at a sensible size,
//    wrap onto more rows (so phones get a short, wide spread instead of a swipe strip).
// 2. Look random: the order, the exact position and the tilt of each print change with
//    the seed (a new seed per page load), but resizing keeps the same seed, so the spread
//    reflows instead of reshuffling.
// 3. Never bury a photo: at least MIN_VISIBLE of every print is covered by no other print.
//    This is checked against the union of *all* other prints, so it holds for any stacking
//    order (hovering lifts a print to the top, which changes the order).
//
// How:
// - Print size: every print has the same long edge L; its short edge follows the photo's
//   aspect ratio. Rows are tried from 1 upwards: the shuffled prints are split into R
//   balanced rows and L is chosen so the fullest row spans the width with neighbours
//   overlapping by about OVERLAP of a print. The first R that gives L >= MIN_LONG_EDGE wins,
//   and L is capped at MAX_LONG_EDGE.
// - Placement: each row is justified across the width (fuller rows overlap more, emptier
//   rows overlap less), rows overlap vertically by ROW_OVERLAP, and every print is nudged
//   by a random jitter and given a random tilt.
// - Check: the visible share of each print is measured by sampling a grid of points over it
//   (tilt included) and testing them against every other print. If any print shows less
//   than MIN_VISIBLE, the attempt is thrown away and retried with a derived seed and less
//   jitter. The final attempt has no jitter or tilt, which always passes with these settings.

export type PrintBox = {
  /** Top-left corner and size of the untilted print, in px, relative to the spread. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Tilt in degrees, around the print's centre. */
  r: number;
};

export type SpreadLayout = {
  /** One box per photo, in the photos' own order. */
  boxes: PrintBox[];
  /** Height the spread needs, in px. */
  height: number;
  /** Photo indices in placement order (rows top to bottom, left to right). */
  order: number[];
  /** Long edge of every print, in px. */
  longEdge: number;
};

export const SPREAD = {
  MIN_VISIBLE: 0.4, // share of each print that no other print covers (the hard floor asked for is 0.25)
  OVERLAP: 0.2, // target overlap between neighbours in a row, as a share of print width
  ROW_OVERLAP: 0.12, // rows overlap by this share of the row height
  MIN_LONG_EDGE: 150, // px; below this a row is split
  MAX_LONG_EDGE: 280, // px
  MAX_TILT: 6, // degrees
  MIN_TILT: 1.5, // degrees; keeps every print visibly askew
  JITTER_X: 0.1, // random shift, as a share of print width / height
  JITTER_Y: 0.12,
  PAD: 14, // px kept clear at the edges (tilted corners poke out a little)
  ATTEMPTS: 40,
  SAMPLES: 12, // grid points per side when measuring visibility
} as const;

/** Small, fast seeded PRNG (mulberry32); returns floats in [0, 1). */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Split into `rows` contiguous groups whose sizes differ by at most one (fuller rows first). */
function split<T>(items: T[], rows: number) {
  const out: T[][] = [];
  let at = 0;
  for (let r = 0; r < rows; r++) {
    const size = Math.ceil((items.length - at) / (rows - r));
    out.push(items.slice(at, at + size));
    at += size;
  }
  return out;
}

/** Share of box `i` (tilt included) that no other box covers. */
export function visibleShare(boxes: PrintBox[], i: number, samples: number = SPREAD.SAMPLES) {
  const b = boxes[i];
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const rad = (b.r * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const others = boxes
    .filter((_, j) => j !== i)
    .map((o) => {
      const r = (-o.r * Math.PI) / 180;
      return { cx: o.x + o.w / 2, cy: o.y + o.h / 2, hw: o.w / 2, hh: o.h / 2, cos: Math.cos(r), sin: Math.sin(r) };
    });
  let covered = 0;
  for (let a = 0; a < samples; a++) {
    for (let c = 0; c < samples; c++) {
      const u = ((a + 0.5) / samples - 0.5) * b.w;
      const v = ((c + 0.5) / samples - 0.5) * b.h;
      const px = cx + u * cos - v * sin;
      const py = cy + u * sin + v * cos;
      const hit = others.some((o) => {
        const dx = px - o.cx;
        const dy = py - o.cy;
        return Math.abs(dx * o.cos - dy * o.sin) <= o.hw && Math.abs(dx * o.sin + dy * o.cos) <= o.hh;
      });
      if (hit) covered++;
    }
  }
  return 1 - covered / (samples * samples);
}

/** Axis-aligned bounds of a tilted box. */
function bounds(b: PrintBox) {
  const rad = (Math.abs(b.r) * Math.PI) / 180;
  const w = b.w * Math.cos(rad) + b.h * Math.sin(rad);
  const h = b.w * Math.sin(rad) + b.h * Math.cos(rad);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  return { left: cx - w / 2, right: cx + w / 2, top: cy - h / 2, bottom: cy + h / 2 };
}

/**
 * Lay out prints with the given aspect ratios (width / height) across `width` px.
 * Deterministic for a given (ratios, width, seed).
 */
export function layoutSpread(ratios: number[], width: number, seed: number): SpreadLayout {
  const n = ratios.length;
  if (n === 0 || width <= 0) return { boxes: [], height: 0, order: [], longEdge: 0 };

  // Size of each print per px of long edge.
  const fw = ratios.map((r) => (r >= 1 ? 1 : r));
  const fh = ratios.map((r) => (r >= 1 ? 1 / r : 1));
  const usable = Math.max(width - 2 * SPREAD.PAD, 1);

  let result: SpreadLayout | null = null;
  for (let attempt = 0; attempt < SPREAD.ATTEMPTS; attempt++) {
    const rand = mulberry32(seed + attempt * 7919);
    const last = attempt === SPREAD.ATTEMPTS - 1;
    const calm = last ? 0 : 1 - attempt / SPREAD.ATTEMPTS; // jitter shrinks with each retry
    const ids = shuffle(
      Array.from({ length: n }, (_, i) => i),
      rand,
    );

    // Fewest rows that keep prints at a sensible size.
    let rows: number[][] = [ids];
    let L = 0;
    for (let R = 1; R <= n; R++) {
      rows = split(ids, R);
      L = Math.min(
        ...rows.map((row) => {
          const sum = row.reduce((s, i) => s + fw[i], 0);
          const overlap = row.length > 1 ? SPREAD.OVERLAP * (row.length - 1) * (sum / row.length) : 0;
          return usable / (sum - overlap);
        }),
      );
      if (L >= SPREAD.MIN_LONG_EDGE) break;
    }
    L = Math.min(L, SPREAD.MAX_LONG_EDGE);

    const boxes: PrintBox[] = new Array(n);
    let top = 0;
    for (const row of rows) {
      const ws = row.map((i) => fw[i] * L);
      const hs = row.map((i) => fh[i] * L);
      const rowH = Math.max(...hs);
      const total = ws.reduce((s, w) => s + w, 0);
      const avg = total / row.length;
      // Justify across the width; a sparse row may not spread wider than a small gap,
      // and is centred instead.
      let gap = row.length > 1 ? (usable - total) / (row.length - 1) : 0;
      gap = Math.min(gap, avg * 0.15);
      const span = total + gap * (row.length - 1);
      let cursor = SPREAD.PAD + (usable - span) / 2;

      row.forEach((id, k) => {
        const w = ws[k];
        const h = hs[k];
        const jx = (rand() * 2 - 1) * SPREAD.JITTER_X * w * calm;
        const jy = (rand() * 2 - 1) * SPREAD.JITTER_Y * h * calm;
        const tilt = (SPREAD.MIN_TILT + rand() * (SPREAD.MAX_TILT - SPREAD.MIN_TILT)) * (rand() < 0.5 ? -1 : 1);
        boxes[id] = {
          x: Math.min(Math.max(cursor + jx, SPREAD.PAD), width - SPREAD.PAD - w),
          y: top + (rowH - h) / 2 + jy,
          w,
          h,
          r: last ? 0 : tilt,
        };
        cursor += w + gap;
      });
      top += rowH * (1 - SPREAD.ROW_OVERLAP);
    }

    // Shift so the tilted corners clear the top edge; height covers the lowest corner.
    const b = boxes.map(bounds);
    const shift = SPREAD.PAD - Math.min(...b.map((x) => x.top));
    for (const box of boxes) box.y += shift;
    const height = Math.max(...b.map((x) => x.bottom)) + shift + SPREAD.PAD;

    result = { boxes, height, order: rows.flat(), longEdge: L };
    if (boxes.every((_, i) => visibleShare(boxes, i) >= SPREAD.MIN_VISIBLE)) return result;
  }
  return result!;
}
