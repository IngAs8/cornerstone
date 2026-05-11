"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptInvitation } from "./actions";

export function AcceptInviteButton({ invitationId, householdId }: { invitationId: string; householdId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function accept() {
    startTransition(async () => {
      const result = await acceptInvitation(invitationId, householdId);
      if (result.error) { setError(result.error); return; }
      router.push("/app/dashboard");
    });
  }

  return (
    <div>
      <Button onClick={accept} disabled={isPending} className="w-full">
        {isPending ? "Uniéndome…" : "Aceptar invitación"}
      </Button>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}
