"use client";

import { XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const DISMISS_THRESHOLD_PX = 110;

export function PostcardModal({
  children,
  onClose,
}: {
  children: ReactNode;
  /** Optional test/override close callback; defaults to `router.back()`. */
  onClose?: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("AtlasDetail");
  const dialogRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const dismiss = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  }, [onClose, router]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dismiss]);

  const handleDragStart = (event: PointerEvent<HTMLButtonElement>) => {
    dragStartY.current = event.clientY;
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleDragMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragStartY.current === null) return;
    const delta = Math.max(0, event.clientY - dragStartY.current);
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
          "postcard-modal-frame relative z-10 flex max-h-[calc(100dvh-12px)] w-full max-w-[940px] flex-col overflow-hidden rounded-t-2xl outline-none md:max-h-[min(88dvh,760px)] md:rounded-[4px]",
          dragging && "transition-none",
        )}
        style={
          dragY > 0
            ? { transform: `translateY(${dragY}px)` }
            : undefined
        }
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
            if (dragY === 0) dismiss();
          }}
          className="flex h-8 w-full shrink-0 cursor-grab touch-none items-center justify-center bg-(--card-stock) active:cursor-grabbing md:hidden"
        >
          <span
            aria-hidden="true"
            className="h-1 w-10 rounded-full bg-ink/25"
          />
        </button>

        {/* Close button */}
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("closeModal")}
          className="absolute top-2.5 right-2.5 z-30 inline-flex size-8 items-center justify-center rounded-full bg-background/95 text-ink-soft shadow-(--raised) transition-colors hover:text-ink active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 md:top-3.5 md:right-3.5"
        >
          <XIcon aria-hidden className="size-4" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-(--card-stock) p-1.5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:p-0">
          {children}
        </div>
      </div>
    </div>
  );
}
