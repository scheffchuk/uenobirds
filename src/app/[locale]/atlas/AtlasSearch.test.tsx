// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { AtlasSearch, type AtlasSearchItem } from "./AtlasSearch";

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

let roots: Array<{ root: Root; container: HTMLDivElement }> = [];

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

afterEach(() => {
  for (const { root, container } of roots) {
    act(() => root.unmount());
    container.remove();
  }
  roots = [];
  vi.unstubAllGlobals();
});

const SAMPLE_ITEMS: AtlasSearchItem[] = [
  {
    slug: "corvus-macrorhynchos",
    displayName: "Large-billed Crow",
    prevalence: 85,
    peakPrevalence: 88,
    names: "Large-billed Crow ハシブトガラス Corvus macrorhynchos",
    content: <span>Large-billed Crow</span>,
  },
  {
    slug: "ardea-cinerea",
    displayName: "Grey Heron",
    prevalence: 60,
    peakPrevalence: 60,
    names: "Grey Heron アオサギ Ardea cinerea",
    content: <span>Grey Heron</span>,
  },
  {
    slug: "anas-acuta",
    displayName: "Northern Pintail",
    prevalence: 30,
    peakPrevalence: 95,
    names: "Northern Pintail オナガガモ Anas acuta",
    content: <span>Northern Pintail</span>,
  },
];

describe("AtlasSearch with sort pill", () => {
  it("reorders cards when switching sort modes and preserves live search filtering", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    roots.push({ root, container });

    act(() => {
      root.render(
        <NextIntlClientProvider locale="en" messages={en}>
          <AtlasSearch items={SAMPLE_ITEMS} />
        </NextIntlClientProvider>,
      );
    });

    const listTexts = () =>
      Array.from(container.querySelectorAll("ul li")).map(
        (li) => li.textContent,
      );

    expect(listTexts()).toEqual([
      "Large-billed Crow",
      "Grey Heron",
      "Northern Pintail",
    ]);

    const alphaBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="A to Z"]',
    )!;
    act(() => {
      alphaBtn.click();
    });
    expect(listTexts()).toEqual([
      "Grey Heron",
      "Large-billed Crow",
      "Northern Pintail",
    ]);

    const peakBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Year-round peak"]',
    )!;
    act(() => {
      peakBtn.click();
    });
    expect(listTexts()).toEqual([
      "Northern Pintail",
      "Large-billed Crow",
      "Grey Heron",
    ]);
  });
});
