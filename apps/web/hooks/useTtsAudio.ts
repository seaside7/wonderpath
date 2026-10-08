"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MascotMouth =
  | "closed"
  | "small-open"
  | "round-o"
  | "toothy-grin"
  | "wide-open";

function amplitudeToMouth(amplitude: number): MascotMouth {
  if (amplitude < 0.05) return "closed";
  if (amplitude < 0.2) return "small-open";
  if (amplitude < 0.5) return "round-o";
  if (amplitude < 0.75) return "toothy-grin";
  return "wide-open";
}

const MOUTH_FILENAME: Record<MascotMouth, string> = {
  closed: "atlas-mouth-closed.png",
  "small-open": "atlas-mouth-small-open.png",
  "round-o": "atlas-mouth-round-o.png",
  "toothy-grin": "atlas-mouth-toothy-grin.png",
  "wide-open": "atlas-mouth-wide-open.png",
};

interface UseTtsAudioOptions {
  audioUrl: string | null;
  /** Called when the audio finishes playing naturally */
  onFinished?: () => void;
}

interface UseTtsAudioReturn {
  currentMouth: MascotMouth;
  isPlaying: boolean;
  play: () => void;
  stop: () => void;
}

export function useTtsAudio({
  audioUrl,
  onFinished,
}: UseTtsAudioOptions): UseTtsAudioReturn {
  const [currentMouth, setCurrentMouth] = useState<MascotMouth>("closed");
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const stop = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentMouth("closed");
    setIsPlaying(false);
  }, []);

  const play = useCallback(() => {
    if (!audioUrl) return;

    stop();

    const audio = new Audio();
    audio.src = audioUrl;
    audio.load();
    audioRef.current = audio;

    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;
    analyserRef.current = analyser;

    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    sourceRef.current = source;

    audio.addEventListener("ended", () => {
      stop();
      onFinished?.();
    });

    setIsPlaying(true);
    audio.play().catch(() => {
      stop();
    });

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function update() {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const normalizedAmplitude = average / 255;

      setCurrentMouth(amplitudeToMouth(normalizedAmplitude));
      animationRef.current = requestAnimationFrame(update);
    }

    animationRef.current = requestAnimationFrame(update);
  }, [audioUrl, stop, onFinished]);

  useEffect(() => {
    return () => {
      stop();
      audioContextRef.current?.close();
    };
  }, [stop]);

  return { currentMouth, isPlaying, play, stop };
}

export { MOUTH_FILENAME };
