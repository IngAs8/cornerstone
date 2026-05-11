"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteByEmail, cancelInvitation, removeMember, updateHouseholdName } from "./actions";

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; fullName: string | null; email: string; avatarUrl: string | null } | null;
}

interface Invitation {
  id: string;
  invitedEmail: string | null;
  invitedWhatsapp: string | null;
  channel: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export function HouseholdClient({
  householdId,
  householdName,
  isOwner,
  currentUserId,
  members,
  invitations,
}: {
  householdId: string;
  householdName: string;
  isOwner: boolean;
  currentUserId: string;
  members: Member[];
  invitations: Invitation[];
}) {
  const [isPending, startTransition] = useTransition();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [editName, setEditName] = useState(false);
  const [nameValue, setNameValue] = useState(householdName);
  const [nameError, setNameError] = useState<string | null>(null);

  function sendInvite() {
    if (!email.trim() || !email.includes("@")) { setInviteError("Ingresa un email válido"); return; }
    setInviteError(null);
    setInviteLink(null);
    startTransition(async () => {
      const result = await inviteByEmail(email.trim());
      if (result.error) { setInviteError(result.error); return; }
      setInviteLink(result.inviteUrl ?? null);
      setEmail("");
      setShowInvite(false);
    });
  }

  function saveName() {
    if (!nameValue.trim()) { setNameError("El nombre no puede estar vacío"); return; }
    setNameError(null);
    startTransition(async () => {
      const result = await updateHouseholdName(nameValue.trim());
      if (result.error) { setNameError(result.error); return; }
      setEditName(false);
    });
  }

  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  return (
    <div className="space-y-6">
      {/* Household name */}
      <div className="rounded-lg border border-foreground/10 p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold">Nombre del grupo</h2>
          {isOwner && !editName && (
            <button onClick={() => setEditName(true)} className="text-xs text-foreground/40 hover:text-foreground">
              Editar
            </button>
          )}
        </div>
        {editName ? (
          <div className="flex gap-2 mt-2">
            <Input value={nameValue} onChange={(e) => setNameValue(e.target.value)} className="text-sm" />
            <Button size="sm" onClick={saveName} disabled={isPending}>Guardar</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditName(false)}>Cancelar</Button>
          </div>
        ) : (
          <p className="text-foreground/70 text-sm">{householdName}</p>
        )}
        {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
      </div>

      {/* Members */}
      <div className="rounded-lg border border-foreground/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Miembros ({members.length})</h2>
          {isOwner && (
            <button
              onClick={() => { setShowInvite(!showInvite); setInviteError(null); setInviteLink(null); }}
              className="text-xs text-foreground/50 hover:text-foreground"
            >
              + Invitar
            </button>
          )}
        </div>

        {showInvite && (
          <div className="mb-4 p-4 rounded-lg bg-foreground/3 border border-foreground/10 space-y-3">
            <div>
              <Label htmlFor="inviteEmail">Correo electrónico</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="nombre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendInvite(); }}
                />
                <Button size="sm" onClick={sendInvite} disabled={isPending}>
                  {isPending ? "…" : "Enviar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowInvite(false)}>Cancelar</Button>
              </div>
            </div>
            {inviteError && <p className="text-xs text-red-500">{inviteError}</p>}
          </div>
        )}

        {inviteLink && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <p className="text-emerald-400 font-medium mb-1">Invitación creada</p>
            <p className="text-foreground/60 mb-2">Comparte este enlace directamente:</p>
            <div className="flex gap-2 items-center">
              <input
                readOnly
                value={inviteLink}
                className="flex-1 bg-transparent text-foreground/80 text-xs outline-none truncate"
              />
              <button
                onClick={() => navigator.clipboard.writeText(inviteLink)}
                className="text-foreground/40 hover:text-foreground shrink-0"
              >
                Copiar
              </button>
            </div>
          </div>
        )}

        <ul className="divide-y divide-foreground/5">
          {members.map((m) => (
            <li key={m.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-medium">
                  {(m.user?.fullName ?? m.user?.email ?? "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{m.user?.fullName ?? m.user?.email}</p>
                  {m.user?.fullName && <p className="text-xs text-foreground/40">{m.user?.email}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-foreground/30 capitalize">{m.role === "owner" ? "Dueño" : "Miembro"}</span>
                {isOwner && m.user?.id !== currentUserId && (
                  <button
                    onClick={() => { if (confirm("¿Eliminar este miembro?")) startTransition(async () => { await removeMember(m.id); }); }}
                    className="text-xs text-foreground/30 hover:text-red-400"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Pending invitations */}
      {isOwner && pendingInvitations.length > 0 && (
        <div className="rounded-lg border border-foreground/10 p-5">
          <h2 className="text-sm font-semibold mb-3">Invitaciones pendientes</h2>
          <ul className="divide-y divide-foreground/5">
            {pendingInvitations.map((inv) => (
              <li key={inv.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm">{inv.invitedEmail ?? inv.invitedWhatsapp}</p>
                  <p className="text-xs text-foreground/40">
                    Vía {inv.channel === "email" ? "email" : "WhatsApp"} · expira {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => startTransition(async () => { await cancelInvitation(inv.id); })}
                  disabled={isPending}
                  className="text-xs text-foreground/30 hover:text-red-400"
                >
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
