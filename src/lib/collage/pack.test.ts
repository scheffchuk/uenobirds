import { describe, expect, it } from "vitest";
import { packMaskBits } from "../../../convex/lib/maskBits";
import { decodeMaskBits, type SilhouetteMask } from "./mask";
import { packCollage } from "./pack";
import type { CollageBird } from "./types";

function bird(
  slug: string,
  prevalence: number,
  aspect = 1.4,
  mask?: SilhouetteMask,
): CollageBird {
  return {
    slug,
    sciName: slug,
    comNameEn: slug,
    comNameJa: slug,
    comNameZhTw: slug,
    prevalence,
    url: `https://example.com/${slug}.png`,
    aspect,
    ...(mask ? { mask } : {}),
  };
}

function makeMask(
  w: number,
  h: number,
  predicate: (x: number, y: number) => boolean,
): SilhouetteMask {
  const alpha = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (predicate(x, y)) alpha[y * w + x] = 255;
    }
  }
  return packMaskBits(alpha, w, h);
}

describe("packCollage", () => {
  it("returns no tiles for an empty flock", () => {
    expect(packCollage([], 800, 600)).toEqual([]);
  });

  it("sizes higher-Prevalence birds larger than lower ones", () => {
    const placed = packCollage(
      [bird("common", 90), bird("scarce", 10)],
      800,
      600,
    );
    const common = placed.find((p) => p.slug === "common");
    const scarce = placed.find((p) => p.slug === "scarce");
    expect(common && scarce).toBeTruthy();
    expect(common!.width * common!.height).toBeGreaterThan(
      scarce!.width * scarce!.height,
    );
  });

  it("places every bird fully inside the viewport without overlap", () => {
    const flock = [
      bird("a", 80),
      bird("b", 50),
      bird("c", 30),
      bird("d", 20),
    ];
    const placed = packCollage(flock, 900, 700);
    expect(placed).toHaveLength(4);
    for (const tile of placed) {
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeGreaterThanOrEqual(0);
      expect(tile.x + tile.width).toBeLessThanOrEqual(900 + 1e-6);
      expect(tile.y + tile.height).toBeLessThanOrEqual(700 + 1e-6);
    }
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i]!;
        const b = placed[j]!;
        const overlap =
          a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y;
        expect(overlap).toBe(false);
      }
    }
  });

  it("is deterministic for the same input", () => {
    const flock = [bird("x", 40), bird("y", 60), bird("z", 25)];
    expect(packCollage(flock, 640, 480)).toEqual(packCollage(flock, 640, 480));
  });

  it("nests masked birds tightly without overlapping opaque silhouette pixels", () => {
    // Diagonal wing-like silhouettes with generous concave transparent corners
    const lMask = makeMask(32, 32, (x, y) => x < 9 || y >= 23);
    const smallDot = makeMask(24, 24, (x, y) => {
      const dx = x - 12;
      const dy = y - 12;
      return dx * dx + dy * dy <= 64;
    });

    const flock = [
      bird("heron", 90, 1, lMask),
      bird("sparrow", 45, 1, smallDot),
      bird("tit", 35, 1, smallDot),
      bird("wren", 25, 1, smallDot),
    ];

    const placed = packCollage(flock, 600, 400);
    expect(placed).toHaveLength(4);
    expect(packCollage(flock, 600, 400)).toEqual(placed);

    // Every opaque sample of every bird must stay inside viewport and disjoint
    // from every other bird's opaque silhouette pixels.
    const occupied = new Set<string>();
    for (const tile of placed) {
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeGreaterThanOrEqual(0);
      expect(tile.x + tile.width).toBeLessThanOrEqual(600 + 1e-6);
      expect(tile.y + tile.height).toBeLessThanOrEqual(400 + 1e-6);

      const decoded = decodeMaskBits(tile.mask!);
      const { w, h } = tile.mask!;
      for (let py = Math.floor(tile.y); py < Math.floor(tile.y + tile.height); py += 4) {
        const my = Math.min(h - 1, Math.floor(((py - tile.y) / tile.height) * h));
        for (let px = Math.floor(tile.x); px < Math.floor(tile.x + tile.width); px += 4) {
          const mx = Math.min(w - 1, Math.floor(((px - tile.x) / tile.width) * w));
          if (decoded[my * w + mx] === 1) {
            const key = `${px},${py}`;
            expect(occupied.has(key)).toBe(false);
            occupied.add(key);
          }
        }
      }
    }
  });
});
