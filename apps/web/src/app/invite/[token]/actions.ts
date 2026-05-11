"use server";

import { createClient } from "@/lib/supabase/server";

export async function acceptInvitation(invitationId: string, householdId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión para aceptar la invitación" };

  // Re-validate invitation
  const { data: invitation } = await supabase
    .from("household_invitations")
    .select("id, status, expires_at, household_id")
    .eq("id", invitationId)
    .single();

  if (!invitation || invitation.status !== "pending") return { error: "Invitación no válida o ya usada" };
  if (new Date(invitation.expires_at) < new Date()) return { error: "La invitación expiró" };

  // Check if already a member
  const { data: existing } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("user_id", user.id)
    .single();

  if (existing) return { error: "Ya eres miembro de este grupo" };

  // Add member
  const { error: memberErr } = await supabase
    .from("household_members")
    .insert({ household_id: householdId, user_id: user.id, role: "member" });

  if (memberErr) return { error: memberErr.message };

  // Mark invitation accepted
  await supabase
    .from("household_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invitationId);

  return { ok: true };
}
