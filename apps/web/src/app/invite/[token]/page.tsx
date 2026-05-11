import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { AcceptInviteButton } from "./accept-button";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  // Look up the invitation
  const { data: invitation } = await supabase
    .from("household_invitations")
    .select("id, household_id, status, expires_at, invited_email, households(name)")
    .eq("token", token)
    .single() as {
      data: {
        id: string;
        household_id: string;
        status: string;
        expires_at: string;
        invited_email: string | null;
        households: { name: string } | null;
      } | null;
    };

  if (!invitation) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold mb-2">Invitación no encontrada</h1>
          <p className="text-foreground/60 text-sm mb-6">Este enlace no es válido o ya fue usado.</p>
          <Link href="/sign-in"><Button>Ir al inicio</Button></Link>
        </div>
      </main>
    );
  }

  if (invitation.status !== "pending" || new Date(invitation.expires_at) < new Date()) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold mb-2">Invitación expirada</h1>
          <p className="text-foreground/60 text-sm mb-6">
            {invitation.status === "accepted"
              ? "Esta invitación ya fue aceptada."
              : "Esta invitación expiró o fue cancelada. Pide al dueño del grupo que te envíe una nueva."}
          </p>
          <Link href="/sign-in"><Button>Iniciar sesión</Button></Link>
        </div>
      </main>
    );
  }

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  const householdName = invitation.households?.name ?? "un grupo";

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-4">🏠</div>
        <h1 className="text-2xl font-semibold mb-2">Invitación a {householdName}</h1>
        <p className="text-foreground/60 text-sm mb-8">
          Te invitaron a compartir finanzas en Cornerstone Capital.
          {invitation.invited_email && ` Invitación para: ${invitation.invited_email}`}
        </p>

        {user ? (
          <AcceptInviteButton invitationId={invitation.id} householdId={invitation.household_id} />
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-foreground/50 mb-4">
              Crea una cuenta o inicia sesión para aceptar la invitación.
            </p>
            <Link href={`/sign-up?invite=${token}`}>
              <Button className="w-full">Crear cuenta y unirme</Button>
            </Link>
            <Link href={`/sign-in?invite=${token}`}>
              <Button variant="ghost" className="w-full">Ya tengo cuenta — Iniciar sesión</Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
