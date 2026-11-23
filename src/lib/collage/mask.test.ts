import { describe, expect, it } from "vitest";
import { packMaskBits } from "../../../convex/lib/maskBits";
import {
  decodeMaskBits,
  hitTestCollageTiles,
  hitTestMask,
  type HitTestTile,
} from "./mask";

function lShapeMask() {
  // 8x8 L-shape: left 2 columns and bottom 2 rows opaque; top-right 6x6 transparent.
  const w = 8;
  const h = 8;
  const alpha = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (x < 2 || y >= 6) alpha[y * w + x] = 255;
    }
  }
  return packMaskBits(alpha, w, h);
}

describe("silhouette mask decoding and hit-testing", () => {
  it("round-trips packed MSB-first bitmasks", () => {
    const mask = lShapeMask();
    const decoded = decodeMaskBits(mask);
    expect(decoded).toHaveLength(64);
    expect(decoded[0]).toBe(1); // top-left opaque
    expect(decoded[7]).toBe(0); // top-right transparent
    expect(decoded[7 * 8 + 7]).toBe(1); // bottom-right opaque
  });

  it("hits opaque silhouette pixels and misses transparent corners", () => {
    const mask = lShapeMask();
    expect(hitTestMask(mask, 0.1, 0.1)).toBe(true);
    expect(hitTestMask(mask, 0.8, 0.1)).toBe(false);
    expect(hitTestMask(mask, 0.8, 0.9)).toBe(true);
    expect(hitTestMask(mask, -0.05, 0.5)).toBe(false);
    expect(hitTestMask(mask, 1.0, 0.5)).toBe(false);
  });

  it("hit-tests topmost-first and passes through transparent regions to birds underneath", () => {
    const mask = lShapeMask();
    const tiles: HitTestTile[] = [
      {
        slug: "underneath",
        rect: { x: 20, y: 10, width: 30, height: 30 },
        // no mask -> full rect fallback
      },
      {
        slug: "top-l-shape",
        rect: { x: 10, y: 10, width: 40, height: 40 },
        mask,
      },
    ];

    const cache = new Map<string, Uint8Array>();
    // Inside top-l-shape's transparent top-right pocket, directly over "underneath"
    expect(hitTestCollageTiles(tiles, 35, 18, cache)).toBe("underneath");
    // Inside top-l-shape's opaque left stem
    expect(hitTestCollageTiles(tiles, 14, 18, cache)).toBe("top-l-shape");
    // Outside both
    expect(hitTestCollageTiles(tiles, 90, 90, cache)).toBeNull();
  });
});
