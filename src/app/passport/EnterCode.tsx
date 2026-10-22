"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { formatShareCode, normalizeShareCode } from "@/lib/tracker/share";

export function EnterCode({ notFound }: { notFound: boolean }) {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(notFound ? copy.shared.notFound : null);
  function go(e: React.FormEvent) {
    e.preventDefault();
    const code = normalizeShareCode(raw);
    if (!code) { setError(copy.shared.notFound); return; }
    setError(null);
    router.push(`/passport/${formatShareCode(code)}`);
  }
  return (
    <form onSubmit={go} className="bg-white rounded-card shadow-card p-6 space-y-4">
      <div>
        <h1 className="font-display text-2xl font-light text-midnight">{copy.shared.enterTitle}</h1>
        <p className="text-sm text-slate-500 mt-1.5">{copy.shared.enterBody}</p>
      </div>
      <div>
        <label htmlFor="share-code" className="block text-sm font-medium text-slate-700 mb-1">{copy.shared.enterLabel}</label>
        <input id="share-code" value={raw} onChange={(e) => setRaw(e.target.value)} className={`${inputClass} font-mono uppercase tracking-wider`} placeholder="ABCD-EFGH-JKLM" autoComplete="off" autoCapitalize="characters" spellCheck={false} />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" className="w-full">{copy.shared.enterButton}</Button>
    </form>
  );
}
