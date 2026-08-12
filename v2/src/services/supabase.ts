import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isFrontendOnly } from "@/config/runtime";
import { edgeFunctionErrorMessage } from "@/lib/edge-function-error";
import type { StudentRepository } from "@/types";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const PENDING_INVITATION_KEY = "tomatin.v2.pending-invitation";

export const supabase: SupabaseClient | null =
  !isFrontendOnly && url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          persistSession: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      })
    : null;

export const isSupabaseConfigured = Boolean(supabase);

export function getOAuthRedirectUrl(currentUrl = window.location.href) {
  const redirectUrl = new URL(currentUrl);
  redirectUrl.search = "";
  redirectUrl.hash = "";
  return redirectUrl.toString();
}

export function rememberInvitationFromLocation(): string | null {
  const match = window.location.hash.match(/^#\/join\/([a-f0-9]{36})$/i);
  if (!match) return localStorage.getItem(PENDING_INVITATION_KEY);
  localStorage.setItem(PENDING_INVITATION_KEY, match[1]);
  return match[1];
}

export async function acceptPendingInvitation(): Promise<boolean> {
  const token = localStorage.getItem(PENDING_INVITATION_KEY);
  if (!supabase || !token) return false;
  const { error } = await supabase.rpc("accept_invitation", {
    p_token: token,
  });
  if (error) throw error;
  localStorage.removeItem(PENDING_INVITATION_KEY);
  return true;
}

export async function signInWithGitHub() {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: getOAuthRedirectUrl() },
  });
  if (error) throw error;
}

export async function provisionStudentRepository(): Promise<{
  status: "ready" | "pending_setup" | "not_applicable";
  repository?: StudentRepository;
}> {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { data, error } = await supabase.functions.invoke<{
    status: "ready" | "pending_setup" | "not_applicable";
    repository?: StudentRepository;
  }>("provision-repository", { body: {} });
  if (error) throw error;
  if (!data) throw new Error("El backend no respondió.");
  return data;
}

export async function notifyAssignment(assignmentId: string) {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { data, error } = await supabase.functions.invoke<{
    delivery?: {
      status: "pending" | "sent" | "partial" | "failed";
      githubCommentUrl?: string;
    };
    duplicate?: boolean;
  }>("notify-assignment", { body: { assignmentId } });
  if (error) {
    throw new Error(
      await edgeFunctionErrorMessage(
        error,
        "No se pudo enviar el aviso de la tarea.",
      ),
    );
  }
  return data;
}

export function getRewardImageUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (/^(https?:|data:|\/)/.test(path)) return path;
  return supabase?.storage.from("reward-images").getPublicUrl(path).data
    .publicUrl;
}

export async function signOutSupabase() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
