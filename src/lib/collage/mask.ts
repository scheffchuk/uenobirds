export type SilhouetteMask = {
  w: number;
  h: number;
  bits: string;
};

export type HitTestRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HitTestTile = {
  slug: string;
  rect: HitTestRect;
  mask?: SilhouetteMask;
};

function decodeBase64(b64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

/**
 * Decode MSB-first row-major 1-bit base64 silhouette mask into a 0/1 byte grid.
 */
export function decodeMaskBits(mask: SilhouetteMask): Uint8Array {
  const total = Math.max(0, mask.w * mask.h);
  const grid = new Uint8Array(total);
  if (total === 0 || !mask.bits) return grid;

  const bytes = decodeBase64(mask.bits);
  for (let i = 0; i < total; i += 1) {
    const byte = bytes[i >> 3] ?? 0;
    if ((byte & (1 << (7 - (i & 7)))) !== 0) {
      grid[i] = 1;
    }
  }
  return grid;
}

/** Test whether a normalized coordinate `(nx, ny) ∈ [0, 1)` hits an opaque bit. */
export function hitTestMask(
  mask: SilhouetteMask,
  nx: number,
  ny: number,
  decoded?: Uint8Array,
): boolean {
  if (nx < 0 || ny < 0 || nx >= 1 || ny >= 1 || mask.w <= 0 || mask.h <= 0) {
    return false;
  }
  const mx = Math.min(mask.w - 1, Math.floor(nx * mask.w));
  const my = Math.min(mask.h - 1, Math.floor(ny * mask.h));
  const grid = decoded ?? decodeMaskBits(mask);
  return grid[my * mask.w + mx] === 1;
}

/**
 * Hit-test stage percentage coordinates `(pctX, pctY)` topmost-first against tiles.
 * Tiles with a silhouette mask require an opaque bit hit; tiles without a mask fall back to rect hit.
 */
export function hitTestCollageTiles(
  tiles: readonly HitTestTile[],
  pctX: number,
  pctY: number,
  decodedCache?: Map<string, Uint8Array>,
): string | null {
  for (let i = tiles.length - 1; i >= 0; i -= 1) {
    const tile = tiles[i]!;
    const { x, y, width, height } = tile.rect;
    if (
      width <= 0 ||
      height <= 0 ||
      pctX < x ||
      pctY < y ||
      pctX >= x + width ||
      pctY >= y + height
    ) {
      continue;
    }
    if (!tile.mask) return tile.slug;

    let decoded = decodedCache?.get(tile.slug);
    if (!decoded) {
      decoded = decodeMaskBits(tile.mask);
      decodedCache?.set(tile.slug, decoded);
    }
    const nx = (pctX - x) / width;
    const ny = (pctY - y) / height;
    if (hitTestMask(tile.mask, nx, ny, decoded)) {
      return tile.slug;
    }
  }
  return null;
}
