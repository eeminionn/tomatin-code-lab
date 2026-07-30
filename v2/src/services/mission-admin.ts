import { supabase } from "./supabase";
import type { Language, MissionExample, MissionTest } from "@/types";

export interface MissionAdminVariant {
  id: string;
  language: Language;
  starterCode: string;
  expectedSignature: string;
  examples: MissionExample[];
  referenceSolution: string;
  publicTests: MissionTest[];
  hiddenTests: MissionTest[];
  hiddenTestCount: number;
}

export interface MissionAdminDraft {
  id: string;
  missionId: string;
  version: number;
  status: "draft";
  content: Record<string, unknown> & {
    title?: string;
    summary?: string;
    brief?: string;
    context?: string;
    goal?: string;
    conceptIntro?: string;
    steps?: string[];
    constraints?: string[];
    successCriteria?: string[];
    prerequisites?: string[];
    hints?: string[];
    course?: "programming-1" | "programming-2";
  };
  createdAt: string;
  variants: MissionAdminVariant[];
}

export interface MissionSolution {
  missionId: string;
  missionVersion: number;
  language: Language;
  expectedSignature: string;
  referenceSolution: string;
  explanation: string;
}

type MissionAdminRequest =
  | { action: "list" }
  | {
      action: "get-solution";
      missionId: string;
      missionVersion: number;
      language: Language;
    }
  | {
      action: "create";
      sourceMissionId: string;
      content: Record<string, unknown>;
    }
  | { action: "duplicate"; missionId: string }
  | {
      action: "update-content";
      versionId: string;
      content: Record<string, unknown>;
    }
  | {
      action: "update-variant";
      versionId: string;
      language: Language;
      starterCode: string;
      expectedSignature: string;
      examples: MissionExample[];
      referenceSolution: string;
      publicTests: MissionTest[];
      hiddenTests: MissionTest[];
    }
  | { action: "publish" | "archive"; versionId: string };

interface MissionAdminResponse {
  drafts?: MissionAdminDraft[];
  solution?: MissionSolution;
  published?: boolean;
  error?: string;
}

export async function runMissionAdmin(
  body: MissionAdminRequest,
): Promise<MissionAdminResponse> {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { data, error } = await supabase.functions.invoke<MissionAdminResponse>(
    "mission-admin",
    { body },
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error("El editor de misiones no respondió.");
  if (data.error) throw new Error(data.error);
  return data;
}
