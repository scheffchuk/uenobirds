import { describe, expect, it } from "vitest";
import { packMaskBits } from "../../../convex/lib/maskBits";
import {
  buildLabelsForCanvas,
  buildSilhouetteLabelPath,
} from "./label-path";

function birdArchMask() {
  const w = 24;
  const h = 24;
  const alpha = new Uint8Array(w * h);
  for (let y = 8; y < 20; y += 1) {
    for (let x = 3; x < 21; x += 1) {
      // Gentle arched back
      const top = 8 + Math.round(((x - 12) * (x - 12)) / 24);
      if (y >= top) alpha[y * w + x] = 255;
    }
  }
  return packMaskBits(alpha, w, h);
}

describe("collage curved label path placement", () => {
  it("builds a left-to-right curved path clear above the silhouette", () => {
    const mask = birdArchMask();
    const path = buildSilhouetteLabelPath(
      { slug: "crow", x: 300, y: 180, width: 220, height: 180, mask },
      1000,
      540,
    );
    expect(path).not.toBeNull();
    expect(path!.vbW).toBe(100);
    expect(path!.vbH).toBeCloseTo(81.8, 0);
    expect(path!.d).toMatch(/^M /);
    // Start x < end x so text reads left-to-right
    const nums = path!.d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const startX = nums[0]!;
    const endX = nums[nums.length - 2]!;
    expect(endX).toBeGreaterThan(startX);
    // Midpoint y stays above the silhouette's upper back (~33% of vbH)
    const startY = nums[1]!;
    expect(startY).toBeLessThan(path!.vbH * 0.55);
  });

  it("flips to the lower contour when a tile hugs the top canvas edge", () => {
    const mask = birdArchMask();
    const path = buildSilhouetteLabelPath(
      { slug: "top-bird", x: 300, y: 2, width: 220, height: 180, mask },
      1000,
      540,
    );
    expect(path).not.toBeNull();
    const nums = path!.d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const startY = nums[1]!;
    expect(startY).toBeGreaterThan(path!.vbH * 0.7);
  });

  it("caps label count and skips tiny tiles on dense canvases", () => {
    const dense = Array.from({ length: 30 }, (_, i) => ({
      slug: `bird-${i}`,
      x: (i % 6) * 150,
      y: Math.floor(i / 6) * 90,
      width: i < 20 ? 130 - i * 2 : 40,
      height: i < 20 ? 110 - i * 2 : 35,
    }));

    const landscapeLabels = buildLabelsForCanvas(dense, 1000, 540, "landscape");
    const portraitLabels = buildLabelsForCanvas(dense, 600, 1000, "portrait");
    expect(landscapeLabels.size).toBeLessThanOrEqual(16);
    expect(portraitLabels.size).toBeLessThanOrEqual(10);
    // Tiny tiles (width 40) are excluded
    expect(landscapeLabels.has("bird-25")).toBe(false);
    // Largest bird always receives a label
    expect(landscapeLabels.has("bird-0")).toBe(true);
  });
});
