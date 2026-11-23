import { decodeMaskBits, type SilhouetteMask } from "./mask";
import type { CollageBird, PackedBird } from "./types";

const COUNT_EXP = 0.55;
const PACKING_BUDGET_FRAC = 0.55;
const MASK_BUDGET_FRAC = 0.68;
const MIN_TILE_AREA_FRAC = 0.012;
const GAP = 8;
const CELL = 4;
const PAD_CELLS = Math.max(1, Math.round(GAP / CELL));

type SizedTile = CollageBird & { width: number; height: number };

function sizeTiles(birds: CollageBird[], viewportW: number, viewportH: number) {
  const vpArea = viewportW * viewportH;
  const hasMasks = birds.some((bird) => Boolean(bird.mask));
  const budget = vpArea * (hasMasks ? MASK_BUDGET_FRAC : PACKING_BUDGET_FRAC);
  const minArea = vpArea * MIN_TILE_AREA_FRAC;

  const scored = birds.map((bird) => ({
    bird,
    score: Math.pow(Math.max(1, bird.prevalence), COUNT_EXP),
  }));
  const sumScore = scored.reduce((a, t) => a + t.score, 0) || 1;

  const tiles: SizedTile[] = scored.map(({ bird, score }) => {
    const area = Math.max(minArea, (budget * score) / sumScore);
    const width = Math.sqrt(area * bird.aspect);
    return { ...bird, width, height: width / bird.aspect };
  });

  const sumA = tiles.reduce((a, t) => a + t.width * t.height, 0);
  if (sumA > budget) {
    const fixedSum = tiles
      .filter((t) => t.width * t.height <= minArea + 1e-9)
      .reduce((a, t) => a + t.width * t.height, 0);
    const flexSum = sumA - fixedSum;
    const flexBudget = Math.max(0, budget - fixedSum);
    const shrink = flexSum > 0 ? Math.min(1, flexBudget / flexSum) : 1;
    for (const t of tiles) {
      if (t.width * t.height > minArea + 1e-9) {
        const scale = Math.sqrt(shrink);
        t.width *= scale;
        t.height *= scale;
      }
    }
  }

  return tiles;
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    a.x < b.x + b.width + GAP &&
    a.x + a.width + GAP > b.x &&
    a.y < b.y + b.height + GAP &&
    a.y + a.height + GAP > b.y
  );
}

function tryPlaceRects(
  tiles: SizedTile[],
  viewportW: number,
  viewportH: number,
): PackedBird[] | null {
  const placed: PackedBird[] = [];
  const cx = viewportW / 2;
  const cy = viewportH / 2;

  for (const tile of tiles) {
    let found: { x: number; y: number } | null = null;
    const maxR = Math.hypot(viewportW, viewportH);
    for (let r = 0; r <= maxR && !found; r += 4) {
      const steps = Math.max(8, Math.ceil((2 * Math.PI * r) / 8));
      for (let s = 0; s < steps; s += 1) {
        const angle = (s / steps) * 2 * Math.PI;
        const x = cx + Math.cos(angle) * r - tile.width / 2;
        const y = cy + Math.sin(angle) * r - tile.height / 2;
        if (
          x < 0 ||
          y < 0 ||
          x + tile.width > viewportW ||
          y + tile.height > viewportH
        ) {
          continue;
        }
        const candidate = { x, y, width: tile.width, height: tile.height };
        if (placed.every((p) => !overlaps(candidate, p))) {
          found = { x, y };
          break;
        }
      }
    }
    if (!found) return null;
    placed.push({ ...tile, x: found.x, y: found.y });
  }
  return placed;
}

/**
 * Sample a bird's silhouette bitmask (or full rectangle fallback) into compact
 * grid-cell offsets `(dx, dy)` relative to its top-left grid cell.
 */
function rasterizeTilePoints(
  tile: SizedTile,
  decodedMasks: Map<string, Uint8Array>,
): { bw: number; bh: number; pts: Int32Array } {
  const bw = Math.max(1, Math.ceil(tile.width / CELL));
  const bh = Math.max(1, Math.ceil(tile.height / CELL));

  if (!tile.mask || tile.mask.w <= 0 || tile.mask.h <= 0) {
    const pts = new Int32Array(bw * bh * 2);
    let idx = 0;
    for (let dy = 0; dy < bh; dy += 1) {
      for (let dx = 0; dx < bw; dx += 1) {
        pts[idx++] = dx;
        pts[idx++] = dy;
      }
    }
    return { bw, bh, pts };
  }

  let decoded = decodedMasks.get(tile.slug);
  if (!decoded) {
    decoded = decodeMaskBits(tile.mask);
    decodedMasks.set(tile.slug, decoded);
  }
  const mw = tile.mask.w;
  const mh = tile.mask.h;
  const raw: number[] = [];

  for (let dy = 0; dy < bh; dy += 1) {
    const my = Math.min(mh - 1, Math.floor(((dy + 0.5) / bh) * mh));
    for (let dx = 0; dx < bw; dx += 1) {
      const mx = Math.min(mw - 1, Math.floor(((dx + 0.5) / bw) * mw));
      if (decoded[my * mw + mx] === 1) {
        raw.push(dx, dy);
      }
    }
  }

  // Fallback if an extreme downscale misses every opaque pixel.
  if (raw.length === 0) {
    raw.push(Math.floor(bw / 2), Math.floor(bh / 2));
  }

  return { bw, bh, pts: Int32Array.from(raw) };
}

function tryPlaceMasked(
  tiles: SizedTile[],
  viewportW: number,
  viewportH: number,
  decodedMasks: Map<string, Uint8Array>,
): PackedBird[] | null {
  const gridW = Math.max(1, Math.floor(viewportW / CELL));
  const gridH = Math.max(1, Math.floor(viewportH / CELL));
  const occ = new Uint8Array(gridW * gridH);
  const placed: PackedBird[] = [];

  const cx = viewportW / 2;
  const cy = viewportH / 2;
  const aspectRatio = viewportW / Math.max(1, viewportH);

  // Place largest / most prevalent silhouettes first near the center so smaller
  // birds naturally nest into concave wings, tails, and open pockets around them.
  const ordered = [...tiles].sort(
    (a, b) =>
      b.width * b.height - a.width * a.height || a.slug.localeCompare(b.slug),
  );

  for (const tile of ordered) {
    const { bw, bh, pts } = rasterizeTilePoints(tile, decodedMasks);
    const maxGx = Math.floor((viewportW - tile.width) / CELL);
    const maxGy = Math.floor((viewportH - tile.height) / CELL);
    if (maxGx < 0 || maxGy < 0) return null;

    let foundGx = -1;
    let foundGy = -1;
    const maxR = Math.hypot(viewportW, viewportH);

    for (let r = 0; r <= maxR && foundGx < 0; r += CELL) {
      const steps = Math.max(12, Math.ceil((2 * Math.PI * r) / (CELL * 1.5)));
      for (let s = 0; s < steps; s += 1) {
        const angle = (s / steps) * 2 * Math.PI;
        const x = cx + Math.cos(angle) * r * Math.min(1.25, aspectRatio) - tile.width / 2;
        const y = cy + Math.sin(angle) * r - tile.height / 2;
        const gx = Math.round(x / CELL);
        const gy = Math.round(y / CELL);
        if (gx < 0 || gy < 0 || gx > maxGx || gy > maxGy) continue;

        let collides = false;
        for (let i = 0; i < pts.length; i += 2) {
          const px = gx + pts[i]!;
          const py = gy + pts[i + 1]!;
          if (px >= gridW || py >= gridH || occ[py * gridW + px] !== 0) {
            collides = true;
            break;
          }
        }
        if (!collides) {
          foundGx = gx;
          foundGy = gy;
          break;
        }
      }
    }

    if (foundGx < 0) return null;

    // Stamp placed silhouette + padding halo into occupancy grid.
    for (let i = 0; i < pts.length; i += 2) {
      const cxCell = foundGx + pts[i]!;
      const cyCell = foundGy + pts[i + 1]!;
      const y0 = Math.max(0, cyCell - PAD_CELLS);
      const y1 = Math.min(gridH - 1, cyCell + PAD_CELLS);
      const x0 = Math.max(0, cxCell - PAD_CELLS);
      const x1 = Math.min(gridW - 1, cxCell + PAD_CELLS);
      for (let py = y0; py <= y1; py += 1) {
        const row = py * gridW;
        for (let px = x0; px <= x1; px += 1) {
          occ[row + px] = 1;
        }
      }
    }

    placed.push({
      ...tile,
      x: foundGx * CELL,
      y: foundGy * CELL,
    });
  }

  return placed;
}

/**
 * Pack CollageBirds into a viewport; Prevalence drives relative size.
 * When silhouette bitmasks are present, birds nest into concave transparent
 * regions without overlapping opaque pixels. Deterministic.
 */
export function packCollage(
  birds: CollageBird[],
  viewportW: number,
  viewportH: number,
): PackedBird[] {
  if (birds.length === 0 || viewportW <= 0 || viewportH <= 0) return [];

  const hasMasks = birds.some((bird) => Boolean(bird.mask));
  const decodedMasks = new Map<string, Uint8Array>();

  let tiles = sizeTiles(birds, viewportW, viewportH);
  for (let iter = 0; iter < 14; iter += 1) {
    const placed = hasMasks
      ? tryPlaceMasked(tiles, viewportW, viewportH, decodedMasks)
      : tryPlaceRects(tiles, viewportW, viewportH);
    if (placed) return placed;
    tiles = tiles.map((t) => ({
      ...t,
      width: t.width * 0.9,
      height: t.height * 0.9,
    }));
  }
  return [];
}

export type { SilhouetteMask };
