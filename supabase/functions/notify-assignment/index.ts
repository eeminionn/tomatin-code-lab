import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const DEFAULT_GITHUB_OWNER = "eeminionn";
const DEFAULT_GITHUB_REPOSITORY = "tomatin-code-lab";
const DEFAULT_GITHUB_ISSUE_NUMBER = "59";
const DEFAULT_APP_BASE_URL =
  "https://eeminionn.github.io/tomatin-code-lab/beta/#";

type DeliveryStatus = "pending" | "sent" | "partial" | "failed";

interface AssignmentRow {
  id: string;
  class_id: string;
  mission_id: string;
  title: string;
  instructions: string;
  due_at: string;
  student_ids: string[];
}

function bearerToken(request: Request): string | null {
  const value = request.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice("Bearer ".length);
}

function validGitHubLogin(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(value)
  );
}

function githubFailureMessage(
  status: number,
  responseMessage: unknown,
  target: string,
  usingLegacyToken: boolean,
): string {
  const detail = typeof responseMessage === "string"
    ? ` GitHub indicó: ${responseMessage}.`
    : "";
  const migrationHint = usingLegacyToken
    ? " Configura el secret GITHUB_NOTIFICATION_TOKEN para separar los avisos de las entregas."
    : "";

  if (status === 401) {
    return `El token de notificaciones de GitHub es inválido o expiró.${detail}`;
  }
  if (status === 403) {
    return `El token de notificaciones no tiene permiso Issues: Read and write en ${target}.${detail}${migrationHint}`;
  }
  if (status === 404) {
    return `El token de notificaciones no puede acceder a ${target}; incluye ese repositorio en el token y confirma que el issue exista.${detail}${migrationHint}`;
  }
  if (status === 422) {
    return `GitHub rechazó el comentario en ${target}; comprueba que el issue esté abierto y acepte comentarios.${detail}`;
  }
  return `GitHub respondió HTTP ${status} al publicar en ${target}.${detail}`;
}

function formatDueAt(value: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

function assignmentUrl(slug: string, assignmentId: string): string {
  const base = (Deno.env.get("APP_BASE_URL") ?? DEFAULT_APP_BASE_URL).replace(
    /\/$/,
    "",
  );
  return `${base}/mission/${encodeURIComponent(slug)}?assignment=${
    encodeURIComponent(assignmentId)
  }`;
}

function commentBody(
  assignment: AssignmentRow,
  slug: string,
  logins: string[],
): string {
  const mentions = logins.map((login) => `@${login}`).join(" ");
  const instructions = assignment.instructions.trim();
  return [
    `## Nueva tarea: ${assignment.title}`,
    "",
    mentions,
    "",
    `**Fecha de entrega:** ${formatDueAt(assignment.due_at)}`,
    instructions ? `**Indicaciones:** ${instructions}` : "",
    "",
    `[Abrir la tarea en Tomatin Code Lab](${
      assignmentUrl(slug, assignment.id)
    })`,
    "",
    "Tomatin Code Lab Aula 3.1 beta está en desarrollo.",
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n")
    .trim();
}

async function recordDelivery(
  admin: SupabaseClient<any, any, any>,
  assignment: AssignmentRow,
  status: DeliveryStatus,
  values: {
    mentionedLogins?: string[];
    missingUserIds?: string[];
    commentId?: number;
    commentUrl?: string;
    error?: string;
  },
) {
  await admin
    .from("assignment_github_notifications")
    .update({
      status,
      mentioned_logins: values.mentionedLogins ?? [],
      missing_user_ids: values.missingUserIds ?? [],
      github_comment_id: values.commentId ?? null,
      github_comment_url: values.commentUrl ?? null,
      last_error: values.error?.slice(0, 2000) ?? null,
      sent_at: values.commentId ? new Date().toISOString() : null,
    })
    .eq("assignment_id", assignment.id);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Método no permitido." }, 405);
  }

  const token = bearerToken(request);
  if (!token) {
    return jsonResponse(request, { error: "Sesión requerida." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    return jsonResponse(request, { error: "Backend sin configurar." }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return jsonResponse(request, { error: "Sesión inválida." }, 401);
  }

  let payload: { assignmentId?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(request, { error: "Solicitud JSON inválida." }, 400);
  }
  if (
    typeof payload.assignmentId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(payload.assignmentId)
  ) {
    return jsonResponse(request, { error: "Tarea inválida." }, 400);
  }

  const { data: assignmentData, error: assignmentError } = await admin
    .from("assignments")
    .select(
      "id, class_id, mission_id, title, instructions, due_at, student_ids",
    )
    .eq("id", payload.assignmentId)
    .maybeSingle();
  if (assignmentError || !assignmentData) {
    return jsonResponse(request, { error: "Tarea no encontrada." }, 404);
  }
  const assignment = assignmentData as AssignmentRow;

  const { data: membership } = await admin
    .from("memberships")
    .select("role")
    .eq("class_id", assignment.class_id)
    .eq("user_id", userData.user.id)
    .eq("status", "active")
    .in("role", ["owner", "mentor"])
    .maybeSingle();
  if (!membership) {
    return jsonResponse(
      request,
      { error: "Permiso de mentor requerido." },
      403,
    );
  }

  const { data: claimed, error: claimError } = await admin.rpc(
    "claim_assignment_github_notification",
    { p_assignment_id: assignment.id },
  );
  if (claimError) {
    return jsonResponse(request, { error: claimError.message }, 500);
  }
  if (!claimed) {
    const { data: existing } = await admin
      .from("assignment_github_notifications")
      .select("status, github_comment_url, last_error")
      .eq("assignment_id", assignment.id)
      .maybeSingle();
    return jsonResponse(request, {
      delivery: existing,
      duplicate: true,
    });
  }

  if (assignment.student_ids.length === 0) {
    const message = "La tarea no tiene estudiantes asignados.";
    await recordDelivery(admin, assignment, "failed", { error: message });
    return jsonResponse(request, { error: message }, 422);
  }

  const [{ data: profiles, error: profilesError }, { data: mission }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, github_login")
        .in("id", assignment.student_ids),
      admin
        .from("missions")
        .select("slug")
        .eq("id", assignment.mission_id)
        .maybeSingle(),
    ]);
  if (profilesError || !mission?.slug) {
    const message = profilesError?.message ?? "No se encontró la misión.";
    await recordDelivery(admin, assignment, "failed", { error: message });
    return jsonResponse(request, { error: message }, 500);
  }

  const loginByUserId = new Map(
    (profiles ?? [])
      .filter((profile) => validGitHubLogin(profile.github_login))
      .map((profile) => [profile.id, profile.github_login as string]),
  );
  const mentionedLogins = [
    ...new Set(
      assignment.student_ids.map((id) => loginByUserId.get(id)).filter(
        validGitHubLogin,
      ),
    ),
  ];
  const missingUserIds = assignment.student_ids.filter(
    (id) => !loginByUserId.has(id),
  );
  if (mentionedLogins.length === 0) {
    const message =
      "Ningún estudiante asignado tiene un usuario de GitHub válido.";
    await recordDelivery(admin, assignment, "failed", {
      missingUserIds,
      error: message,
    });
    return jsonResponse(request, { error: message }, 422);
  }

  const notificationToken = Deno.env.get("GITHUB_NOTIFICATION_TOKEN")?.trim();
  const legacyToken = Deno.env.get("GITHUB_REPOSITORY_TOKEN")?.trim();
  const githubToken = notificationToken || legacyToken;
  if (!githubToken) {
    const message =
      "Falta GITHUB_NOTIFICATION_TOKEN en la Edge Function de avisos.";
    await recordDelivery(admin, assignment, "failed", {
      mentionedLogins,
      missingUserIds,
      error: message,
    });
    return jsonResponse(request, { error: message }, 503);
  }

  const owner = Deno.env.get("GITHUB_NOTIFICATION_OWNER") ??
    DEFAULT_GITHUB_OWNER;
  const repository = Deno.env.get("GITHUB_NOTIFICATION_REPOSITORY") ??
    DEFAULT_GITHUB_REPOSITORY;
  const issueNumber = Deno.env.get("GITHUB_NOTIFICATION_ISSUE_NUMBER") ??
    DEFAULT_GITHUB_ISSUE_NUMBER;
  const target = `${owner}/${repository}#${issueNumber}`;
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repository}/issues/${issueNumber}/comments`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "Content-Type": "application/json",
        "User-Agent": "tomatin-code-lab",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        body: commentBody(assignment, mission.slug, mentionedLogins),
      }),
    },
  );
  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = githubFailureMessage(
      response.status,
      responseBody?.message,
      target,
      !notificationToken,
    );
    await recordDelivery(admin, assignment, "failed", {
      mentionedLogins,
      missingUserIds,
      error: message,
    });
    return jsonResponse(request, { error: message }, 502);
  }

  const status: DeliveryStatus = missingUserIds.length > 0 ? "partial" : "sent";
  await recordDelivery(admin, assignment, status, {
    mentionedLogins,
    missingUserIds,
    commentId: Number(responseBody.id),
    commentUrl: String(responseBody.html_url),
  });
  return jsonResponse(request, {
    delivery: {
      status,
      mentionedLogins,
      missingUserIds,
      githubCommentUrl: String(responseBody.html_url),
    },
  });
});
