import type { Draft, Language } from "@/types";
import { supabase } from "./supabase";

const DATABASE_NAME = "tomatin-code-lab-v2";
const STORE_NAME = "drafts";
const DATABASE_VERSION = 1;

export interface DraftSaveResult {
  localSaved: true;
  remote: "synced" | "local_only" | "error";
  message?: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createDraftKey(
  userId: string,
  missionId: string,
  missionVersion: number,
  language: Language,
  assignmentId?: string,
) {
  return [
    userId,
    assignmentId ?? "practice",
    missionId,
    `v${missionVersion}`,
    language,
  ].join(":");
}

export async function loadDraft(
  key: string,
  remoteQuery?: Pick<
    Draft,
    "userId" | "missionId" | "missionVersion" | "assignmentId" | "language"
  >,
): Promise<Draft | undefined> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const localValue = await requestResult(
    transaction.objectStore(STORE_NAME).get(key) as IDBRequest<Draft | undefined>,
  );
  database.close();

  if (!supabase || !remoteQuery) return localValue;
  let query = supabase
    .from("drafts")
    .select(
      "user_id, mission_id, mission_version, assignment_id, language, code, updated_at",
    )
    .eq("user_id", remoteQuery.userId)
    .eq("mission_id", remoteQuery.missionId)
    .eq("mission_version", remoteQuery.missionVersion)
    .eq("language", remoteQuery.language);
  query = remoteQuery.assignmentId
    ? query.eq("assignment_id", remoteQuery.assignmentId)
    : query.is("assignment_id", null);
  const { data } = await query.maybeSingle();
  if (!data) return localValue;

  const remoteValue: Draft = {
    key,
    userId: data.user_id,
    missionId: data.mission_id,
    missionVersion: data.mission_version,
    assignmentId: data.assignment_id ?? undefined,
    language: data.language,
    code: data.code,
    updatedAt: data.updated_at,
    syncedAt: data.updated_at,
  };
  const latest =
    !localValue ||
    new Date(remoteValue.updatedAt).getTime() >
      new Date(localValue.updatedAt).getTime()
      ? remoteValue
      : localValue;
  if (latest === remoteValue) await saveLocalDraft(remoteValue);
  return latest;
}

async function saveLocalDraft(draft: Draft): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  await requestResult(transaction.objectStore(STORE_NAME).put(draft));
  database.close();
}

export async function saveDraft(draft: Draft): Promise<DraftSaveResult> {
  await saveLocalDraft(draft);
  if (!supabase) return { localSaved: true, remote: "local_only" };
  const { error } = await supabase.from("drafts").upsert(
    {
      user_id: draft.userId,
      assignment_id: draft.assignmentId ?? null,
      mission_id: draft.missionId,
      mission_version: draft.missionVersion,
      language: draft.language,
      code: draft.code,
      updated_at: draft.updatedAt,
    },
    {
      onConflict:
        "user_id,assignment_id,mission_id,mission_version,language",
    },
  );
  if (error) {
    return {
      localSaved: true,
      remote: "error",
      message: "No se pudo sincronizar; el borrador sigue guardado localmente.",
    };
  }
  return { localSaved: true, remote: "synced" };
}

export async function removeDraft(key: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  await requestResult(transaction.objectStore(STORE_NAME).delete(key));
  database.close();
}
