"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  ChildInput,
  ChildProfile,
  createChild,
  updateChild,
} from "@/lib/api";

const GRADE_OPTIONS = [
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
];

const CURRICULA_OPTIONS = ["IB", "Cambridge", "Merdeka", "Nasional"];

const LANGUAGE_OPTIONS = ["English", "Bahasa Indonesia"];

interface ChildFormProps {
  child?: ChildProfile;
}

export default function ChildForm({ child }: ChildFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(child?.fullName ?? "");
  const [nickname, setNickname] = useState(child?.nickname ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(child?.dateOfBirth ?? "");
  const [gender, setGender] = useState<ChildInput["gender"]>(
    child?.gender ?? "Boy",
  );
  const [grade, setGrade] = useState(child?.grade ?? "Grade 1");
  const [curricula, setCurricula] = useState<string[]>(child?.curricula ?? []);
  const [preferredLanguage, setPreferredLanguage] = useState(
    child?.preferredLanguage ?? "English",
  );
  const [schoolName, setSchoolName] = useState(child?.schoolName ?? "");
  const [touchedName, setTouchedName] = useState(false);
  const [touchedDob, setTouchedDob] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nameHint =
    touchedName && !fullName.trim() ? "Add your child's full name." : null;
  const dobHint =
    touchedDob && !dateOfBirth ? "Add your child's date of birth." : null;
  const curriculaHint =
    curricula.length === 0 ? "Choose at least one curriculum." : null;

  function toggleCurriculum(curriculum: string) {
    setCurricula((current) =>
      current.includes(curriculum)
        ? current.filter((entry) => entry !== curriculum)
        : [...current, curriculum],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouchedName(true);
    setTouchedDob(true);
    setError(null);

    if (!fullName.trim() || !dateOfBirth || curricula.length === 0) {
      return;
    }

    setSubmitting(true);

    const input: ChildInput = {
      fullName: fullName.trim(),
      dateOfBirth,
      gender,
      grade,
      curricula,
      preferredLanguage,
      ...(nickname.trim() ? { nickname: nickname.trim() } : {}),
      ...(schoolName.trim() ? { schoolName: schoolName.trim() } : {}),
    };

    try {
      if (child) {
        await updateChild(child.id, input);
      } else {
        await createChild(input);
      }
      router.push("/dashboard");
      router.refresh();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 400) {
        setError(cause.message);
      } else if (cause instanceof ApiError && cause.status === 404) {
        setError("This child no longer exists.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Full name
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          onBlur={() => setTouchedName(true)}
          required
          aria-invalid={nameHint ? true : undefined}
          className="field-glow px-3.5 py-2.5 text-sm"
        />
        {nameHint ? (
          <span className="text-xs font-normal text-coral-deep">
            {nameHint}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Nickname <span className="font-normal text-ink-soft">(optional)</span>
        <input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          className="field-glow px-3.5 py-2.5 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Date of birth
        <input
          type="date"
          value={dateOfBirth}
          onChange={(event) => setDateOfBirth(event.target.value)}
          onBlur={() => setTouchedDob(true)}
          required
          aria-invalid={dobHint ? true : undefined}
          className="field-glow px-3.5 py-2.5 text-sm"
        />
        {dobHint ? (
          <span className="text-xs font-normal text-coral-deep">
            {dobHint}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Gender
        <select
          value={gender}
          onChange={(event) =>
            setGender(event.target.value as ChildInput["gender"])
          }
          className="field-glow px-3.5 py-2.5 text-sm"
        >
          <option value="Boy">Boy</option>
          <option value="Girl">Girl</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Grade
        <select
          value={grade}
          onChange={(event) => setGrade(event.target.value)}
          className="field-glow px-3.5 py-2.5 text-sm"
        >
          {GRADE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="text-sm font-medium text-ink">
          Supported curricula
        </legend>
        <div className="mt-2 flex flex-wrap gap-2.5">
          {CURRICULA_OPTIONS.map((curriculum) => {
            const active = curricula.includes(curriculum);
            return (
              <button
                key={curriculum}
                type="button"
                onClick={() => toggleCurriculum(curriculum)}
                aria-pressed={active}
                className={
                  active
                    ? "btn-tactile rounded-full bg-ink px-4 py-2 text-sm font-medium text-white"
                    : "btn-tactile rounded-full border border-line bg-card px-4 py-2 text-sm font-medium text-ink"
                }
              >
                {curriculum}
              </button>
            );
          })}
        </div>
        {curriculaHint ? (
          <p className="mt-1.5 text-xs text-ink-soft">{curriculaHint}</p>
        ) : null}
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Preferred language
        <select
          value={preferredLanguage}
          onChange={(event) => setPreferredLanguage(event.target.value)}
          className="field-glow px-3.5 py-2.5 text-sm"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        School name{" "}
        <span className="font-normal text-ink-soft">(optional)</span>
        <input
          value={schoolName}
          onChange={(event) => setSchoolName(event.target.value)}
          className="field-glow px-3.5 py-2.5 text-sm"
        />
      </label>

      {error ? (
        <p className="rounded-lg bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="btn-tactile btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          {submitting ? "Saving…" : child ? "Save changes" : "Add child"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="btn-tactile rounded-xl border border-line bg-card px-5 py-2.5 text-sm font-medium text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
