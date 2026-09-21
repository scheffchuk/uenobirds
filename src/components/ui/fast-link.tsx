"use client";

import { startTransition, useRef, type ComponentProps } from "react";
import { Link } from "@/i18n/navigation";

type Props = ComponentProps<typeof Link> & {
  onPressNavigate?: () => void;
};

/** next-intl Link that starts the transition on mousedown. */
export function FastLink({
  onClick,
  onMouseDown,
  onPressNavigate,
  ...props
}: Props) {
  const navigatedOnMouseDown = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  return (
    <Link
      {...props}
      onMouseDown={(event) => {
        const target = event.currentTarget.getAttribute("target");
        const interactiveTarget =
          event.target instanceof Element
            ? event.target.closest(
                'button, input, select, textarea, [contenteditable="true"], [role="button"]',
              )
            : null;
        const shouldNavigate =
          !interactiveTarget &&
          (!target || target === "_self") &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey &&
          !event.currentTarget.hasAttribute("download") &&
          event.button === 0;

        if (!shouldNavigate) {
          onMouseDown?.(event);
          return;
        }

        startTransition(() => {
          onPressNavigate?.();
          event.currentTarget.click();
          navigatedOnMouseDown.current = true;
          clearTimeout(resetTimer.current);
          resetTimer.current = setTimeout(() => {
            navigatedOnMouseDown.current = false;
          }, 500);
        });
        event.preventDefault();
        onMouseDown?.(event);
      }}
      onClick={(event) => {
        if (navigatedOnMouseDown.current) {
          clearTimeout(resetTimer.current);
          navigatedOnMouseDown.current = false;
          event.preventDefault();
          return;
        }

        onClick?.(event);
      }}
    />
  );
}
