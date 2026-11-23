import type { SeasonFilter } from "@/lib/season/types";
import type { SeasonalPrevalence } from "@/lib/guide/types";
import type { SilhouetteMask } from "./mask";
import type { CollageLabelPath } from "./label-path";

/** Row from `listForCollage` — one cutout URL + aspect + optional silhouette mask. */
export type CollageSpecies = {
  slug: string;
  sciName: string;
  comNameEn: string;
  comNameJa: string;
  comNameZhTw: string;
  prevalence: SeasonalPrevalence;
  url: string;
  aspect: number;
  mask?: SilhouetteMask;
};

export type CollageBird = Omit<CollageSpecies, "prevalence"> & {
  /** Prevalence for the selected Season filter (0–100). */
  prevalence: number;
};

export type PackedBird = CollageBird & {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Tile box as a percentage of the canvas it was packed against. */
export type TileRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SeasonTile = {
  slug: string;
  portrait: TileRect;
  landscape: TileRect;
  label?: {
    portrait?: CollageLabelPath;
    landscape?: CollageLabelPath;
  };
};

export type SeasonLayout = {
  tiles: SeasonTile[];
};

/** Everything needed to draw and hit-test a tile, listed once and shared across Seasons. */
export type CollageArt = Pick<
  CollageSpecies,
  "slug" | "comNameEn" | "comNameJa" | "comNameZhTw" | "url" | "mask"
>;

export type CollageLayouts = {
  art: CollageArt[];
  seasons: Record<SeasonFilter, SeasonLayout>;
};
