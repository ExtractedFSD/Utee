import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { loadSharedPassport } from "@/lib/tracker/share-load";
import { SharedPassport } from "./SharedPassport";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shared UTI Passport", robots: { index: false, follow: false } };

/**
 * The read-only passport a clinician opens with the patient's code. No sign
 * in; the code is the credential. A signed-in clinician can also mark
 * entries as checked against the original report.
 */
export default async function SharedPassportPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const shared = await loadSharedPassport(code, { countView: true });
  if (!shared) redirect("/passport?error=not-found");
  const viewer = await getSessionUser();
  const canVerify = !!viewer && ["clinic", "admin", "super_admin"].includes(viewer.role);
  return <SharedPassport shared={shared} code={code} canVerify={canVerify} />;
}
