"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "ueno-collage-labels";
const CHANGE_EVENT = "ueno:collage-labels";

function readPreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setCollageLabelsVisible(next: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Ignore storage quota / privacy mode failures.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

/** Visitor preference for curved collage bird labels (defaults to visible). */
export function useCollageLabelsVisible(): [boolean, (next: boolean) => void] {
  const visible = useSyncExternalStore(subscribe, readPreference, () => true);
  return [visible, setCollageLabelsVisible];
}
