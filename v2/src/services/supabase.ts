import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StudentRepository } from "@/types";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const PENDING_INVITATION_KEY = "tomatin.v2.pending-invitation";

export const supabase: SupabaseClient | null =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const isSupabaseConfigured = Boolean(supabase);

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
  const redirectTo = `${window.location.origin}${window.location.pathname}#/auth/callback`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo },
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

export async function signOutSupabase() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
