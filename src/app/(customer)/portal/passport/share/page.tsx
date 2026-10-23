import QRCode from "qrcode";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { requireTracker } from "@/lib/tracker/data";
import { copy } from "@/lib/tracker/copy";
import { formatShareCode, shareState, shareUrl, type ShareRow } from "@/lib/tracker/share";
import { ShareManager, type ShareItem } from "./ShareManager";

export const dynamic = "force-dynamic";

export default async function SharePage() {
  const { supabase, user } = await requireTracker();
  const { data } = await supabase
    .from("tracker_shares")
    .select("id, code, label, created_at, expires_at, revoked_at, last_viewed_at, view_count")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.myutee.co.uk";
  const items: ShareItem[] = await Promise.all(
    ((data ?? []) as ShareRow[]).map(async (s) => {
      const state = shareState(s);
      const url = shareUrl(appUrl, s.code);
      return { ...s, state, url, display: formatShareCode(s.code), qrSvg: state === "active" ? await QRCode.toString(url, { type: "svg", margin: 1, width: 180, color: { dark: "#1d003a", light: "#ffffff" } }) : null };
    })
  );
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader eyebrow="UTI Passport" title={copy.share.title} subtitle={copy.share.intro} action={<LinkButton href="/portal/passport/passport">{copy.passport.download}</LinkButton>} />
      <ShareManager shares={items} />
      <Card className="bg-pink-25/60">
        <p className="text-sm font-semibold text-midnight mb-1">{copy.share.whatTheySee}</p>
        <p className="text-sm text-slate-600">{copy.share.whatTheySeeBody}</p>
      </Card>
    </div>
  );
}
