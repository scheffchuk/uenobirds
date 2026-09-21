import { Suspense, ViewTransition, type ReactNode } from "react";

export function AnimatedSuspense({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <ViewTransition default="none" exit="auto">
          {fallback}
        </ViewTransition>
      }
    >
      <ViewTransition enter="auto" default="none">
        {children}
      </ViewTransition>
    </Suspense>
  );
}
