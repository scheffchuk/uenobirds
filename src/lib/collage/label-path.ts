import { decodeMaskBits, type SilhouetteMask } from "./mask";

export type CollageLabelInkTier = "subtle" | "medium" | "strong";

export type CollageLabelPath = {
  /** Proportional tile-local viewBox dimensions (width = 100, height = 100 / aspect). */
  vbW: number;
  vbH: number;
  /** Left-to-right SVG path `d` positioned in clear paper hugging the silhouette. */
  d: string;
  /** Font size in viewBox units. */
  fontSize: number;
  /** Ink-bleed filter tier matching tile prominence. */
  ink: CollageLabelInkTier;
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

const MIN_LANDSCAPE_AREA_FRAC = 0.006;
const MIN_PORTRAIT_AREA_FRAC = 0.007;
const MIN_RELATIVE_AREA_FRAC = 0.6;
const MIN_TILE_WIDTH_PX = 56;
const MAX_LABELS_LANDSCAPE = 14;
const MAX_LABELS_PORTRAIT = 10;
const MIN_PATH_SPAN_VB = 170;

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
  const ink: CollageLabelInkTier =
    tile.width >= 100 ? "strong" : tile.width >= 76 ? "medium" : "subtle";
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

      // Extend past both ends so long species names never clip at SVG textPath endpoints.
      const xFirst = xs[0]!;
      const xLast = xs[samples - 1]!;
      const yFirst = rawYs[0]!;
      const yLast = rawYs[samples - 1]!;
      const midSpanX = (xFirst + xLast) / 2;
      const halfTarget = Math.max((xLast - xFirst) / 2 + 12, MIN_PATH_SPAN_VB / 2);
      const extLeftX = midSpanX - halfTarget;
      const extRightX = midSpanX + halfTarget;
      const slopeLeft =
        xs[1]! !== xFirst
          ? Math.max(-0.25, Math.min(0.25, (rawYs[1]! - yFirst) / (xs[1]! - xFirst)))
          : 0;
      const slopeRight =
        xLast !== xs[samples - 2]!
          ? Math.max(
              -0.25,
              Math.min(
                0.25,
                (yLast - rawYs[samples - 2]!) / (xLast - xs[samples - 2]!),
              ),
            )
          : 0;
      const pts: [number, number][] = [
        [extLeftX, yFirst + slopeLeft * (extLeftX - xFirst)],
        ...xs.map((x, idx): [number, number] => [x, rawYs[idx]!]),
        [extRightX, yLast + slopeRight * (extRightX - xLast)],
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

  // Fallback gentle arc with generous horizontal runway so long names never clip.
  const useBottom = tile.y < Math.max(18, tile.height * 0.08);
  const yEdge = useBottom ? vbH + margin + fontSize * 0.45 : -margin;
  const arch = useBottom ? 5 : -5;
  const halfRunway = MIN_PATH_SPAN_VB / 2;
  return {
    vbW,
    vbH,
    d: `M ${round1(50 - halfRunway)} ${round1(yEdge)} Q 50 ${round1(yEdge + arch)} ${round1(50 + halfRunway)} ${round1(yEdge)}`,
    fontSize,
    ink,
  };
}

/**
 * Select which tiles receive curved silhouette labels and compute their paths.
 * Caps label density and enforces minimum anchor spacing so labels stay crisp.
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
  const minDx = mode === "landscape" ? 88 : 78;
  const minDy = mode === "landscape" ? 24 : 22;

  const scored = tiles.map((tile) => ({
    tile,
    areaFrac: (tile.width * tile.height) / canvasArea,
  }));
  const maxAreaFrac = scored.reduce(
    (max, entry) => Math.max(max, entry.areaFrac),
    0,
  );
  const effectiveMinArea = Math.max(
    minAreaFrac,
    maxAreaFrac * MIN_RELATIVE_AREA_FRAC,
  );

  const candidates = scored
    .filter(
      ({ tile, areaFrac }) =>
        areaFrac >= effectiveMinArea && tile.width >= MIN_TILE_WIDTH_PX,
    )
    .sort(
      (a, b) =>
        b.areaFrac - a.areaFrac || a.tile.slug.localeCompare(b.tile.slug),
    );

  const placedAnchors: { x: number; y: number }[] = [];
  const out = new Map<string, CollageLabelPath>();
  for (const { tile } of candidates) {
    if (out.size >= maxLabels) break;
    const useBottom = tile.y < Math.max(18, tile.height * 0.08);
    const anchorX = tile.x + tile.width / 2;
    const anchorY = useBottom ? tile.y + tile.height + 6 : tile.y - 6;
    const collides = placedAnchors.some(
      (pt) => Math.abs(pt.x - anchorX) < minDx && Math.abs(pt.y - anchorY) < minDy,
    );
    if (collides) continue;
    const label = buildSilhouetteLabelPath(tile, canvasW, canvasH);
    if (label) {
      out.set(tile.slug, label);
      placedAnchors.push({ x: anchorX, y: anchorY });
    }
  }
  return out;
}
