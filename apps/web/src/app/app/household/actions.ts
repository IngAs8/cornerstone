"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function getHouseholdOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .single();

  if (!membership) return { error: "No household" as const };

  const { data: household } = await supabase
    .from("households")
    .select("id, name, owner_id, max_members")
    .eq("id", membership.household_id)
    .single();

  if (!household) return { error: "No household" as const };

  return { supabase, user, household };
}

export async function updateHouseholdName(name: string) {
  const result = await getHouseholdOwner();
  if ("error" in result) return { error: result.error };
  const { supabase, user, household } = result;

  if (household.owner_id !== user.id) return { error: "Solo el dueño puede cambiar el nombre" };

  const { error } = await supabase
    .from("households")
    .update({ name: name.trim() })
    .eq("id", household.id);

  if (error) return { error: error.message };
  revalidatePath("/app/household");
  return { ok: true };
}

export async function inviteByEmail(email: string) {
  const result = await getHouseholdOwner();
  if ("error" in result) return { error: result.error };
  const { supabase, user, household } = result;

  if (household.owner_id !== user.id) return { error: "Solo el dueño puede invitar" };

  // Check member count
  const { count } = await supabase
    .from("household_members")
    .select("id", { count: "exact", head: true })
    .eq("household_id", household.id);

  if ((count ?? 0) >= household.max_members) {
    return { error: `Tu plan solo permite ${household.max_members} miembro(s). Mejora tu plan para agregar más.` };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: invErr } = await supabase.from("household_invitations").insert({
    household_id: household.id,
    invited_by_user_id: user.id,
    channel: "email",
    invited_email: email.trim().toLowerCase(),
    token,
    status: "pending",
    expires_at: expiresAt,
  });

  if (invErr) return { error: invErr.message };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://cornerstonecapital.app";
  const inviteUrl = `${appUrl}/invite/${token}`;

  // Send email via Resend (only if API key is configured)
  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: "Cornerstone Capital <no-reply@cornerstonecapital.app>",
        to: email.trim(),
        subject: `Te invitaron a unirte a ${household.name} en Cornerstone Capital`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
            <h2>Fuiste invitado a ${household.name}</h2>
            <p>Alguien te invitó a compartir finanzas familiares en Cornerstone Capital.</p>
            <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;border-radius:6px;text-decoration:none">
              Aceptar invitación
            </a>
            <p style="color:#999;font-size:12px;margin-top:24px">
              Este enlace expira en 7 días. Si no esperabas esta invitación, puedes ignorar este correo.
            </p>
          </div>
        `,
      });
    } catch {
      // Email failed but invitation was created — show link to user
    }
  }

  revalidatePath("/app/household");
  return { ok: true, inviteUrl };
}

export async function cancelInvitation(invitationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("household_invitations")
    .update({ status: "cancelled" })
    .eq("id", invitationId);

  if (error) return { error: error.message };
  revalidatePath("/app/household");
  return { ok: true };
}

export async function removeMember(memberId: string) {
  const result = await getHouseholdOwner();
  if ("error" in result) return { error: result.error };
  const { supabase, user, household } = result;

  if (household.owner_id !== user.id) return { error: "Solo el dueño puede eliminar miembros" };

  // Prevent removing self
  const { data: member } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("id", memberId)
    .single();

  if (member?.user_id === user.id) return { error: "No puedes eliminarte a ti mismo" };

  const { error } = await supabase
    .from("household_members")
    .delete()
    .eq("id", memberId)
    .eq("household_id", household.id);

  if (error) return { error: error.message };
  revalidatePath("/app/household");
  return { ok: true };
}
