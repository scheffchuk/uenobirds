"use client";

import {
  LoaderCircleIcon,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  RotateCcwIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { useTranslations } from "next-intl";
import type { PublicAudio } from "@/lib/audio/types";
import { cn } from "@/lib/utils";

type PlayerState = "idle" | "loading" | "playing" | "paused" | "error";

const BAR_COUNT = 64;

/** Deterministic organic ink-stroke amplitude envelope for lazy pre-play rendering. */
function seedBars(seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const bars: number[] = [];
  for (let i = 0; i < BAR_COUNT; i += 1) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const raw = (h >>> 0) / 4294967295;
    // Cluster syllables like natural bird phrases separated by brief rests.
    const phrase = Math.sin((i / BAR_COUNT) * Math.PI * 3.5) * 0.5 + 0.5;
    const amp = 0.14 + raw * 0.72 * (0.35 + phrase * 0.65);
    bars.push(Math.max(0.1, Math.min(1, amp)));
  }
  return bars;
}

export function formatTime(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return "--:--";
  }
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function SpeciesVoicePlayer({
  slug,
  audio,
}: {
  slug: string;
  audio?: PublicAudio;
}) {
  const tAtlas = useTranslations("Atlas");
  const tDetail = useTranslations("AtlasDetail");

  const audioUrl = audio?.status === "available" ? audio.url : undefined;
  const [state, setState] = useState<PlayerState>("idle");
  const [loop, setLoop] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | undefined>(
    audio?.durationSeconds,
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const attemptRef = useRef(0);

  const bars = useMemo(() => seedBars(slug), [slug]);

  useEffect(() => {
    const el = audioRef.current;
    return () => {
      if (el) {
        attemptRef.current += 1;
        el.pause();
        el.currentTime = 0;
        el.removeAttribute("src");
        el.load();
      }
    };
  }, []);

  const progress =
    duration && duration > 0
      ? Math.max(0, Math.min(1, currentTime / duration))
      : 0;
  const progressPct = Math.round(progress * 100);

  const ensureSource = useCallback(
    (el: HTMLAudioElement) => {
      if (!audioUrl) return;
      if (!el.getAttribute("src")) {
        el.src = audioUrl;
        el.load();
      }
    },
    [audioUrl],
  );

  const togglePlay = useCallback(async () => {
    const el = audioRef.current;
    if (!el || !audioUrl || state === "loading") return;

    if (state === "playing") {
      attemptRef.current += 1;
      el.pause();
      setState("paused");
      return;
    }

    if (state === "error") {
      el.pause();
      el.currentTime = 0;
      el.removeAttribute("src");
      el.load();
      setCurrentTime(0);
    }

    ensureSource(el);
    el.loop = loop;
    const attempt = ++attemptRef.current;
    setState("loading");
    try {
      await el.play();
      if (attemptRef.current === attempt) setState("playing");
    } catch {
      if (attemptRef.current === attempt) setState("error");
    }
  }, [audioUrl, ensureSource, loop, state]);

  const seekToFraction = useCallback(
    (fraction: number) => {
      const el = audioRef.current;
      const clamped = Math.max(0, Math.min(1, fraction));
      const targetDuration =
        el && Number.isFinite(el.duration) && el.duration > 0
          ? el.duration
          : duration;
      if (!targetDuration || targetDuration <= 0) return;

      const nextTime = clamped * targetDuration;
      setCurrentTime(nextTime);
      if (el) {
        ensureSource(el);
        try {
          el.currentTime = nextTime;
        } catch {
          // Ignore before metadata loads.
        }
      }
    },
    [duration, ensureSource],
  );

  const handleTrackPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = trackRef.current?.getBoundingClientRect();
    if (!box || box.width <= 0) return;
    seekToFraction((event.clientX - box.left) / box.width);
  };

  const handleTrackKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      seekToFraction(progress + 0.05);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      seekToFraction(progress - 0.05);
    } else if (event.key === "Home") {
      event.preventDefault();
      seekToFraction(0);
    } else if (event.key === "End") {
      event.preventDefault();
      seekToFraction(1);
    }
  };

  if (!audioUrl) return null;

  const playLabel =
    state === "loading"
      ? tAtlas("loadingAudio")
      : state === "error"
        ? tAtlas("retryAudio")
        : state === "playing"
          ? tAtlas("pauseAudio")
          : tAtlas("playAudio");

  const metaBits = [audio?.soundType, audio?.recordist].filter(Boolean);

  return (
    <section
      aria-label={tDetail("voice")}
      className="postcard-panel flex flex-col gap-3 px-5 py-4 sm:px-6 sm:py-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="editorial-section-heading">{tDetail("voice")}</h2>
        {metaBits.length > 0 ? (
          <p className="truncate font-mono text-[9.5px] tracking-[0.08em] text-ink-soft uppercase">
            {metaBits.join(" · ")}
          </p>
        ) : null}
      </div>

      {/* Monochrome ink-on-paper scrubbable spectrogram/waveform strip */}
      <div className="overflow-hidden rounded-md border border-hairline bg-background/80">
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label={tDetail("scrubAudio")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          onPointerDown={handleTrackPointer}
          onKeyDown={handleTrackKeyDown}
          className="voice-ink-track relative flex h-16 cursor-pointer items-end gap-[2px] px-2.5 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {bars.map((amp, index) => {
            const barPos = (index + 0.5) / bars.length;
            const played = barPos <= progress;
            return (
              <span
                key={index}
                aria-hidden="true"
                className={cn(
                  "flex-1 rounded-[1px] transition-colors duration-100",
                  played ? "bg-ink" : "bg-ink-2/30",
                )}
                style={{ height: `${Math.round(amp * 100)}%` }}
              />
            );
          })}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1 w-[1.5px] bg-ink/80 transition-[left] duration-75"
            style={{ left: `${progress * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-hairline bg-paper-2/55 px-2.5 py-1.5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void togglePlay()}
              aria-label={playLabel}
              aria-busy={state === "loading"}
              className="inline-flex size-7 items-center justify-center rounded-full bg-background text-ink shadow-(--raised) transition-transform hover:scale-95 active:scale-90 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {state === "loading" ? (
                <LoaderCircleIcon aria-hidden className="size-3.5 animate-spin" />
              ) : state === "error" ? (
                <RotateCcwIcon aria-hidden className="size-3.5" />
              ) : state === "playing" ? (
                <PauseIcon aria-hidden className="size-3.5 fill-current" />
              ) : (
                <PlayIcon aria-hidden className="size-3.5 translate-x-[0.5px] fill-current" />
              )}
            </button>

            <span className="font-mono text-[10.5px] tracking-[0.06em] text-ink-2 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <button
            type="button"
            aria-pressed={loop}
            aria-label={tDetail("loopAudio")}
            onClick={() => {
              setLoop((prev) => {
                const next = !prev;
                if (audioRef.current) audioRef.current.loop = next;
                return next;
              });
            }}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-full px-2 font-mono text-[9px] tracking-[0.14em] uppercase transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              loop
                ? "bg-background text-ink shadow-(--raised)"
                : "text-ink-soft hover:text-ink",
            )}
          >
            <RepeatIcon aria-hidden className="size-2.5" />
            <span>{tDetail("loop")}</span>
          </button>
        </div>
      </div>

      <audio
        ref={audioRef}
        preload="none"
        aria-hidden="true"
        onLoadedMetadata={(event) => {
          const d = event.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime);
        }}
        onPlaying={() => setState("playing")}
        onPause={() => {
          attemptRef.current += 1;
          setState((prev) => (prev === "idle" ? "idle" : "paused"));
        }}
        onEnded={() => {
          attemptRef.current += 1;
          setCurrentTime(0);
          setState("idle");
        }}
        onError={() => {
          attemptRef.current += 1;
          setState("error");
        }}
      />
    </section>
  );
}
