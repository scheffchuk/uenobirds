// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../../messages/en.json";
import { PrevalenceChart } from "./PrevalenceChart";

let roots: Array<{ root: Root; container: HTMLDivElement }> = [];

afterEach(() => {
  for (const { root, container } of roots) {
    act(() => root.unmount());
    container.remove();
  }
  roots = [];
});

describe("PrevalenceChart", () => {
  it("highlights the active Season column and renders values for all four seasons", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    roots.push({ root, container });

    act(() => {
      root.render(
        <NextIntlClientProvider locale="en" messages={en}>
          <PrevalenceChart
            prevalence={{ winter: 82, spring: 14, summer: 0, autumn: 35 }}
            activeSeason="winter"
          />
        </NextIntlClientProvider>,
      );
    });

    const winterCol = container.querySelector('[data-season="winter"]');
    const summerCol = container.querySelector('[data-season="summer"]');
    expect(winterCol?.getAttribute("data-active-season")).toBe("true");
    expect(summerCol?.getAttribute("data-active-season")).toBeNull();
    expect(container.textContent).toContain("82");
    expect(container.textContent).toContain("35");
  });
});
