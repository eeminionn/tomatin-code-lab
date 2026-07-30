import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { MissionTest } from "./types.ts";

export interface SecureVariantData {
  referenceSolution: string;
  hiddenTests: MissionTest[];
}

interface SecureVariantRpcRow {
  reference_solution: string;
  hidden_tests: MissionTest[];
}

export async function getSecureVariant(
  admin: SupabaseClient,
  variantId: string,
): Promise<SecureVariantData | null> {
  const { data, error } = await admin.rpc("get_mission_variant_secure", {
    p_variant_id: variantId,
  });
  if (error) {
    console.error("Secure variant read failed.", {
      variantId,
      code: error.code,
      message: error.message,
    });
    throw new Error("No se pudieron leer los datos privados de la misión.");
  }

  const rows =
    (Array.isArray(data) ? data : data ? [data] : []) as SecureVariantRpcRow[];
  const secure = rows[0];
  return secure
    ? {
      referenceSolution: secure.reference_solution,
      hiddenTests: secure.hidden_tests,
    }
    : null;
}

export async function upsertSecureVariant(
  admin: SupabaseClient,
  variantId: string,
  referenceSolution: string,
  hiddenTests: MissionTest[],
): Promise<void> {
  const { error } = await admin.rpc("upsert_mission_variant_secure", {
    p_variant_id: variantId,
    p_reference_solution: referenceSolution,
    p_hidden_tests: hiddenTests,
  });
  if (error) {
    console.error("Secure variant write failed.", {
      variantId,
      code: error.code,
      message: error.message,
    });
    throw new Error("No se pudieron guardar los datos privados de la misión.");
  }
}
