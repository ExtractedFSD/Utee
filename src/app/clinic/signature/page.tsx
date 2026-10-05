import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/status";
import { SIGNATURES_BUCKET } from "@/lib/report/build";
import { getMySignature } from "./actions";
import { SignatureForm } from "./SignatureForm";

export default async function SignaturePage() {
  const user = await requireRole(["clinic"]);
  const saved = await getMySignature();

  let previewUrl: string | null = null;
  if (saved) {
    const admin = createAdminClient();
    const { data } = await admin.storage.from(SIGNATURES_BUCKET).createSignedUrl(saved.imagePath, 300);
    previewUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My signature"
        subtitle="Drawn once, applied to every report you sign. The patient sees it on the last page of their report with your name and title."
      />

      {saved && (
        <Card>
          <CardTitle>Current signature</CardTitle>
          <div className="flex flex-wrap items-end gap-6">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Your saved signature" className="h-20 w-auto rounded-xl border border-slate-200 bg-white px-3" data-testid="saved-signature" />
            )}
            <div className="text-sm text-slate-700">
              <p className="font-semibold text-midnight">{saved.displayName}</p>
              {saved.title && <p>{saved.title}</p>}
              {saved.organisation && <p>On behalf of {saved.organisation}</p>}
              <p className="mt-1 text-xs text-slate-400">Saved {formatDateTime(saved.updatedAt)}</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardTitle>{saved ? "Replace your signature" : "Draw your signature"}</CardTitle>
        <SignatureForm
          initial={{
            displayName: saved?.displayName ?? user.fullName ?? "",
            title: saved?.title ?? "",
            organisation: saved?.organisation ?? "",
          }}
        />
      </Card>
    </div>
  );
}
