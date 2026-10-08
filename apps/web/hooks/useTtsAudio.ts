"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MascotMouth =
  | "closed"
  | "small-open"
  | "round-o"
  | "wide-open"
  | "toothy-grin";

const MOUTH_FILENAME: Record<MascotMouth, string> = {
  closed: "atlas-mouth-closed.png",
  "small-open": "atlas-mouth-small-open.png",
  "round-o": "atlas-mouth-round-o.png",
  "wide-open": "atlas-mouth-wide-open.png",
  "toothy-grin": "atlas-mouth-toothy-grin.png",
};

function amplitudeToMouth(amplitude: number): MascotMouth {
  // Same 0–255 average of the first 20 frequency bins used by demo.html.
  if (amplitude < 15) return "closed";
  if (amplitude < 60) return "small-open";
  if (amplitude < 110) return "round-o";
  if (amplitude < 160) return "wide-open";
  return "toothy-grin";
}

interface UseTtsAudioOptions {
  audioUrl: string | null;
  autoPlay?: boolean;
}

interface UseTtsAudioReturn {
  currentMouth: MascotMouth;
  isPlaying: boolean;
  hasError: boolean;
  play: () => void;
  stop: () => void;
}

export function useTtsAudio({
  audioUrl,
  autoPlay = false,
}: UseTtsAudioOptions): UseTtsAudioReturn {
  const [currentMouth, setCurrentMouth] = useState<MascotMouth>("closed");
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }

    sourceRef.current?.disconnect();
    sourceRef.current = null;

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== "closed") {
      void audioContext.close().catch(() => undefined);
    }

    setCurrentMouth("closed");
    setIsPlaying(false);
  }, []);

  const play = useCallback(() => {
    if (!audioUrl || typeof window === "undefined") return;

    stop();
    setHasError(false);

    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) {
      setHasError(true);
      return;
    }

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.src = audioUrl;
    audioRef.current = audio;

    const audioContext = new AudioContextConstructor();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;

    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    sourceRef.current = source;

    const failPlayback = () => {
      if (audioRef.current !== audio) return;
      stop();
      setHasError(true);
    };
    audio.addEventListener("error", failPlayback, { once: true });
    audio.addEventListener("ended", stop, { once: true });

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      if (audioRef.current !== audio || audio.paused || audio.ended) return;

      analyser.getByteFrequencyData(data);
      const speechBins = Math.min(20, data.length);
      let sum = 0;
      for (let index = 0; index < speechBins; index += 1) {
        sum += data[index];
      }
      setCurrentMouth(amplitudeToMouth(sum / speechBins));
      animationRef.current = requestAnimationFrame(tick);
    };

    void audioContext
      .resume()
      .then(() => audio.play())
      .then(() => {
        if (audioRef.current !== audio) return;
        setIsPlaying(true);
        animationRef.current = requestAnimationFrame(tick);
      })
      .catch(failPlayback);
  }, [audioUrl, stop]);

  useEffect(() => {
    if (!autoPlay || !audioUrl) return;

    const frame = requestAnimationFrame(play);
    return () => {
      cancelAnimationFrame(frame);
      stop();
    };
  }, [audioUrl, autoPlay, play, stop]);

  return { currentMouth, isPlaying, hasError, play, stop };
}

export { MOUTH_FILENAME };
