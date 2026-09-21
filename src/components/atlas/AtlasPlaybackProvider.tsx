"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { AudioPlaybackCoordinator } from "@/lib/audio/playback";

type AtlasPlayback = {
  register: (slug: string, audio: HTMLAudioElement | null) => void;
  requestPlay: (slug: string) => void;
  release: (slug: string) => void;
};

const AtlasPlaybackContext = createContext<AtlasPlayback | null>(null);

export function AtlasPlaybackProvider({ children }: { children: ReactNode }) {
  const playback = useRef(new AudioPlaybackCoordinator());

  useEffect(
    () => () => {
      playback.current.dispose();
    },
    [],
  );

  return (
    <AtlasPlaybackContext.Provider
      value={{
        register: (slug, audio) => playback.current.register(slug, audio),
        requestPlay: (slug) => playback.current.requestPlay(slug),
        release: (slug) => playback.current.release(slug),
      }}
    >
      {children}
    </AtlasPlaybackContext.Provider>
  );
}

export function useAtlasPlayback(): AtlasPlayback | null {
  return useContext(AtlasPlaybackContext);
}
