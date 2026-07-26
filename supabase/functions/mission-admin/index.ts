import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { executeJudge0 } from "../_shared/judge0.ts";
import type { Language, MissionTest } from "../_shared/types.ts";

type AdminAction =
  | "list"
  | "create"
  | "duplicate"
  | "update-content"
  | "update-variant"
  | "publish"
  | "archive";

interface AdminBody {
  action?: AdminAction;
  missionId?: string;
  sourceMissionId?: string;
  versionId?: string;
  language?: Language;
  content?: Record<string, unknown>;
  starterCode?: string;
  referenceSolution?: string;
  publicTests?: MissionTest[];
  hiddenTests?: MissionTest[];
}

const LANGUAGES = new Set(["javascript", "python", "cpp"]);

function tokenFrom(request: Request): string | null {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Método no permitido." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = tokenFrom(request);
  if (!supabaseUrl || !serviceRole || !token) {
    return jsonResponse(request, { error: "Sesión requerida." }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData } = await admin.auth.getUser(token);
  const userId = authData.user?.id;
  if (!userId) return jsonResponse(request, { error: "Sesión inválida." }, 401);

  const { data: staff } = await admin
    .from("memberships")
    .select("class_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role", ["owner", "mentor"])
    .limit(1)
    .maybeSingle();
  if (!staff) {
    return jsonResponse(request, { error: "Rol de mentor requerido." }, 403);
  }

  let body: AdminBody;
  try {
    body = (await request.json()) as AdminBody;
  } catch {
    return jsonResponse(request, { error: "JSON inválido." }, 400);
  }
  if (!body.action) {
    return jsonResponse(request, { error: "Acción requerida." }, 400);
  }

  async function loadDrafts() {
    const { data, error } = await admin
      .from("mission_versions")
      .select(`
        id,
        mission_id,
        version,
        status,
        content,
        created_at,
        mission_variants(
          id,
          language,
          starter_code,
          public_tests,
          hidden_test_count
        )
      `)
      .eq("status", "draft")
      .order("created_at", { ascending: false });
    if (error) throw error;

    return await Promise.all(
      (data ?? []).map(async (version) => {
        const variants = await Promise.all(
          (version.mission_variants ?? []).map(async (variant) => {
            const { data: secure } = await admin
              .schema("private")
              .from("mission_variants_secure")
              .select("reference_solution, hidden_tests")
              .eq("variant_id", variant.id)
              .single();
            return {
              id: variant.id,
              language: variant.language,
              starterCode: variant.starter_code,
              publicTests: variant.public_tests,
              hiddenTestCount: variant.hidden_test_count,
              referenceSolution: secure?.reference_solution ?? "",
              hiddenTests: secure?.hidden_tests ?? [],
            };
          }),
        );
        return {
          id: version.id,
          missionId: version.mission_id,
          version: version.version,
          status: version.status,
          content: version.content,
          createdAt: version.created_at,
          variants,
        };
      }),
    );
  }

  async function sourceVersion(missionId: string) {
    const { data: mission, error: missionError } = await admin
      .from("missions")
      .select("id, current_version")
      .eq("id", missionId)
      .single();
    if (missionError || !mission) throw new Error("Misión de origen no encontrada.");
    const { data: version, error: versionError } = await admin
      .from("mission_versions")
      .select("id, mission_id, version, content")
      .eq("mission_id", missionId)
      .eq("version", mission.current_version)
      .single();
    if (versionError || !version) throw new Error("Versión de origen no encontrada.");
    const { data: variants, error: variantsError } = await admin
      .from("mission_variants")
      .select("id, language, starter_code, public_tests, hidden_test_count")
      .eq("mission_version_id", version.id);
    if (variantsError || variants?.length !== 3) {
      throw new Error("La misión de origen no tiene tres variantes.");
    }
    const completeVariants = await Promise.all(
      variants.map(async (variant) => {
        const { data: secure, error } = await admin
          .schema("private")
          .from("mission_variants_secure")
          .select("reference_solution, hidden_tests")
          .eq("variant_id", variant.id)
          .single();
        if (error || !secure) throw new Error("Datos privados incompletos.");
        return { ...variant, secure };
      }),
    );
    return { mission, version, variants: completeVariants };
  }

  async function copyVariants(
    source: Awaited<ReturnType<typeof sourceVersion>>,
    targetVersionId: string,
  ) {
    for (const variant of source.variants) {
      const { data: inserted, error } = await admin
        .from("mission_variants")
        .insert({
          mission_version_id: targetVersionId,
          language: variant.language,
          starter_code: variant.starter_code,
          public_tests: variant.public_tests,
          hidden_test_count: variant.hidden_test_count,
        })
        .select("id")
        .single();
      if (error || !inserted) throw error ?? new Error("No se pudo copiar la variante.");
      const { error: secureError } = await admin
        .schema("private")
        .from("mission_variants_secure")
        .insert({
          variant_id: inserted.id,
          reference_solution: variant.secure.reference_solution,
          hidden_tests: variant.secure.hidden_tests,
        });
      if (secureError) throw secureError;
    }
  }

  try {
    if (body.action === "list") {
      return jsonResponse(request, { drafts: await loadDrafts() });
    }

    if (body.action === "create") {
      if (!body.sourceMissionId || !body.content?.title) {
        return jsonResponse(request, { error: "Plantilla y contenido requeridos." }, 400);
      }
      const source = await sourceVersion(body.sourceMissionId);
      const missionId = `custom-${crypto.randomUUID()}`;
      const title = String(body.content.title);
      const slug = `${slugify(title) || "mision"}-${missionId.slice(-6)}`;
      const content = {
        ...source.version.content,
        ...body.content,
        id: missionId,
        slug,
        title,
        version: 1,
      };
      const course = String(content.course ?? "programming-1");
      const { error: missionError } = await admin.from("missions").insert({
        id: missionId,
        slug,
        course,
        title,
        current_version: 1,
        created_by: userId,
      });
      if (missionError) throw missionError;
      const { data: version, error: versionError } = await admin
        .from("mission_versions")
        .insert({
          mission_id: missionId,
          version: 1,
          status: "draft",
          content,
          created_by: userId,
        })
        .select("id")
        .single();
      if (versionError || !version) throw versionError;
      await copyVariants(source, version.id);
      return jsonResponse(request, { drafts: await loadDrafts() }, 201);
    }

    if (body.action === "duplicate") {
      if (!body.missionId) {
        return jsonResponse(request, { error: "Misión requerida." }, 400);
      }
      const source = await sourceVersion(body.missionId);
      const { data: latest } = await admin
        .from("mission_versions")
        .select("version")
        .eq("mission_id", body.missionId)
        .order("version", { ascending: false })
        .limit(1)
        .single();
      const nextVersion = (latest?.version ?? source.version.version) + 1;
      const content = { ...source.version.content, version: nextVersion };
      const { data: version, error } = await admin
        .from("mission_versions")
        .insert({
          mission_id: body.missionId,
          version: nextVersion,
          status: "draft",
          content,
          created_by: userId,
        })
        .select("id")
        .single();
      if (error || !version) throw error;
      await copyVariants(source, version.id);
      return jsonResponse(request, { drafts: await loadDrafts() }, 201);
    }

    if (!body.versionId) {
      return jsonResponse(request, { error: "Versión requerida." }, 400);
    }
    const { data: target, error: targetError } = await admin
      .from("mission_versions")
      .select("id, mission_id, version, status, content")
      .eq("id", body.versionId)
      .single();
    if (targetError || !target || target.status !== "draft") {
      return jsonResponse(request, { error: "Borrador no encontrado." }, 404);
    }

    if (body.action === "update-content") {
      const nextContent = { ...target.content, ...body.content };
      const { error } = await admin
        .from("mission_versions")
        .update({ content: nextContent })
        .eq("id", target.id);
      if (error) throw error;
      return jsonResponse(request, { drafts: await loadDrafts() });
    }

    if (body.action === "update-variant") {
      if (
        !body.language ||
        !LANGUAGES.has(body.language) ||
        typeof body.starterCode !== "string" ||
        typeof body.referenceSolution !== "string" ||
        !Array.isArray(body.publicTests) ||
        !Array.isArray(body.hiddenTests)
      ) {
        return jsonResponse(request, { error: "Variante incompleta." }, 400);
      }
      if (
        new TextEncoder().encode(body.starterCode).byteLength > 65_536 ||
        new TextEncoder().encode(body.referenceSolution).byteLength > 65_536
      ) {
        return jsonResponse(request, { error: "El código supera 64 KB." }, 413);
      }
      const { data: variant, error } = await admin
        .from("mission_variants")
        .upsert(
          {
            mission_version_id: target.id,
            language: body.language,
            starter_code: body.starterCode,
            public_tests: body.publicTests,
            hidden_test_count: body.hiddenTests.length,
          },
          { onConflict: "mission_version_id,language" },
        )
        .select("id")
        .single();
      if (error || !variant) throw error;
      const { error: secureError } = await admin
        .schema("private")
        .from("mission_variants_secure")
        .upsert({
          variant_id: variant.id,
          reference_solution: body.referenceSolution,
          hidden_tests: body.hiddenTests,
          updated_at: new Date().toISOString(),
        });
      if (secureError) throw secureError;
      return jsonResponse(request, { drafts: await loadDrafts() });
    }

    if (body.action === "archive") {
      const { error } = await admin
        .from("mission_versions")
        .update({ status: "archived" })
        .eq("id", target.id);
      if (error) throw error;
      return jsonResponse(request, { drafts: await loadDrafts() });
    }

    if (body.action === "publish") {
      const drafts = await loadDrafts();
      const draft = drafts.find((entry) => entry.id === target.id);
      if (!draft || draft.variants.length !== 3) {
        return jsonResponse(request, { error: "Faltan variantes." }, 409);
      }
      const validations = await Promise.all(
        draft.variants.map(async (variant) => ({
          language: variant.language,
          result: await executeJudge0(
            variant.language as Language,
            variant.referenceSolution,
            variant.publicTests as MissionTest[],
            variant.hiddenTests as MissionTest[],
          ),
        })),
      );
      const failed = validations.filter(
        (entry) => entry.result.status !== "passed",
      );
      if (failed.length) {
        return jsonResponse(
          request,
          {
            error: "La solución de referencia no pasa todos los tests.",
            validations,
          },
          422,
        );
      }
      const { error } = await admin.rpc("publish_mission_version", {
        p_version_id: target.id,
      });
      if (error) throw error;
      return jsonResponse(request, { published: true, validations });
    }

    return jsonResponse(request, { error: "Acción no soportada." }, 400);
  } catch (error) {
    return jsonResponse(
      request,
      { error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});
