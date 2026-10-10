"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { MascotMouth, useTtsAudio } from "@/hooks/useTtsAudio";

interface AtlasSpeech {
  hasAudio: boolean;
  currentMouth: MascotMouth;
  isPlaying: boolean;
  speak: (audioUrl: string | null) => void;
  replay: () => void;
  stop: () => void;
}

const AtlasSpeechContext = createContext<AtlasSpeech | null>(null);

export function AtlasSpeechProvider({ children }: { children: ReactNode }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const { currentMouth, isPlaying, play, stop } = useTtsAudio({
    audioUrl,
    autoPlay: true,
  });

  // Stable identity: callers run this from effects, and re-requesting the
  // same clip must not restart it - use replay() for that.
  const speak = useCallback((url: string | null) => {
    if (url === audioUrlRef.current) return;
    audioUrlRef.current = url;
    setAudioUrl(url);
  }, []);

  const value = useMemo(
    () => ({
      hasAudio: audioUrl !== null,
      currentMouth,
      isPlaying,
      speak,
      replay: play,
      stop,
    }),
    [audioUrl, currentMouth, isPlaying, speak, play, stop],
  );

  return (
    <AtlasSpeechContext.Provider value={value}>
      {children}
    </AtlasSpeechContext.Provider>
  );
}

export function useAtlasSpeech(): AtlasSpeech | null {
  return useContext(AtlasSpeechContext);
}
