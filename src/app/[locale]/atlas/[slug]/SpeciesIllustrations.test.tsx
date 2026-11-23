// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../../messages/en.json";
import { SpeciesIllustrations } from "./SpeciesIllustrations";
import { SpeciesReferenceLinks } from "./SpeciesReferenceLinks";

vi.mock("@/components/site/species-art-transition", () => ({
  SpeciesArtTransition: ({ children }: { children: React.ReactNode }) =>
    children,
}));

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

function renderPlate() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push({ root, container });

  act(() => {
    root.render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SpeciesIllustrations
          species={{
            slug: "anas-acuta",
            perchUrl: "https://images.example/pintail-perch.png",
            flightUrl: "https://images.example/pintail-flight.png",
          }}
          name="Northern Pintail"
          footerEnd={
            <SpeciesReferenceLinks
              wikipediaUrl="https://en.wikipedia.org/wiki/Northern_pintail"
              ebirdUrl="https://ebird.org/species/norpin"
              compact
              labels={{
                wikipedia: "Wikipedia",
                ebird: "eBird",
                viewOnWikipedia: "View on Wikipedia",
                viewOnEbird: "View on eBird",
                opensNewTab: "opens in a new tab",
              }}
            />
          }
        />
      </NextIntlClientProvider>,
    );
  });

  return container;
}

describe("SpeciesIllustrations postcard plate", () => {
  it("switches between perched and flight poses with pressed state", () => {
    const container = renderPlate();
    const perchedBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Perched"]',
    );
    const flightBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="In flight"]',
    );
    expect(perchedBtn?.getAttribute("aria-pressed")).toBe("true");
    expect(flightBtn?.getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelector("img")?.getAttribute("alt")).toBe(
      "Northern Pintail, perched",
    );

    act(() => {
      flightBtn?.click();
    });

    expect(perchedBtn?.getAttribute("aria-pressed")).toBe("false");
    expect(flightBtn?.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector("img")?.getAttribute("alt")).toBe(
      "Northern Pintail, in flight",
    );
  });

  it("pins Wikipedia and eBird reference pills inside the specimen frame", () => {
    const container = renderPlate();
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"));
    expect(links).toHaveLength(2);
    expect(links[0]?.getAttribute("href")).toBe(
      "https://en.wikipedia.org/wiki/Northern_pintail",
    );
    expect(links[1]?.getAttribute("href")).toBe(
      "https://ebird.org/species/norpin",
    );
  });
});
