// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";
import { PostcardModal } from "./PostcardModal";

const backSpy = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: backSpy }),
  usePathname: () => "/en/atlas/anas-acuta",
}));

let roots: Array<{ root: Root; container: HTMLDivElement }> = [];

afterEach(() => {
  for (const { root, container } of roots) {
    act(() => root.unmount());
    container.remove();
  }
  roots = [];
  backSpy.mockReset();
});

function renderModal(onClose?: () => void) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push({ root, container });

  act(() => {
    root.render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PostcardModal onClose={onClose}>
          <div>Species postcard body</div>
        </PostcardModal>
      </NextIntlClientProvider>,
    );
  });

  return container;
}

describe("PostcardModal", () => {
  it("renders accessible dialog semantics, closes on Escape, and restores prior focus", () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();

    const container = renderModal();
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(backSpy).toHaveBeenCalledTimes(1);

    const entry = roots.pop()!;
    act(() => entry.root.unmount());
    entry.container.remove();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("closes when clicking the backdrop or close button", () => {
    const onClose = vi.fn();
    const container = renderModal(onClose);

    const backdrop = container.querySelector<HTMLElement>(
      '[data-testid="postcard-backdrop"]',
    )!;
    act(() => {
      backdrop.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    const closeBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Close species postcard"]',
    )!;
    act(() => {
      closeBtn.click();
    });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("dismisses when dragged past threshold and ignores click after a cancelled short drag", () => {
    const onClose = vi.fn();
    const container = renderModal(onClose);
    const handle = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Drag down or press to close postcard"]',
    )!;

    // Short drag < 110px followed by synthetic click should NOT dismiss
    act(() => {
      handle.dispatchEvent(
        new MouseEvent("pointerdown", { clientY: 100, bubbles: true }),
      );
      handle.dispatchEvent(
        new MouseEvent("pointermove", { clientY: 140, bubbles: true }),
      );
      handle.dispatchEvent(
        new MouseEvent("pointerup", { clientY: 140, bubbles: true }),
      );
      handle.click();
    });
    expect(onClose).not.toHaveBeenCalled();

    // Long drag >= 110px dismisses cleanly
    act(() => {
      handle.dispatchEvent(
        new MouseEvent("pointerdown", { clientY: 100, bubbles: true }),
      );
      handle.dispatchEvent(
        new MouseEvent("pointermove", { clientY: 240, bubbles: true }),
      );
      handle.dispatchEvent(
        new MouseEvent("pointerup", { clientY: 240, bubbles: true }),
      );
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
