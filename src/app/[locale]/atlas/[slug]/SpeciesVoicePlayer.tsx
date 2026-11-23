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
import { Button } from "@/components/ui/button";
import type { PublicAudio } from "@/lib/audio/types";
import { cn } from "@/lib/utils";

type PlayerState = "idle" | "loading" | "playing" | "paused" | "error";

const BAR_COUNT = 64;

/** Deterministic fallback ink envelope before the audio buffer is decoded. */
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
    const phrase = Math.sin((i / BAR_COUNT) * Math.PI * 3.5) * 0.5 + 0.5;
    const amp = 0.14 + raw * 0.72 * (0.35 + phrase * 0.65);
    bars.push(Math.max(0.1, Math.min(1, amp)));
  }
  return bars;
}

/** Downsample decoded PCM audio into BAR_COUNT normalized peak amplitudes. */
function peaksFromAudioBuffer(buffer: AudioBuffer): number[] {
  const channel = buffer.getChannelData(0);
  const blockSize = Math.max(1, Math.floor(channel.length / BAR_COUNT));
  const raw: number[] = [];
  let maxPeak = 0.001;
  for (let i = 0; i < BAR_COUNT; i += 1) {
    const start = i * blockSize;
    const end = Math.min(channel.length, start + blockSize);
    let peak = 0;
    for (let j = start; j < end; j += 1) {
      const v = Math.abs(channel[j] ?? 0);
      if (v > peak) peak = v;
    }
    raw.push(peak);
    if (peak > maxPeak) maxPeak = peak;
  }
  return raw.map((p) => Math.max(0.1, Math.min(1, p / maxPeak)));
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
  const [decodedBars, setDecodedBars] = useState<number[] | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const attemptRef = useRef(0);
  const pendingSeekRef = useRef<number | null>(null);
  const scrubbingRef = useRef(false);
  const decodeStartedRef = useRef(false);

  const fallbackBars = useMemo(() => seedBars(slug), [slug]);
  const bars = decodedBars ?? fallbackBars;

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

  const decodeRealWaveform = useCallback(async () => {
    if (!audioUrl || decodeStartedRef.current || typeof window === "undefined") {
      return;
    }
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    decodeStartedRef.current = true;
    try {
      const response = await fetch(audioUrl);
      if (!response.ok) return;
      const arrayBuffer = await response.arrayBuffer();
      const ctx = new AudioCtx();
      try {
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        setDecodedBars(peaksFromAudioBuffer(audioBuffer));
      } finally {
        await ctx.close().catch(() => {});
      }
    } catch {
      // Fall back quietly to the seeded waveform on opaque/CORS audio responses.
    }
  }, [audioUrl]);

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
    void decodeRealWaveform();
    const attempt = ++attemptRef.current;
    setState("loading");
    try {
      await el.play();
      if (attemptRef.current === attempt) setState("playing");
    } catch {
      if (attemptRef.current === attempt) setState("error");
    }
  }, [audioUrl, decodeRealWaveform, ensureSource, loop, state]);

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
        if (el.readyState >= 1) {
          pendingSeekRef.current = null;
          el.currentTime = nextTime;
        } else {
          // Defer seeking until loadedmetadata so browsers do not reset currentTime to 0.
          pendingSeekRef.current = nextTime;
        }
      }
    },
    [duration, ensureSource],
  );

  const scrubFromClientX = useCallback(
    (clientX: number) => {
      const box = trackRef.current?.getBoundingClientRect();
      if (!box || box.width <= 0) return;
      seekToFraction((clientX - box.left) / box.width);
    },
    [seekToFraction],
  );

  const handleTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    scrubbingRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    scrubFromClientX(event.clientX);
  };

  const handleTrackPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    scrubFromClientX(event.clientX);
  };

  const handleTrackPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // Ignore if pointer capture was not active.
    }
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

      {/* Monochrome ink-on-paper scrubbable waveform strip */}
      <div className="overflow-hidden rounded-md border border-hairline bg-background/80">
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label={tDetail("scrubAudio")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onPointerUp={handleTrackPointerEnd}
          onPointerCancel={handleTrackPointerEnd}
          className="voice-ink-track relative flex h-16 cursor-pointer touch-none items-end gap-[2px] px-2.5 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          onKeyDown={handleTrackKeyDown}
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void togglePlay()}
              aria-label={playLabel}
              aria-busy={state === "loading"}
              className="size-7 rounded-full bg-background text-ink shadow-(--raised) hover:bg-background active:scale-90"
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
            </Button>

            <span className="font-mono text-[10.5px] tracking-[0.06em] text-ink-2 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
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
              "h-6 gap-1 rounded-full px-2 font-mono text-[9px] tracking-[0.14em] uppercase",
              loop
                ? "bg-background text-ink shadow-(--raised) hover:bg-background"
                : "text-ink-soft hover:bg-transparent hover:text-ink",
            )}
          >
            <RepeatIcon aria-hidden className="size-2.5" />
            <span>{tDetail("loop")}</span>
          </Button>
        </div>
      </div>

      <audio
        ref={audioRef}
        preload="none"
        aria-hidden="true"
        onLoadedMetadata={(event) => {
          const el = event.currentTarget;
          if (Number.isFinite(el.duration) && el.duration > 0) {
            setDuration(el.duration);
          }
          if (pendingSeekRef.current !== null) {
            el.currentTime = pendingSeekRef.current;
            pendingSeekRef.current = null;
          }
        }}
        onTimeUpdate={(event) => {
          if (!scrubbingRef.current) {
            setCurrentTime(event.currentTarget.currentTime);
          }
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
