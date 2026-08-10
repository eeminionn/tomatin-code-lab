const PRODUCTION_ORIGIN = "https://eeminionn.github.io";

function configuredOrigins(): string[] {
  const configured = Deno.env.get("ALLOWED_ORIGINS") ?? PRODUCTION_ORIGIN;
  return configured
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function allowedOrigin(request: Request): string {
  const origin = request.headers.get("origin") ?? "";
  const productionOrigins = configuredOrigins();
  if (
    productionOrigins.includes(origin) ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:")
  ) {
    return origin;
  }
  return productionOrigins[0] ?? PRODUCTION_ORIGIN;
}

export function corsHeaders(request: Request): HeadersInit {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(request),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function jsonResponse(
  request: Request,
  payload: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
