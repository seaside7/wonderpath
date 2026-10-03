"use client";

import { useRef, useState } from "react";

interface PinEntryProps {
  onComplete: (pin: string) => void;
  error: string | null;
  label?: string;
  submitting?: boolean;
}

export default function PinEntry({
  onComplete,
  error,
  label = "Enter your 4-digit PIN",
  submitting = false,
}: PinEntryProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  function focusBox(index: number) {
    inputsRef.current[index]?.focus();
  }

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 3) {
      focusBox(index + 1);
    }
    if (digit && next.every((entry) => entry !== "")) {
      onComplete(next.join(""));
    }
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace" && digits[index] === "" && index > 0) {
      focusBox(index - 1);
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);
    if (pasted.length === 0) return;
    const next = ["", "", "", ""];
    for (let i = 0; i < pasted.length; i += 1) {
      next[i] = pasted[i];
    }
    setDigits(next);
    focusBox(Math.min(pasted.length, 3));
    if (next.every((entry) => entry !== "")) {
      onComplete(next.join(""));
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-ink">{label}</p>
      <div className="mt-3 flex items-center justify-center gap-2.5">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputsRef.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            disabled={submitting}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            aria-label={`PIN digit ${index + 1}`}
            className="field-glow h-14 w-12 text-center font-display text-2xl text-ink disabled:opacity-60"
          />
        ))}
      </div>
      {error ? (
        <p className="mt-3 rounded-lg bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
          {error}
        </p>
      ) : null}
    </div>
  );
}
