// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";
import { resetCollageLabelsPreference } from "@/lib/collage/label-preference";
import { MorphingCornerMenu } from "./MorphingCornerMenu";

const replaceSpy = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceSpy }),
}));

vi.mock("@/i18n/navigation", () => ({
  getPathname: ({ href, locale }: { href: string | { pathname: string }; locale: string }) => {
    const p = typeof href === "string" ? href : href.pathname;
    return `/${locale}${p === "/" ? "" : p}`;
  },
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

let roots: Array<{ root: Root; container: HTMLDivElement }> = [];

afterEach(() => {
  for (const { root, container } of roots) {
    act(() => root.unmount());
    container.remove();
  }
  roots = [];
  replaceSpy.mockReset();
  resetCollageLabelsPreference();
});

function renderMenu() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push({ root, container });

  act(() => {
    root.render(
      <NextIntlClientProvider locale="en" messages={en}>
        <MorphingCornerMenu
          copy={{ menu: "Menu", about: "About", audioCredits: "Audio credits" }}
        />
      </NextIntlClientProvider>,
    );
  });

  return container;
}

describe("MorphingCornerMenu", () => {
  it("morphs open on click, closes on Escape, and toggles collage label preference", () => {
    const container = renderMenu();
    const shell = container.querySelector(".corner-menu-shell")!;
    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Language"]',
    )!;

    expect(shell.getAttribute("data-open")).toBe("false");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      trigger.click();
    });
    expect(shell.getAttribute("data-open")).toBe("true");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    const toggle = container.querySelector<HTMLButtonElement>('[role="switch"]')!;
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    act(() => {
      toggle.click();
    });
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(shell.getAttribute("data-open")).toBe("false");
  });

  it("switches Locale via menuitemradio buttons", () => {
    const container = renderMenu();
    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Language"]',
    )!;
    act(() => {
      trigger.click();
    });

    const jaOption = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'),
    ).find((btn) => btn.textContent?.includes("日本語"))!;
    act(() => {
      jaOption.click();
    });

    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy.mock.calls[0]![0]).toMatch(/^\/ja/);
  });
});
