"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { stripLocalePrefix } from "@/lib/season/canonicalize";
import { cn } from "@/lib/utils";

const DISMISS_THRESHOLD_PX = 110;
const DRAG_MOVE_THRESHOLD_PX = 8;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function PostcardModal({
  children,
  onClose,
}: {
  children: ReactNode;
  /** Optional test/override close callback; defaults to `router.back()`. */
  onClose?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("AtlasDetail");
  const dialogRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const draggedRef = useRef(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  // If the visitor soft-navigates to another top-level route (e.g. /about) while
  // the parallel @modal slot stays mounted, hide the modal cleanly.
  const strippedPath = pathname ? stripLocalePrefix(pathname) : "";
  const isSpeciesDetailPath = !pathname || strippedPath.startsWith("/atlas/");

  const dismiss = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  }, [onClose, router]);

  useEffect(() => {
    if (!isSpeciesDetailPath) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => el.offsetParent !== null || el === document.activeElement);
        if (focusables.length === 0) {
          event.preventDefault();
          dialogRef.current.focus();
          return;
        }
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (event.shiftKey) {
          if (
            document.activeElement === first ||
            document.activeElement === dialogRef.current
          ) {
            event.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [dismiss, isSpeciesDetailPath]);

  const handleDragStart = (event: PointerEvent<HTMLButtonElement>) => {
    dragStartY.current = event.clientY;
    draggedRef.current = false;
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleDragMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragStartY.current === null) return;
    const delta = Math.max(0, event.clientY - dragStartY.current);
    if (delta > DRAG_MOVE_THRESHOLD_PX) {
      draggedRef.current = true;
    }
    setDragY(delta);
  };

  const handleDragEnd = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragStartY.current === null) return;
    const delta = Math.max(0, event.clientY - dragStartY.current);
    dragStartY.current = null;
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // Ignore if capture was not active.
    }
    if (delta >= DISMISS_THRESHOLD_PX) {
      dismiss();
    } else {
      setDragY(0);
    }
  };

  if (!isSpeciesDetailPath) return null;

  return (
    <div
      className="postcard-modal-root fixed inset-0 z-50 grid place-items-end justify-items-center p-0 pt-3 md:place-items-center md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={t("quickViewLabel")}
    >
      <div
        className="postcard-modal-backdrop fixed inset-0"
        data-testid="postcard-backdrop"
        onClick={dismiss}
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          "postcard-modal-frame relative z-10 flex max-h-[calc(100dvh-12px)] w-full max-w-[820px] flex-col overflow-hidden rounded-t-2xl outline-none md:max-h-[min(86dvh,600px)] md:rounded-[6px]",
          dragging && "transition-none",
        )}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
      >
        {/* Mobile drag-to-dismiss handle */}
        <button
          type="button"
          aria-label={t("dragToClose")}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          onClick={() => {
            if (draggedRef.current) {
              draggedRef.current = false;
              return;
            }
            dismiss();
          }}
          className="flex h-8 w-full shrink-0 cursor-grab touch-none items-center justify-center bg-(--card-stock) active:cursor-grabbing md:hidden"
        >
          <span
            aria-hidden="true"
            className="h-1 w-10 rounded-full bg-ink/25"
          />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-(--card-stock) p-1.5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:p-0">
          {children}
        </div>
      </div>
    </div>
  );
}
