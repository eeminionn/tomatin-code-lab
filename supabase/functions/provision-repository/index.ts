import { createClient } from "@supabase/supabase-js";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { provisionStudentRepository } from "../_shared/github-submissions.ts";

function bearerToken(request: Request): string | null {
  const value = request.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice("Bearer ".length);
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
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    return jsonResponse(request, { error: "Sesión inválida." }, 401);
  }

  try {
    const result = await provisionStudentRepository(admin, data.user.id);
    return jsonResponse(request, result);
  } catch (provisionError) {
    return jsonResponse(
      request,
      {
        error:
          provisionError instanceof Error
            ? provisionError.message
            : "No se pudo preparar el repositorio.",
      },
      502,
    );
  }
});
