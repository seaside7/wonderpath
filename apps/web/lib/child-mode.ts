const CHILD_MODE_KEY = "childModeChildId";

export function getChildModeChildId(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(CHILD_MODE_KEY);
}

export function setChildModeChildId(childId: string): void {
  window.sessionStorage.setItem(CHILD_MODE_KEY, childId);
}

export function clearChildModeChildId(): void {
  window.sessionStorage.removeItem(CHILD_MODE_KEY);
}
