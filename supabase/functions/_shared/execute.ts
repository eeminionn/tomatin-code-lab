import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "./cors.ts";
import { executeJudge0 } from "./judge0.ts";
import { syncSubmissionToGitHub } from "./github-submissions.ts";
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

const LANGUAGES = new Set<Language>(["javascript", "python", "cpp"]);
const CODE_LIMIT = 65_536;
const INPUT_LIMIT = 16_384;

function bearerToken(request: Request): string | null {
  const value = request.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice("Bearer ".length);
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
      missionVersion = data.mission_version;
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
      const { data: secure, error: secureError } = await admin
        .schema("private")
        .from("mission_variants_secure")
        .select("hidden_tests")
        .eq("variant_id", variant.id)
        .single();
      if (secureError || !secure) {
        return jsonResponse(request, { error: "Tests privados no disponibles." }, 503);
      }
      hiddenTests = secure.hidden_tests as MissionTest[];
    }

    const result = await executeJudge0(
      body.language,
      body.code,
      variant.public_tests,
      hiddenTests,
    );

    const { data: attempt, error: attemptError } = await admin
      .from("attempts")
      .insert({
        class_id: classId,
        user_id: userId,
        mission_id: body.missionId,
        assignment_id: assignment?.id ?? null,
        mission_version: missionVersion,
        language: body.language,
        kind,
        remote: true,
        code: body.code,
        result,
      })
      .select("id, created_at")
      .single();
    if (attemptError || !attempt) {
      return jsonResponse(request, { error: "No se pudo registrar el intento." }, 503);
    }

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
      const progressPatch: Record<string, unknown> = {
        language: body.language,
        last_activity_at: attempt.created_at,
      };
      if (kind === "submit" && passed) {
        progressPatch.status = "awaiting_review";
        progressPatch.submitted_at = attempt.created_at;
      }

      const { data: currentProgress } = await admin
        .from("student_progress")
        .select("status, attempts")
        .eq("user_id", userId)
        .eq("assignment_id", assignment.id)
        .single();
      if (currentProgress) {
        if (
          !progressPatch.status &&
          currentProgress.status === "not_started"
        ) {
          progressPatch.status = "in_progress";
        }
        progressPatch.attempts = currentProgress.attempts + 1;
        await admin
          .from("student_progress")
          .update(progressPatch)
          .eq("user_id", userId)
          .eq("assignment_id", assignment.id);
      }

      if (kind === "submit" && passed) {
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
