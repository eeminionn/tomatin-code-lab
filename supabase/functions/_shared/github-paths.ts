import type { Language } from "./types.ts";

const FILE_NAMES: Record<Language, string> = {
  javascript: "solucion.js",
  python: "solucion.py",
  cpp: "solucion.cpp",
};

function safeSegment(value: string, fallback: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^[._-]+|[._-]+$/g, "")
      .slice(0, 80) || fallback
  );
}

export function studentSubmissionFolder(
  githubLogin: string,
  userId: string,
): string {
  const login = safeSegment(githubLogin, "estudiante");
  const shortId =
    userId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "sin-id";
  return `${login}-${shortId}`;
}

export function submissionFilePath(input: {
  githubLogin: string;
  userId: string;
  missionSlug: string;
  language: Language;
}): string {
  const student = studentSubmissionFolder(input.githubLogin, input.userId);
  const mission = safeSegment(input.missionSlug, "mision");
  return `resoluciones/${student}/misiones/${mission}/${FILE_NAMES[input.language]}`;
}
