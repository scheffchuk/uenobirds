"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "ueno-collage-labels";
const CHANGE_EVENT = "ueno:collage-labels";

let memoryPreference: boolean | null = null;

function readPreference(): boolean {
  if (typeof window === "undefined") return true;
  if (memoryPreference !== null) return memoryPreference;
  try {
    const stored = window.localStorage?.getItem?.(STORAGE_KEY);
    if (stored === "0") return false;
    if (stored === "1") return true;
  } catch {
    // Ignore storage quota / privacy mode failures.
  }
  return true;
}

export function setCollageLabelsVisible(next: boolean): void {
  memoryPreference = next;
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem?.(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Ignore storage quota / privacy mode failures.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function resetCollageLabelsPreference(): void {
  memoryPreference = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.removeItem?.(STORAGE_KEY);
  } catch {
    // Ignore.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      memoryPreference = event.newValue === "0" ? false : true;
      callback();
    }
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
