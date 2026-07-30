import type { SupabaseClient } from "@supabase/supabase-js";
import type { Language } from "./types.ts";
import {
  studentSubmissionFolder,
  submissionFilePath,
} from "./github-paths.ts";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";
const DEFAULT_OWNER = "eeminionn";
const DEFAULT_REPOSITORY_NAME = "tomatin-code-lab-resoluciones";
const REPOSITORY_DESCRIPTION =
  "Entregas privadas de estudiantes de Tomatin Code Lab, administradas por el backend del aula.";

interface ProfileRow {
  id: string;
  display_name: string;
  github_login: string | null;
  github_id: number | null;
  role: "owner" | "mentor" | "student";
}

interface RepositoryRow {
  id: string;
  class_id: string;
  user_id: string;
  owner_login: string;
  repository_name: string;
  html_url: string;
  visibility: "private";
  status: "ready" | "error";
  collaborator_status:
    | "pending"
    | "invited"
    | "active"
    | "not_required"
    | "error";
  storage_mode: "legacy_per_student" | "central";
  student_path: string | null;
  last_synced_at: string | null;
  last_error: string | null;
}

interface GitHubUser {
  login: string;
}

interface GitHubRepository {
  name: string;
  html_url: string;
  private: boolean;
  description: string | null;
  default_branch: string;
}

interface GitHubContent {
  sha: string;
}

interface GitHubContentCommit {
  commit: {
    sha: string;
    html_url: string | null;
  };
}

interface GitHubAuthor {
  name: string;
  email: string;
}

export interface RepositorySyncResult {
  status: "synced" | "pending_setup" | "failed" | "not_applicable";
  message: string;
  repositoryUrl?: string;
  fileUrl?: string;
  path?: string;
  commitSha?: string;
}

export interface ProvisionRepositoryResult {
  status: "ready" | "pending_setup" | "not_applicable";
  message: string;
  repository?: ReturnType<typeof toFrontendRepository>;
}

interface SyncSubmissionInput {
  admin: SupabaseClient;
  attemptId: string;
  classId: string | null;
  userId: string;
  missionId: string;
  assignmentId: string | null;
  language: Language;
  code: string;
}

class GitHubApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function githubConfiguration() {
  return {
    token: Deno.env.get("GITHUB_REPOSITORY_TOKEN")?.trim() ?? "",
    owner:
      Deno.env.get("GITHUB_REPOSITORY_OWNER")?.trim() || DEFAULT_OWNER,
    repositoryName:
      Deno.env.get("GITHUB_REPOSITORY_NAME")?.trim() ||
      DEFAULT_REPOSITORY_NAME,
  };
}

async function githubFetch(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      "User-Agent": "tomatin-code-lab",
      ...init.headers,
    },
  });
  if (response.ok) return response;

  let detail = response.statusText;
  try {
    const payload = (await response.json()) as { message?: string };
    detail = payload.message ?? detail;
  } catch {
    // GitHub occasionally returns an empty body for gateway errors.
  }
  throw new GitHubApiError(response.status, `GitHub ${response.status}: ${detail}`);
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").slice(0, 1000);
}

function encodeGitHubPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function toFrontendRepository(repository: RepositoryRow) {
  return {
    id: repository.id,
    classId: repository.class_id,
    userId: repository.user_id,
    ownerLogin: repository.owner_login,
    name: repository.repository_name,
    htmlUrl: repository.html_url,
    visibility: repository.visibility,
    status: repository.status,
    collaboratorStatus: repository.collaborator_status,
    storageMode: repository.storage_mode,
    studentPath: repository.student_path ?? undefined,
    lastSyncedAt: repository.last_synced_at ?? undefined,
    lastError: repository.last_error ?? undefined,
  };
}

async function activeStudentContext(
  admin: SupabaseClient,
  userId: string,
  requestedClassId?: string | null,
): Promise<{ profile: ProfileRow; classId: string } | null> {
  const [{ data: profile, error: profileError }, { data: membership }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, display_name, github_login, github_id, role")
        .eq("id", userId)
        .single(),
      admin
        .from("memberships")
        .select("class_id, role, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .eq("role", "student")
        .order("joined_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

  if (profileError || !profile || profile.role !== "student" || !membership) {
    return null;
  }
  if (requestedClassId && membership.class_id !== requestedClassId) {
    return null;
  }
  return {
    profile: profile as ProfileRow,
    classId: membership.class_id,
  };
}

async function storedRepository(
  admin: SupabaseClient,
  classId: string,
  userId: string,
): Promise<RepositoryRow | null> {
  const { data, error } = await admin
    .from("student_repositories")
    .select("*")
    .eq("class_id", classId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as RepositoryRow | null;
}

async function findGitHubRepository(
  token: string,
  owner: string,
  name: string,
): Promise<GitHubRepository | null> {
  try {
    const response = await githubFetch(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    );
    return (await response.json()) as GitHubRepository;
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) return null;
    throw error;
  }
}

async function upsertGitHubContent(input: {
  token: string;
  owner: string;
  repository: string;
  path: string;
  branch: string;
  message: string;
  content: string;
  author?: GitHubAuthor;
}): Promise<GitHubContentCommit> {
  const encodedOwner = encodeURIComponent(input.owner);
  const encodedRepository = encodeURIComponent(input.repository);
  const encodedPath = encodeGitHubPath(input.path);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let currentFile: GitHubContent | null = null;
    try {
      const contentResponse = await githubFetch(
        input.token,
        `/repos/${encodedOwner}/${encodedRepository}/contents/${encodedPath}?ref=${encodeURIComponent(input.branch)}`,
      );
      currentFile = (await contentResponse.json()) as GitHubContent;
    } catch (error) {
      if (!(error instanceof GitHubApiError) || error.status !== 404) {
        throw error;
      }
    }

    try {
      const response = await githubFetch(
        input.token,
        `/repos/${encodedOwner}/${encodedRepository}/contents/${encodedPath}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: input.message,
            content: encodeBase64(input.content),
            branch: input.branch,
            ...(currentFile?.sha ? { sha: currentFile.sha } : {}),
            ...(input.author ? { author: input.author } : {}),
          }),
        },
      );
      return (await response.json()) as GitHubContentCommit;
    } catch (error) {
      if (
        !(error instanceof GitHubApiError) ||
        error.status !== 409 ||
        attempt === 2
      ) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** attempt));
    }
  }

  throw new Error("No se pudo actualizar la entrega después de reintentar.");
}

async function upsertRepository(
  admin: SupabaseClient,
  row: Omit<RepositoryRow, "id">,
): Promise<RepositoryRow> {
  const { data, error } = await admin
    .from("student_repositories")
    .upsert(row, { onConflict: "class_id,user_id" })
    .select("*")
    .single();
  if (error || !data) {
    throw error ?? new Error("No se pudo registrar el repositorio.");
  }
  return data as RepositoryRow;
}

export async function provisionStudentRepository(
  admin: SupabaseClient,
  userId: string,
  requestedClassId?: string | null,
): Promise<ProvisionRepositoryResult> {
  const context = await activeStudentContext(admin, userId, requestedClassId);
  if (!context) {
    return {
      status: "not_applicable",
      message: "No corresponde crear un repositorio para esta cuenta.",
    };
  }

  const { profile, classId } = context;
  const current = await storedRepository(admin, classId, userId);
  const config = githubConfiguration();
  const studentPath = studentSubmissionFolder(
    profile.github_login ?? "estudiante",
    userId,
  );
  if (
    current?.status === "ready" &&
    current.storage_mode === "central" &&
    current.owner_login.toLowerCase() === config.owner.toLowerCase() &&
    current.repository_name === config.repositoryName &&
    current.student_path === studentPath
  ) {
    return {
      status: "ready",
      message: "Carpeta privada de entregas lista.",
      repository: toFrontendRepository(current),
    };
  }

  if (!config.token) {
    return {
      status: "pending_setup",
      message: "La conexión privada de GitHub aún no está activa.",
    };
  }
  if (!profile.github_login) {
    throw new Error("La cuenta no tiene un usuario de GitHub verificable.");
  }

  const authenticatedResponse = await githubFetch(config.token, "/user");
  const authenticated = (await authenticatedResponse.json()) as GitHubUser;
  if (authenticated.login.toLowerCase() !== config.owner.toLowerCase()) {
    throw new Error(
      `El token pertenece a @${authenticated.login}, no a @${config.owner}.`,
    );
  }

  const name = config.repositoryName;
  let githubRepository = await findGitHubRepository(
    config.token,
    config.owner,
    name,
  );

  if (!githubRepository) {
    try {
      const createResponse = await githubFetch(config.token, "/user/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: REPOSITORY_DESCRIPTION,
          private: true,
          auto_init: true,
          has_issues: false,
          has_projects: false,
          has_wiki: false,
          has_discussions: false,
        }),
      });
      githubRepository = (await createResponse.json()) as GitHubRepository;
    } catch (error) {
      if (!(error instanceof GitHubApiError) || error.status !== 422) {
        throw error;
      }
      githubRepository = await findGitHubRepository(
        config.token,
        config.owner,
        name,
      );
      if (!githubRepository) throw error;
    }
  }

  if (!githubRepository.private) {
    throw new Error(
      `El repositorio ${config.owner}/${name} debe ser privado.`,
    );
  }

  if (githubRepository.description !== REPOSITORY_DESCRIPTION) {
    const updateResponse = await githubFetch(
      config.token,
      `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(name)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: REPOSITORY_DESCRIPTION,
          has_issues: false,
          has_projects: false,
          has_wiki: false,
          has_discussions: false,
        }),
      },
    );
    githubRepository = (await updateResponse.json()) as GitHubRepository;
  }

  const saved = await upsertRepository(admin, {
    class_id: classId,
    user_id: userId,
    owner_login: config.owner,
    repository_name: githubRepository.name,
    html_url: githubRepository.html_url,
    visibility: "private",
    status: "ready",
    collaborator_status: "not_required",
    storage_mode: "central",
    student_path: studentPath,
    last_synced_at: current?.last_synced_at ?? null,
    last_error: null,
  });

  return {
    status: "ready",
    message: "Carpeta privada de entregas lista.",
    repository: toFrontendRepository(saved),
  };
}

async function recordSync(
  admin: SupabaseClient,
  input: SyncSubmissionInput,
  values: {
    repositoryId?: string | null;
    filePath?: string | null;
    status: "pending_setup" | "synced" | "failed" | "skipped";
    commitSha?: string | null;
    commitUrl?: string | null;
    errorMessage?: string | null;
  },
) {
  if (!input.classId) return;
  await admin.from("submission_repository_syncs").upsert(
    {
      attempt_id: input.attemptId,
      repository_id: values.repositoryId ?? null,
      class_id: input.classId,
      user_id: input.userId,
      mission_id: input.missionId,
      assignment_id: input.assignmentId,
      language: input.language,
      file_path: values.filePath ?? null,
      status: values.status,
      commit_sha: values.commitSha ?? null,
      commit_url: values.commitUrl ?? null,
      error_message: values.errorMessage ?? null,
    },
    { onConflict: "attempt_id" },
  );
}

export async function syncSubmissionToGitHub(
  input: SyncSubmissionInput,
): Promise<RepositorySyncResult> {
  const context = await activeStudentContext(
    input.admin,
    input.userId,
    input.classId,
  );
  if (!context) {
    return {
      status: "not_applicable",
      message: "La sincronización aplica solo a estudiantes inscritos.",
    };
  }
  input.classId = context.classId;

  const { data: mission, error: missionError } = await input.admin
    .from("missions")
    .select("slug, title")
    .eq("id", input.missionId)
    .single();
  if (missionError || !mission) {
    return {
      status: "failed",
      message: "La entrega quedó guardada, pero la misión no pudo sincronizarse.",
    };
  }

  const filePath = submissionFilePath({
    githubLogin: context.profile.github_login ?? "estudiante",
    userId: input.userId,
    missionSlug: mission.slug,
    language: input.language,
  });
  let repository: RepositoryRow | null = null;

  try {
    const provisioned = await provisionStudentRepository(
      input.admin,
      input.userId,
      context.classId,
    );
    if (provisioned.status === "pending_setup") {
      await recordSync(input.admin, input, {
        filePath,
        status: "pending_setup",
      });
      return {
        status: "pending_setup",
        message:
          "La entrega quedó guardada en el aula; la carpeta se sincronizará cuando la conexión privada esté disponible.",
        path: filePath,
      };
    }
    if (!provisioned.repository) {
      return {
        status: "not_applicable",
        message: provisioned.message,
      };
    }

    repository = await storedRepository(
      input.admin,
      context.classId,
      input.userId,
    );
    if (!repository) throw new Error("El repositorio no quedó registrado.");

    const config = githubConfiguration();
    const encodedOwner = encodeURIComponent(repository.owner_login);
    const encodedName = encodeURIComponent(repository.repository_name);
    const repositoryResponse = await githubFetch(
      config.token,
      `/repos/${encodedOwner}/${encodedName}`,
    );
    const githubRepository =
      (await repositoryResponse.json()) as GitHubRepository;

    const author =
      context.profile.github_id && context.profile.github_login
        ? {
            name: context.profile.display_name.slice(0, 100),
            email: `${context.profile.github_id}+${context.profile.github_login}@users.noreply.github.com`,
          }
        : undefined;
    const committed = await upsertGitHubContent({
      token: config.token,
      owner: repository.owner_login,
      repository: repository.repository_name,
      path: filePath,
      branch: githubRepository.default_branch,
      message: `Entrega: ${mission.title} (${input.language})`,
      content: input.code,
      author,
    });
    const syncedAt = new Date().toISOString();
    const commitUrl = committed.commit.html_url ?? undefined;

    await input.admin
      .from("student_repositories")
      .update({
        status: "ready",
        last_synced_at: syncedAt,
        last_error: null,
      })
      .eq("id", repository.id);
    await recordSync(input.admin, input, {
      repositoryId: repository.id,
      filePath,
      status: "synced",
      commitSha: committed.commit.sha,
      commitUrl,
    });

    return {
      status: "synced",
      message: `${filePath} quedó actualizado.`,
      path: filePath,
      commitSha: committed.commit.sha,
    };
  } catch (error) {
    const detail = safeError(error);
    if (repository) {
      await input.admin
        .from("student_repositories")
        .update({ status: "error", last_error: detail })
        .eq("id", repository.id);
    }
    await recordSync(input.admin, input, {
      repositoryId: repository?.id,
      filePath,
      status: "failed",
      errorMessage: detail,
    });
    return {
      status: "failed",
      message:
        "La entrega quedó guardada en el aula, pero GitHub rechazó la sincronización.",
      path: filePath,
    };
  }
}
