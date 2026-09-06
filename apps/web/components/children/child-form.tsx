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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleCurriculum(curriculum: string) {
    setCurricula((current) =>
      current.includes(curriculum)
        ? current.filter((entry) => entry !== curriculum)
        : [...current, curriculum],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
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
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Full Name
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Nickname
        <input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Date of Birth
        <input
          type="date"
          value={dateOfBirth}
          onChange={(event) => setDateOfBirth(event.target.value)}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Gender
        <select
          value={gender}
          onChange={(event) =>
            setGender(event.target.value as ChildInput["gender"])
          }
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none"
        >
          <option value="Boy">Boy</option>
          <option value="Girl">Girl</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Grade
        <select
          value={grade}
          onChange={(event) => setGrade(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none"
        >
          {GRADE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="text-sm font-medium">Supported Curricula</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {CURRICULA_OPTIONS.map((curriculum) => (
            <label
              key={curriculum}
              className="flex items-center gap-2 text-sm text-zinc-800"
            >
              <input
                type="checkbox"
                checked={curricula.includes(curriculum)}
                onChange={() => toggleCurriculum(curriculum)}
                className="rounded border-zinc-300"
              />
              {curriculum}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Preferred Language
        <select
          value={preferredLanguage}
          onChange={(event) => setPreferredLanguage(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        School Name
        <input
          value={schoolName}
          onChange={(event) => setSchoolName(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none"
        />
      </label>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : child ? "Save changes" : "Add child"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}