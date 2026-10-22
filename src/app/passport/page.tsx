import { Logo } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { EnterCode } from "./EnterCode";

/** For a clinician who was given the code over the phone or on paper. */
export default async function EnterSharePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="min-h-screen bg-gradient-brand flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 text-white">
          <Logo className="h-14 w-auto mx-auto" />
          <p className="text-sm text-white/85 mt-3">{copy.shared.eyebrow}</p>
        </div>
        <EnterCode notFound={error === "not-found"} />
      </div>
    </div>
  );
}
