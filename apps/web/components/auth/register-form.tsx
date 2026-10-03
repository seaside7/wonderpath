"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, registerParent } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function RouteCelebration() {
  return (
    <div
      role="status"
      aria-label="Account created — taking you to your dashboard"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink"
    >
      <div className="w-full max-w-sm px-8 text-center">
        <svg viewBox="0 0 300 120" className="mx-auto w-full" aria-hidden="true">
          <path
            d="M12 96 C 70 96, 80 30, 140 44 S 220 100, 288 28"
            fill="none"
            stroke="#FF6B4A"
            strokeWidth="4"
            strokeLinecap="round"
            className="route-draw-path"
          />
          <circle cx="12" cy="96" r="7" fill="#FFC857" />
          <g className="waypoint-pop">
            <circle cx="288" cy="28" r="10" fill="#3DDC97" />
            <circle cx="288" cy="28" r="4" fill="#2E2A5C" />
          </g>
        </svg>
        <p className="font-display mt-6 text-2xl text-white">
          Your journey begins
        </p>
        <p className="mt-2 text-sm text-white/70">
          Setting up your dashboard…
        </p>
      </div>
    </div>
  );
}

export default function RegisterForm() {
  const router = useRouter();
  const { authenticate } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const emailHint =
    touchedEmail && email && !isValidEmail(email)
      ? "Enter a valid email address."
      : null;
  const passwordHint =
    touchedPassword && password && password.length < 8
      ? "Password needs at least 8 characters."
      : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouchedEmail(true);
    setTouchedPassword(true);
    setError(null);

    if (!isValidEmail(email) || password.length < 8) {
      return;
    }

    setSubmitting(true);

    try {
      const { accessToken } = await registerParent({
        email: email.trim(),
        password,
      });
      await authenticate(accessToken);
      setCelebrating(true);
      window.setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1400);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setError("This email is already registered. Try signing in instead.");
      } else if (cause instanceof ApiError && cause.status === 400) {
        setError(cause.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <>
      {celebrating ? <RouteCelebration /> : null}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => setTouchedEmail(true)}
            required
            autoComplete="email"
            aria-invalid={emailHint ? true : undefined}
            className="field-glow px-3.5 py-2.5 text-sm text-ink"
          />
          {emailHint ? (
            <span className="text-xs font-normal text-coral-deep">
              {emailHint}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onBlur={() => setTouchedPassword(true)}
            required
            minLength={8}
            autoComplete="new-password"
            aria-invalid={passwordHint ? true : undefined}
            className="field-glow px-3.5 py-2.5 text-sm text-ink"
          />
          {passwordHint ? (
            <span className="text-xs font-normal text-coral-deep">
              {passwordHint}
            </span>
          ) : null}
        </label>

        {error ? (
          <p className="rounded-lg bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || celebrating}
          className="btn-tactile btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          {celebrating
            ? "Opening your atlas…"
            : submitting
              ? "Creating account…"
              : "Create account"}
        </button>

        <p className="text-sm text-ink-soft">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-coral-deep">
            Sign in
          </Link>
        </p>
      </form>
    </>
  );
}
