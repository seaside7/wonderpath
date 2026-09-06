export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    let details: unknown = null;

    try {
      const body = (await response.json()) as {
        message?: string | string[];
      };

      if (Array.isArray(body.message)) {
        message = body.message.join(", ");
        details = body.message;
      } else if (typeof body.message === "string") {
        message = body.message;
      }
    } catch {
      // Non-JSON error body.
    }

    throw new ApiError(message, response.status, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem("wonderpath_token");
}

export function storeToken(token: string): void {
  window.sessionStorage.setItem("wonderpath_token", token);
}

export function clearStoredToken(): void {
  window.sessionStorage.removeItem("wonderpath_token");
}

export function authorizedHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface AuthResponse {
  accessToken: string;
}

export interface ParentProfile {
  id: string;
  email: string;
  createdAt: string;
}

export function registerParent(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function loginParent(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchParentProfile(): Promise<ParentProfile> {
  return request<ParentProfile>("/me", {
    headers: authorizedHeaders(),
  });
}

export interface ChildProfile {
  id: string;
  fullName: string;
  nickname: string | null;
  dateOfBirth: string;
  gender: "Boy" | "Girl";
  grade: string;
  curricula: string[];
  preferredLanguage: string;
  schoolName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChildInput {
  fullName: string;
  nickname?: string;
  dateOfBirth: string;
  gender: "Boy" | "Girl";
  grade: string;
  curricula: string[];
  preferredLanguage: string;
  schoolName?: string;
}

export function listChildren(): Promise<ChildProfile[]> {
  return request<ChildProfile[]>("/children", {
    headers: authorizedHeaders(),
  });
}

export function getChild(childId: string): Promise<ChildProfile> {
  return request<ChildProfile>(`/children/${childId}`, {
    headers: authorizedHeaders(),
  });
}

export function createChild(input: ChildInput): Promise<ChildProfile> {
  return request<ChildProfile>("/children", {
    method: "POST",
    headers: authorizedHeaders(),
    body: JSON.stringify(input),
  });
}

export function updateChild(
  childId: string,
  input: ChildInput,
): Promise<ChildProfile> {
  return request<ChildProfile>(`/children/${childId}`, {
    method: "PATCH",
    headers: authorizedHeaders(),
    body: JSON.stringify(input),
  });
}

export function deleteChild(childId: string): Promise<void> {
  return request<void>(`/children/${childId}`, {
    method: "DELETE",
    headers: authorizedHeaders(),
  });
}

export interface LearningSession {
  id: string;
  child: { id: string; fullName: string };
  curriculum: string;
  subject: string;
  status: string;
  context: string;
  focusLearningObjective: { id: string; name: string } | null;
  startedAt: string;
}

export function startLearningSession(input: {
  childId: string;
  curriculum: string;
  subject: string;
}): Promise<LearningSession> {
  return request<LearningSession>("/learning-sessions", {
    method: "POST",
    headers: authorizedHeaders(),
    body: JSON.stringify(input),
  });
}

export function getCurrentSession(childId: string): Promise<LearningSession> {
  return request<LearningSession>(`/learning-sessions/current?childId=${childId}`, {
    headers: authorizedHeaders(),
  });
}

export interface ServedQuestion {
  id: string;
  questionText: string;
  questionType: "Multiple Choice" | "True / False";
  options: string[];
  difficulty: number;
}

export interface NextQuestionData {
  question: ServedQuestion | null;
}

export function fetchNextQuestion(sessionId: string): Promise<NextQuestionData> {
  return request<NextQuestionData>(
    `/learning-sessions/${sessionId}/next-question`,
    { headers: authorizedHeaders() },
  );
}

export type PerceivedDifficulty = "Easy" | "Just Right" | "Difficult";

export interface AttemptResult {
  id: string;
  questionId: string;
  selectedAnswer: string;
  correct: boolean;
  timeSpent: number;
  hintUsed: boolean;
  perceivedDifficulty: PerceivedDifficulty;
  attemptNumber: number;
  explanation: string;
}

export function submitAttempt(input: {
  learningSessionId: string;
  questionId: string;
  selectedAnswer: string;
  timeSpent: number;
  hintUsed: boolean;
  perceivedDifficulty: PerceivedDifficulty;
}): Promise<AttemptResult> {
  return request<AttemptResult>("/attempts", {
    method: "POST",
    headers: authorizedHeaders(),
    body: JSON.stringify(input),
  });
}

export function completeSession(sessionId: string): Promise<LearningSession> {
  return request<LearningSession>(`/learning-sessions/${sessionId}/complete`, {
    method: "POST",
    headers: authorizedHeaders(),
  });
}

export interface RecommendationObjective {
  id: string;
  name: string;
  description: string;
  estimatedMasteryTime: number;
  hierarchy: {
    subject: { id: string; code: string; name: string };
    topic: { id: string; name: string };
    subtopic: { id: string; name: string };
  };
}

export interface RecommendationItem {
  learningObjective: RecommendationObjective;
  action: string;
  reasonCodes: string[];
  explanation: string;
  score: number;
}

export interface RecommendationData {
  childId: string;
  session: {
    id: string;
    curriculum: string;
    subject: string;
    context: string;
  };
  recommendations: RecommendationItem[];
}

export function fetchRecommendations(
  childId: string,
): Promise<RecommendationData> {
  return request<RecommendationData>(`/children/${childId}/recommendations`, {
    headers: authorizedHeaders(),
  });
}

export interface SessionFocus {
  id: string;
  childId: string;
  curriculum: string;
  subject: string;
  context: string;
  focusLearningObjective: { id: string; name: string } | null;
}

export function acceptRecommendation(
  sessionId: string,
  learningObjectiveId: string,
): Promise<SessionFocus> {
  return request<SessionFocus>(
    `/learning-sessions/${sessionId}/recommendation/accept`,
    {
      method: "POST",
      headers: authorizedHeaders(),
      body: JSON.stringify({ learningObjectiveId }),
    },
  );
}

export interface MasteryRecord {
  learningObjectiveId: string;
  learningObjectiveName: string;
  masteryScore: number;
  confidenceScore: number;
  totalAttempts: number;
  correctAttempts: number;
  wrongAttempts: number;
  averageResponseTime: number;
  hintUsageCount: number;
  lastPracticedAt: string;
  reviewRecommended: boolean;
  reasonCodes: string[];
  updatedAt: string;
}

export interface MasteryData {
  childId: string;
  mastery: MasteryRecord[];
}

export function fetchMastery(childId: string): Promise<MasteryData> {
  return request<MasteryData>(`/children/${childId}/mastery`, {
    headers: authorizedHeaders(),
  });
}