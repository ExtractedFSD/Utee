import type { Metadata } from "next";
import { Logo } from "@/components/ui";
import { formatKitCode } from "@/lib/kit-code";
import { transferRequestByToken } from "@/lib/kit-transfer";
import { createAdminClient } from "@/lib/supabase/admin";
import { DecideForm } from "./DecideForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pass this kit on?", robots: { index: false, follow: false } };

/*
 * The page behind the buyer's email link. The token identifies the
 * request; no sign-in. It shows who asked and for which kit, and the
 * decision is a button, so opening the link does nothing by itself.
 */
export default async function TransferDecisionPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ decline?: string }> }) {
  const { token } = await params;
  const { decline } = await searchParams;
  const found = /^[A-Za-z0-9_-]{20,64}$/.test(token) ? await transferRequestByToken(createAdminClient(), token) : null;
  const expired = found && (found.request.status !== "pending" || found.request.expires_at < new Date().toISOString());
  const name = found?.requester?.full_name ?? found?.requester?.email ?? "Someone";

  return (
    <div className="min-h-screen bg-gradient-brand flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 text-white">
          <Logo className="h-14 w-auto mx-auto" />
        </div>
        <div className="bg-white rounded-card shadow-card p-6 space-y-4">
          {!found ? (
            <>
              <h1 className="font-display text-2xl font-light text-midnight">This link isn&apos;t valid</h1>
              <p className="text-sm text-[#5a4a6e]">It may have been used already, or copied incompletely. If someone still wants the kit, ask them to scan it again and a fresh email will come to you.</p>
            </>
          ) : expired ? (
            <>
              <h1 className="font-display text-2xl font-light text-midnight">This request is no longer open</h1>
              <p className="text-sm text-[#5a4a6e]">{found.request.status === "approved" ? `Kit ${formatKitCode(found.kit.code)} has already been passed on.` : `The request for kit ${formatKitCode(found.kit.code)} has expired or was withdrawn. If they still want it, ask them to scan it again.`}</p>
            </>
          ) : (
            <>
              <p className="text-[12px] font-semibold uppercase tracking-[.16em] text-maroon">Kit {formatKitCode(found.kit.code)}</p>
              <h1 className="font-display text-2xl font-light text-midnight">Pass this kit on to {name}?</h1>
              <p className="text-sm text-[#5a4a6e] leading-relaxed">
                <strong className="text-midnight">{name}</strong>{found.requester?.email ? ` (${found.requester.email})` : ""} scanned this kit and asked to use it. If you bought it for them, pass it on: it moves to their account, and their symptom form and result will be theirs. You won&apos;t see it on your account afterwards.
              </p>
              <DecideForm token={token} kitCode={formatKitCode(found.kit.code)} requesterName={name} initialDecline={decline === "1"} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
