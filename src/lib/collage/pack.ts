import { decodeMaskBits, type SilhouetteMask } from "./mask";
import type { CollageBird, PackedBird } from "./types";

const COUNT_EXP = 0.58;
const PACKING_BUDGET_FRAC = 0.52;
const MASK_BUDGET_FRAC = 0.54;
const MIN_TILE_AREA_FRAC = 0.01;
const GAP = 10;
const CELL = 4;

type SizedTile = CollageBird & { width: number; height: number };

function ellipseBiases(
  viewportW: number,
  viewportH: number,
): { xBias: number; yBias: number } {
  if (viewportW >= viewportH) {
    return {
      xBias: Math.min(2.3, viewportW / Math.max(1, viewportH)),
      yBias: 1,
    };
  }
  return {
    xBias: 1,
    yBias: Math.min(1.7, viewportH / Math.max(1, viewportW)),
  };
}

function centerPlaced(
  placed: PackedBird[],
  viewportW: number,
  viewportH: number,
): PackedBird[] {
  if (placed.length === 0) return placed;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const tile of placed) {
    if (tile.x < minX) minX = tile.x;
    if (tile.x + tile.width > maxX) maxX = tile.x + tile.width;
    if (tile.y < minY) minY = tile.y;
    if (tile.y + tile.height > maxY) maxY = tile.y + tile.height;
  }
  const dx = (viewportW - (maxX - minX)) / 2 - minX;
  const dy = (viewportH - (maxY - minY)) / 2 - minY;
  return placed.map((tile) => ({
    ...tile,
    x: Math.max(0, Math.min(viewportW - tile.width, tile.x + dx)),
    y: Math.max(0, Math.min(viewportH - tile.height, tile.y + dy)),
  }));
}

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
  const { xBias, yBias } = ellipseBiases(viewportW, viewportH);

  let seed = 0x9e3779b9 % 2147483647;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  for (const tile of tiles) {
    let found: { x: number; y: number } | null = null;
    const maxR = Math.hypot(viewportW, viewportH);
    const phase = rand() * Math.PI * 2;
    for (let r = 0; r <= maxR && !found; r += 4) {
      const steps = Math.max(12, Math.ceil((2 * Math.PI * r) / 8));
      for (let s = 0; s < steps; s += 1) {
        const angle = phase + (s / steps) * 2 * Math.PI;
        const x = cx + Math.cos(angle) * r * xBias - tile.width / 2;
        const y = cy + Math.sin(angle) * r * yBias - tile.height / 2;
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
  return centerPlaced(placed, viewportW, viewportH);
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
  const { xBias, yBias } = ellipseBiases(viewportW, viewportH);
  const padCells = viewportW > viewportH ? 4 : 3;

  // Place largest / most prevalent silhouettes first near the center so smaller
  // birds naturally nest into concave wings, tails, and open pockets around them.
  const ordered = [...tiles].sort(
    (a, b) =>
      b.width * b.height - a.width * a.height || a.slug.localeCompare(b.slug),
  );

  // Deterministic PRNG keeps organic radial growth stable across builds.
  let seed = 0x9e3779b9 % 2147483647;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  for (const tile of ordered) {
    const { pts } = rasterizeTilePoints(tile, decodedMasks);
    const maxGx = Math.floor((viewportW - tile.width) / CELL);
    const maxGy = Math.floor((viewportH - tile.height) / CELL);
    if (maxGx < 0 || maxGy < 0) return null;

    let comX = cx;
    let comY = cy;
    if (placed.length > 0) {
      let sumX = 0;
      let sumY = 0;
      let sumW = 0;
      for (const p of placed) {
        const area = p.width * p.height;
        sumX += (p.x + p.width / 2) * area;
        sumY += (p.y + p.height / 2) * area;
        sumW += area;
      }
      if (sumW > 0) {
        comX = sumX / sumW;
        comY = sumY / sumW;
      }
    }

    let foundGx = -1;
    let foundGy = -1;
    let bestCost = Infinity;
    let foundRing = -1;
    const maxR = Math.max(viewportW, viewportH);
    const phase = rand() * Math.PI * 2;

    for (let r = 0; r <= maxR; r += CELL) {
      if (foundRing >= 0 && r > foundRing + CELL * 2) break;
      const steps = Math.max(24, Math.ceil((2 * Math.PI * r) / (CELL * 1.6)));
      for (let s = 0; s < steps; s += 1) {
        const angle = phase + (s / steps) * 2 * Math.PI;
        const x = cx + Math.cos(angle) * r * xBias - tile.width / 2;
        const y = cy + Math.sin(angle) * r * yBias - tile.height / 2;
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
          const dxx = gx * CELL + tile.width / 2 - comX;
          const dyy = gy * CELL + tile.height / 2 - comY;
          const cost = Math.hypot(dxx / xBias, dyy / yBias) + rand() * CELL * 0.5;
          if (cost < bestCost) {
            bestCost = cost;
            foundGx = gx;
            foundGy = gy;
          }
        }
      }
      if (foundGx >= 0 && foundRing < 0) foundRing = r;
    }

    if (foundGx < 0) return null;

    // Stamp placed silhouette + padding halo into occupancy grid.
    for (let i = 0; i < pts.length; i += 2) {
      const cxCell = foundGx + pts[i]!;
      const cyCell = foundGy + pts[i + 1]!;
      const y0 = Math.max(0, cyCell - padCells);
      const y1 = Math.min(gridH - 1, cyCell + padCells);
      const x0 = Math.max(0, cxCell - padCells);
      const x1 = Math.min(gridW - 1, cxCell + padCells);
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

  return centerPlaced(placed, viewportW, viewportH);
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
