// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../../messages/en.json";
import { SpeciesVoicePlayer } from "./SpeciesVoicePlayer";

let roots: Array<{ root: Root; container: HTMLDivElement }> = [];
let playSpy: ReturnType<typeof vi.fn>;
let pauseSpy: ReturnType<typeof vi.fn>;
let loadSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  playSpy = vi.fn().mockImplementation(function (this: HTMLMediaElement) {
    this.dispatchEvent(new Event("playing"));
    return Promise.resolve();
  });
  pauseSpy = vi.fn().mockImplementation(function (this: HTMLMediaElement) {
    this.dispatchEvent(new Event("pause"));
  });
  loadSpy = vi.fn();

  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: playSpy,
  });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: pauseSpy,
  });
  Object.defineProperty(HTMLMediaElement.prototype, "load", {
    configurable: true,
    value: loadSpy,
  });
});

afterEach(() => {
  for (const { root, container } of roots) {
    act(() => root.unmount());
    container.remove();
  }
  roots = [];
  vi.restoreAllMocks();
});

function renderPlayer(audio: React.ComponentProps<typeof SpeciesVoicePlayer>["audio"]) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push({ root, container });

  act(() => {
    root.render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SpeciesVoicePlayer slug="corvus-macrorhynchos" audio={audio} />
      </NextIntlClientProvider>,
    );
  });

  return container;
}

describe("SpeciesVoicePlayer", () => {
  it("renders nothing when audio is missing or unavailable", () => {
    expect(renderPlayer(undefined).innerHTML).toBe("");
    expect(
      renderPlayer({ status: "unavailable", unavailableReason: "none" })
        .innerHTML,
    ).toBe("");
  });

  it("loads lazily on play, toggles pause/loop, and scrubs via keyboard", async () => {
    const container = renderPlayer({
      status: "available",
      url: "https://audio.example/crow.mp3",
      durationSeconds: 20,
      soundType: "call",
      recordist: "A. Recordist",
    });

    const audio = container.querySelector("audio")!;
    expect(audio.getAttribute("preload")).toBe("none");
    expect(audio.getAttribute("src")).toBeNull();
    expect(container.textContent).toContain("0:00 / 0:20");

    const playBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Play audio"]',
    )!;
    await act(async () => {
      playBtn.click();
    });

    expect(audio.getAttribute("src")).toBe("https://audio.example/crow.mp3");
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector('button[aria-label="Pause audio"]'),
    ).not.toBeNull();

    // Toggle loop
    const loopBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Toggle loop playback"]',
    )!;
    expect(loopBtn.getAttribute("aria-pressed")).toBe("false");
    act(() => {
      loopBtn.click();
    });
    expect(loopBtn.getAttribute("aria-pressed")).toBe("true");
    expect(audio.loop).toBe(true);

    // Keyboard scrub forward
    const slider = container.querySelector<HTMLDivElement>('[role="slider"]')!;
    act(() => {
      slider.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });
    expect(Number(slider.getAttribute("aria-valuenow"))).toBe(5);
    expect(container.textContent).toContain("0:01 / 0:20");
  });

  it("surfaces retry state on playback error", async () => {
    playSpy.mockRejectedValueOnce(new Error("network failed"));
    const container = renderPlayer({
      status: "available",
      url: "https://audio.example/crow.mp3",
      durationSeconds: 12,
    });

    const playBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Play audio"]',
    )!;
    await act(async () => {
      playBtn.click();
    });

    expect(
      container.querySelector('button[aria-label="Retry audio"]'),
    ).not.toBeNull();
  });
});
