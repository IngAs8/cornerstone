import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HouseholdClient } from "./household-client";

interface MemberRow {
  id: string;
  role: string;
  joined_at: string;
  users: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

interface InvitationRow {
  id: string;
  invited_email: string | null;
  invited_whatsapp: string | null;
  channel: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export default async function HouseholdPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/app/onboarding");

  const [{ data: household }, { data: rawMembers }, { data: rawInvitations }] = await Promise.all([
    supabase
      .from("households")
      .select("id, name, owner_id, max_members, subscription_plan")
      .eq("id", membership.household_id)
      .single(),
    supabase
      .from("household_members")
      .select("id, role, joined_at, users(id, full_name, email, avatar_url)")
      .eq("household_id", membership.household_id)
      .order("joined_at", { ascending: true })
      .returns<MemberRow[]>(),
    supabase
      .from("household_invitations")
      .select("id, invited_email, invited_whatsapp, channel, status, created_at, expires_at")
      .eq("household_id", membership.household_id)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<InvitationRow[]>(),
  ]);

  if (!household) redirect("/app/onboarding");

  const isOwner = household.owner_id === user.id;

  const members = (rawMembers ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    joinedAt: m.joined_at,
    user: m.users
      ? { id: m.users.id, fullName: m.users.full_name, email: m.users.email, avatarUrl: m.users.avatar_url }
      : null,
  }));

  const invitations = (rawInvitations ?? []).map((i) => ({
    id: i.id,
    invitedEmail: i.invited_email,
    invitedWhatsapp: i.invited_whatsapp,
    channel: i.channel,
    status: i.status,
    createdAt: i.created_at,
    expiresAt: i.expires_at,
  }));

  const planLabel: Record<string, string> = {
    free: "Gratuito (1 usuario)",
    personal: "Personal (1 usuario)",
    family_s: "Familiar S (2 usuarios)",
    family_m: "Familiar M (3 usuarios)",
  };

  return (
    <main className="flex-1 px-8 py-10 max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Grupo familiar</h1>
        <p className="text-foreground/60 text-sm mt-0.5">
          {planLabel[household.subscription_plan] ?? household.subscription_plan} ·{" "}
          {members.length}/{household.max_members} miembro{members.length !== 1 ? "s" : ""}
        </p>
      </div>

      <HouseholdClient
        householdId={household.id}
        householdName={household.name}
        isOwner={isOwner}
        currentUserId={user.id}
        members={members}
        invitations={invitations}
      />
    </main>
  );
}
