import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "./cors.ts";
import { executeJudge0 } from "./judge0.ts";
import { syncSubmissionToGitHub } from "./github-submissions.ts";
import { getSecureVariant } from "./secure-variants.ts";
import type { SecureVariantData } from "./secure-variants.ts";
import type { Language, MissionTest } from "./types.ts";

interface ExecuteBody {
  missionId?: string;
  missionVersion?: number;
  assignmentId?: string;
  language?: Language;
  code?: string;
  input?: string;
}

interface VariantRow {
  id: string;
  public_tests: MissionTest[];
  mission_versions: {
    mission_id: string;
    version: number;
    status: string;
  };
}

interface RecordedAttemptRow {
  attempt_id: string;
  attempt_created_at: string;
}

const LANGUAGES = new Set<Language>(["javascript", "python", "cpp"]);
const CODE_LIMIT = 65_536;
const INPUT_LIMIT = 16_384;

function bearerToken(request: Request): string | null {
  const value = request.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice("Bearer ".length);
}

function submissionLockMessage(status: string | null | undefined) {
  if (status === "awaiting_review") {
    return "Tu entrega ya está esperando revisión del mentor.";
  }
  if (status === "approved") {
    return "Esta tarea ya fue aprobada.";
  }
  return null;
}

export function createExecutionHandler(kind: "run" | "submit") {
  return async (request: Request): Promise<Response> => {
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
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) {
      return jsonResponse(request, { error: "Sesión inválida." }, 401);
    }

    let body: ExecuteBody;
    try {
      body = (await request.json()) as ExecuteBody;
    } catch {
      return jsonResponse(request, { error: "JSON inválido." }, 400);
    }

    if (
      !body.missionId ||
      !body.language ||
      !LANGUAGES.has(body.language) ||
      typeof body.code !== "string"
    ) {
      return jsonResponse(request, { error: "Solicitud incompleta." }, 400);
    }
    if (new TextEncoder().encode(body.code).byteLength > CODE_LIMIT) {
      return jsonResponse(request, { error: "El código supera 64 KB." }, 413);
    }
    if (
      body.input &&
      new TextEncoder().encode(body.input).byteLength > INPUT_LIMIT
    ) {
      return jsonResponse(request, { error: "La entrada supera 16 KB." }, 413);
    }

    const userId = authData.user.id;
    const since = new Date(Date.now() - 3_600_000).toISOString();
    const limit = kind === "submit" ? 10 : 20;
    const { count: recentCount, error: countError } = await admin
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("kind", kind)
      .eq("remote", true)
      .gte("created_at", since);
    if (countError) {
      return jsonResponse(request, { error: "No se pudo comprobar el límite." }, 503);
    }
    if ((recentCount ?? 0) >= limit) {
      return jsonResponse(
        request,
        {
          error: `Límite alcanzado: ${limit} ${
            kind === "submit" ? "entregas" : "ejecuciones remotas"
          } por hora.`,
        },
        429,
      );
    }

    let classId: string | null = null;
    let isAssignedStudent = false;
    let missionVersion = body.missionVersion;
    let assignment:
      | {
          id: string;
          class_id: string;
          mission_id: string;
          mission_version: number;
          allowed_languages: Language[];
          student_ids: string[];
          status: string;
        }
      | null = null;

    if (body.assignmentId) {
      const { data, error } = await admin
        .from("assignments")
        .select(
          "id, class_id, mission_id, mission_version, allowed_languages, student_ids, status",
        )
        .eq("id", body.assignmentId)
        .single();
      if (error || !data) {
        return jsonResponse(request, { error: "Tarea no encontrada." }, 404);
      }

      const { data: membership } = await admin
        .from("memberships")
        .select("role, status")
        .eq("class_id", data.class_id)
        .eq("user_id", userId)
        .maybeSingle();
      const isStaff =
        membership?.status === "active" &&
        (membership.role === "owner" || membership.role === "mentor");
      const isAssigned =
        membership?.status === "active" && data.student_ids.includes(userId);
      isAssignedStudent = Boolean(isAssigned && !isStaff);

      if (!isStaff && !isAssigned) {
        return jsonResponse(request, { error: "No tienes acceso a esta tarea." }, 403);
      }
      if (
        data.status !== "published" ||
        data.mission_id !== body.missionId ||
        !data.allowed_languages.includes(body.language)
      ) {
        return jsonResponse(request, { error: "Tarea o lenguaje no disponible." }, 409);
      }

      assignment = data;
      classId = data.class_id;
      if (isAssignedStudent) {
        const { data: progress, error: progressError } = await admin
          .from("student_progress")
          .select("mission_version, status")
          .eq("user_id", userId)
          .eq("assignment_id", data.id)
          .single();
        if (progressError || !progress) {
          return jsonResponse(
            request,
            { error: "No se encontró la versión asignada al estudiante." },
            409,
          );
        }
        if (kind === "submit") {
          const lockMessage = submissionLockMessage(progress.status);
          if (lockMessage) {
            return jsonResponse(request, { error: lockMessage }, 409);
          }
        }
        missionVersion = progress.mission_version;
      } else {
        missionVersion = data.mission_version;
      }
    } else {
      const [{ data: mission }, { data: membership }] = await Promise.all([
        admin
          .from("missions")
          .select("current_version")
          .eq("id", body.missionId)
          .single(),
        admin
          .from("memberships")
          .select("class_id")
          .eq("user_id", userId)
          .eq("status", "active")
          .limit(1)
          .maybeSingle(),
      ]);
      missionVersion = missionVersion ?? mission?.current_version;
      classId = membership?.class_id ?? null;
    }

    if (!missionVersion) {
      return jsonResponse(request, { error: "Versión de misión no encontrada." }, 404);
    }

    const { data: variantData, error: variantError } = await admin
      .from("mission_variants")
      .select(
        "id, public_tests, mission_versions!inner(mission_id, version, status)",
      )
      .eq("language", body.language)
      .eq("mission_versions.mission_id", body.missionId)
      .eq("mission_versions.version", missionVersion)
      .single();
    if (variantError || !variantData) {
      return jsonResponse(request, { error: "Variante no encontrada." }, 404);
    }

    const variant = variantData as unknown as VariantRow;
    let hiddenTests: MissionTest[] = [];
    if (kind === "submit") {
      let secure: SecureVariantData | null = null;
      try {
        secure = await getSecureVariant(admin, variant.id);
      } catch {
        // The secure helper logs the database error without exposing it to students.
      }
      if (!secure) {
        return jsonResponse(request, { error: "Tests privados no disponibles." }, 503);
      }
      hiddenTests = secure.hiddenTests;
    }

    const result = await executeJudge0(
      body.language,
      body.code,
      variant.public_tests,
      hiddenTests,
    );

    const { data: attemptRows, error: attemptError } = await admin.rpc(
      "record_remote_attempt",
      {
        p_user_id: userId,
        p_class_id: classId,
        p_assignment_id: assignment?.id ?? null,
        p_mission_id: body.missionId,
        p_mission_version: missionVersion,
        p_language: body.language,
        p_kind: kind,
        p_code: body.code,
        p_result: result,
      },
    );
    if (attemptError) {
      const lockMessage = ["awaiting_review", "approved"]
        .map(submissionLockMessage)
        .find((message) => message && attemptError.message.includes(message));
      if (lockMessage) {
        return jsonResponse(request, { error: lockMessage }, 409);
      }
      console.error("record_remote_attempt failed", attemptError);
      return jsonResponse(request, { error: "No se pudo registrar el intento." }, 503);
    }
    const attemptRow = (attemptRows as RecordedAttemptRow[] | null)?.[0];
    if (!attemptRow) {
      return jsonResponse(request, { error: "No se pudo registrar el intento." }, 503);
    }
    const attempt = {
      id: attemptRow.attempt_id,
      created_at: attemptRow.attempt_created_at,
    };

    const repositorySync =
      kind === "submit"
        ? await syncSubmissionToGitHub({
            admin,
            attemptId: attempt.id,
            classId,
            userId,
            missionId: body.missionId,
            assignmentId: assignment?.id ?? null,
            language: body.language,
            code: body.code,
          })
        : undefined;
    const persistedResult = {
      ...result,
      ...(repositorySync ? { repositorySync } : {}),
      id: attempt.id,
      createdAt: attempt.created_at,
    };
    if (repositorySync) {
      await admin
        .from("attempts")
        .update({ result: persistedResult })
        .eq("id", attempt.id);
    }

    if (assignment) {
      const passed = result.status === "passed";
      if (kind === "submit" && passed && isAssignedStudent) {
        const { data: student } = await admin
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .single();
        const { data: staff } = await admin
          .from("memberships")
          .select("user_id")
          .eq("class_id", assignment.class_id)
          .eq("status", "active")
          .in("role", ["owner", "mentor"]);
        if (staff?.length) {
          await admin.from("notifications").insert(
            staff.map((member) => ({
              user_id: member.user_id,
              class_id: assignment.class_id,
              assignment_id: assignment.id,
              attempt_id: attempt.id,
              title: "Nueva entrega",
              body: `${student?.display_name ?? "Un estudiante"} envió una tarea para revisión.`,
            })),
          );
        }
      }
    }

    return jsonResponse(request, persistedResult);
  };
}
