"use client";

import { useState, useTransition } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import type { Role } from "@/lib/status";
import { ROLES, ROLE_HELP, ROLE_LABELS } from "@/lib/roles";
import { createUser, setUserRole } from "./actions";

export function CreateUserForm() {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("lab");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} autoComplete="off" />
        </Field>
        <Field label="Name (optional)">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} autoComplete="off" />
        </Field>
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClass}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="text-xs text-slate-500">{ROLE_HELP[role]} They sign in at the login page with a one-time email code.</p>
      <Button
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await createUser({ email, role, fullName });
            if (result.error) setMessage({ ok: false, text: result.error });
            else {
              setMessage({ ok: true, text: `Created ${email.trim().toLowerCase()} as ${ROLE_LABELS[role].toLowerCase()}.` });
              setEmail("");
              setFullName("");
            }
          });
        }}
      >
        {pending ? "Creating…" : "Create user"}
      </Button>
      {message && <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-rose-600"}`}>{message.text}</p>}
    </div>
  );
}

export function RoleSelect({ userId, role, disabled }: { userId: string; role: Role; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <select
        value={role}
        disabled={disabled || pending}
        aria-label="Role"
        onChange={(e) => {
          const next = e.target.value;
          if (!window.confirm(`Change this user's role to ${ROLE_LABELS[next as Role]}?`)) return;
          setError(null);
          startTransition(async () => {
            const result = await setUserRole(userId, next);
            if (result.error) setError(result.error);
          });
        }}
        className={`${inputClass} w-40 py-1.5 text-xs`}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}
