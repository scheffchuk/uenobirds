import { decodeMaskBits, type SilhouetteMask } from "./mask";

export type CollageLabelInk = "s" | "m" | "l";

export type CollageLabelPath = {
  /** Proportional tile-local viewBox dimensions (width = 100, height = 100 / aspect). */
  vbW: number;
  vbH: number;
  /** Left-to-right SVG path `d` positioned in clear paper hugging the silhouette. */
  d: string;
  /** Font size in viewBox units. */
  fontSize: number;
  /** Ink-bleed filter tier matching tile prominence. */
  ink: CollageLabelInk;
};

type LabelCandidateInput = {
  slug: string;
  /** Canvas pixel box (not percentages). */
  x: number;
  y: number;
  width: number;
  height: number;
  mask?: SilhouetteMask;
};

const MIN_LANDSCAPE_AREA_FRAC = 0.018;
const MIN_PORTRAIT_AREA_FRAC = 0.022;
const MIN_TILE_WIDTH_PX = 66;
const MAX_LABELS_LANDSCAPE = 16;
const MAX_LABELS_PORTRAIT = 10;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Smooth a 1D curve with a simple 5-tap moving average. */
function smoothSeries(values: number[]): number[] {
  const n = values.length;
  if (n <= 2) return [...values];
  const out = new Array<number>(n);
  for (let i = 0; i < n; i += 1) {
    let sum = 0;
    let count = 0;
    for (let k = -2; k <= 2; k += 1) {
      const idx = i + k;
      if (idx >= 0 && idx < n) {
        sum += values[idx]!;
        count += 1;
      }
    }
    out[i] = sum / count;
  }
  return out;
}

/**
 * Trace an upper silhouette contour path in proportional tile coordinates
 * `(0..100, 0..vbH)` offset cleanly into clear paper above the bird.
 */
export function buildSilhouetteLabelPath(
  tile: LabelCandidateInput,
  canvasW: number,
  canvasH: number,
): CollageLabelPath | null {
  if (tile.width < MIN_TILE_WIDTH_PX || tile.height <= 0) return null;

  const vbW = 100;
  const vbH = Math.max(25, round1((tile.height / tile.width) * 100));
  const areaFrac = (tile.width * tile.height) / Math.max(1, canvasW * canvasH);
  const ink: CollageLabelInk =
    areaFrac >= 0.06 ? "l" : areaFrac >= 0.03 ? "m" : "s";
  const fontSize = round1(
    Math.max(8.5, Math.min(14.5, 11.5 * Math.sqrt(Math.max(0.55, areaFrac / 0.045)))),
  );
  const margin = Math.max(5.5, fontSize * 0.55);

  if (tile.mask && tile.mask.w >= 4 && tile.mask.h >= 4) {
    const decoded = decodeMaskBits(tile.mask);
    const { w, h } = tile.mask;

    const topY = new Array<number>(w).fill(-1);
    const botY = new Array<number>(w).fill(-1);
    for (let mx = 0; mx < w; mx += 1) {
      for (let my = 0; my < h; my += 1) {
        if (decoded[my * w + mx] === 1) {
          topY[mx] = my;
          break;
        }
      }
      for (let my = h - 1; my >= 0; my -= 1) {
        if (decoded[my * w + mx] === 1) {
          botY[mx] = my;
          break;
        }
      }
    }

    // Find the widest contiguous horizontal span of opaque columns.
    let bestStart = -1;
    let bestEnd = -1;
    let curStart = -1;
    for (let mx = 0; mx < w; mx += 1) {
      if (topY[mx]! >= 0) {
        if (curStart < 0) curStart = mx;
        if (mx - curStart > bestEnd - bestStart) {
          bestStart = curStart;
          bestEnd = mx;
        }
      } else {
        curStart = -1;
      }
    }

    if (bestStart >= 0 && bestEnd - bestStart >= 3) {
      const span = bestEnd - bestStart;
      // Sample 7 evenly spaced anchor points across the silhouette span.
      const samples = 7;
      const xs: number[] = [];
      const ysTop: number[] = [];
      const ysBot: number[] = [];
      for (let s = 0; s < samples; s += 1) {
        const mx = Math.round(bestStart + (s / (samples - 1)) * span);
        xs.push(((mx + 0.5) / w) * vbW);
        ysTop.push(((topY[mx]! + 0.5) / h) * vbH);
        ysBot.push(((botY[mx]! + 0.5) / h) * vbH);
      }

      const smoothTop = smoothSeries(ysTop);
      const smoothBot = smoothSeries(ysBot);

      // Prefer the upper contour unless the tile sits right against the top canvas edge.
      const useBottom = tile.y < Math.max(18, tile.height * 0.08);
      const rawYs = useBottom
        ? smoothBot.map((y) => y + margin + fontSize * 0.6)
        : smoothTop.map((y) => y - margin);

      // Extend slightly past both ends along the local tangent so long names breathe.
      const dx0 = xs[1]! - xs[0]!;
      const dy0 = rawYs[1]! - rawYs[0]!;
      const dx1 = xs[samples - 1]! - xs[samples - 2]!;
      const dy1 = rawYs[samples - 1]! - rawYs[samples - 2]!;
      const pts: [number, number][] = [
        [xs[0]! - dx0 * 0.35, rawYs[0]! - dy0 * 0.35],
        ...xs.map((x, idx): [number, number] => [x, rawYs[idx]!]),
        [xs[samples - 1]! + dx1 * 0.35, rawYs[samples - 1]! + dy1 * 0.35],
      ];

      // Build a smooth quadratic spline left-to-right.
      const segments: string[] = [
        `M ${round1(pts[0]![0])} ${round1(pts[0]![1])}`,
      ];
      for (let i = 1; i < pts.length - 1; i += 1) {
        const [cx, cy] = pts[i]!;
        const [nx, ny] = pts[i + 1]!;
        const midX = (cx + nx) / 2;
        const midY = (cy + ny) / 2;
        segments.push(
          `Q ${round1(cx)} ${round1(cy)} ${round1(midX)} ${round1(midY)}`,
        );
      }
      const last = pts[pts.length - 1]!;
      segments.push(`L ${round1(last[0])} ${round1(last[1])}`);

      return {
        vbW,
        vbH,
        d: segments.join(" "),
        fontSize,
        ink,
      };
    }
  }

  // Fallback gentle arc above (or below if hugging top edge) the tile bounding box.
  const useBottom = tile.y < Math.max(18, tile.height * 0.08);
  const yEdge = useBottom ? vbH + margin + fontSize * 0.45 : -margin;
  const arch = useBottom ? 4 : -4;
  return {
    vbW,
    vbH,
    d: `M 6 ${round1(yEdge)} Q 50 ${round1(yEdge + arch)} 94 ${round1(yEdge)}`,
    fontSize,
    ink,
  };
}

/**
 * Select which tiles receive curved silhouette labels and compute their paths.
 * Caps label density on crowded canvases so prominent birds remain crisp and legible.
 */
export function buildLabelsForCanvas(
  tiles: readonly LabelCandidateInput[],
  canvasW: number,
  canvasH: number,
  mode: "portrait" | "landscape",
): Map<string, CollageLabelPath> {
  const minAreaFrac =
    mode === "landscape" ? MIN_LANDSCAPE_AREA_FRAC : MIN_PORTRAIT_AREA_FRAC;
  const maxLabels =
    mode === "landscape" ? MAX_LABELS_LANDSCAPE : MAX_LABELS_PORTRAIT;
  const canvasArea = Math.max(1, canvasW * canvasH);

  const ranked = [...tiles]
    .map((tile) => ({
      tile,
      areaFrac: (tile.width * tile.height) / canvasArea,
    }))
    .filter(
      ({ tile, areaFrac }) =>
        areaFrac >= minAreaFrac && tile.width >= MIN_TILE_WIDTH_PX,
    )
    .sort(
      (a, b) =>
        b.areaFrac - a.areaFrac || a.tile.slug.localeCompare(b.tile.slug),
    )
    .slice(0, maxLabels);

  const out = new Map<string, CollageLabelPath>();
  for (const { tile } of ranked) {
    const label = buildSilhouetteLabelPath(tile, canvasW, canvasH);
    if (label) out.set(tile.slug, label);
  }
  return out;
}
