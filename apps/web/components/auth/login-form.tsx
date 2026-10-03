"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, loginParent } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function LoginForm() {
  const router = useRouter();
  const { authenticate } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailHint =
    touchedEmail && email && !isValidEmail(email)
      ? "Enter a valid email address."
      : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouchedEmail(true);
    setError(null);

    if (!isValidEmail(email) || !password) {
      return;
    }

    setSubmitting(true);

    try {
      const { accessToken } = await loginParent({
        email: email.trim(),
        password,
      });
      await authenticate(accessToken);
      router.push("/dashboard");
      router.refresh();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
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
          required
          autoComplete="current-password"
          className="field-glow px-3.5 py-2.5 text-sm text-ink"
        />
      </label>

      {error ? (
        <p className="rounded-lg bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="btn-tactile btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-sm text-ink-soft">
        New to WonderPath?{" "}
        <Link href="/register" className="font-semibold text-coral-deep">
          Create an account
        </Link>
      </p>
    </form>
  );
}
