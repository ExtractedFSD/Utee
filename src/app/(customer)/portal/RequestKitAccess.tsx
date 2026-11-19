"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { requestKitAccess } from "./actions";

/** One button on the "not your kit" notice: ask the buyer to pass it on. */
export function RequestKitAccess({ code }: { code: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-3" data-testid="request-kit-access">
      <Button
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await requestKitAccess(code);
            if ("error" in r) setError(r.error);
            else router.replace("/portal?kit=requested");
          });
        }}
      >
        {pending ? "Sending…" : "Ask them to pass it on"}
      </Button>
      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
    </div>
  );
}
