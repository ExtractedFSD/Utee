"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, inputClass } from "@/components/ui";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";
import { saveMySignature } from "./actions";

/**
 * Draw a signature and say how to be named under it. Used on the
 * signature page and inline on a report when the signer has none yet.
 */
export function SignatureForm({
  initial,
  onSaved,
}: {
  initial: { displayName: string; title: string; organisation: string };
  onSaved?: () => void;
}) {
  const router = useRouter();
  const pad = useRef<SignaturePadHandle>(null);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [title, setTitle] = useState(initial.title);
  const [organisation, setOrganisation] = useState(initial.organisation);
  const [hasInk, setHasInk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const image = pad.current?.toDataUrl();
    if (!image) {
      setError("Draw your signature first.");
      return;
    }
    startTransition(async () => {
      const result = await saveMySignature({ image, displayName, title, organisation });
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      pad.current?.clear();
      router.refresh();
      onSaved?.();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="signature-form">
      <SignaturePad ref={pad} onChange={setHasInk} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Name under the signature">
          <input name="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} placeholder="Professor Bob Yang" required />
        </Field>
        <Field label="Title (optional)">
          <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Consultant Urologist" />
        </Field>
        <Field label="On behalf of (optional)">
          <input name="organisation" value={organisation} onChange={(e) => setOrganisation(e.target.value)} className={inputClass} placeholder="the UTI Institute" />
        </Field>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" disabled={pending || !hasInk}>
        {pending ? "Saving…" : "Save my signature"}
      </Button>
    </form>
  );
}
