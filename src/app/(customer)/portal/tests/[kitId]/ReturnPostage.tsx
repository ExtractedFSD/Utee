"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, inputClass } from "@/components/ui";
import type { PostalAddress } from "@/lib/royalmail-request";
import { requestReturnPostage } from "./actions";

/*
 * Return postage on the kit page. Before a label exists: one button, and
 * an address form only when the portal has no address for the patient.
 * After: the QR for the Post Office counter, the tracking number, the
 * printable label and where to take it.
 */
export type PostageView = { trackingNumber: string; createdAt: string; hasQr: boolean; hasPdf: boolean; stub: boolean } | null;

export function ReturnPostage({ kitId, kitCode, postage, canRequest }: { kitId: string; kitCode: string; postage: PostageView; canRequest: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<PostalAddress | null>(null);

  const run = (typed?: PostalAddress) => {
    setError(null);
    startTransition(async () => {
      const r = await requestReturnPostage(kitId, typed);
      if ("error" in r) setError(r.error);
      else if ("needAddress" in r) setAddress({ firstName: r.suggested.firstName ?? "", lastName: r.suggested.lastName ?? "", addressLine1: "", addressLine2: "", city: "", postcode: "" });
      else router.refresh();
    });
  };

  if (postage) {
    return (
      <div className="rounded-card bg-white p-6 shadow-card" data-testid="return-postage">
        <h2 className="font-display text-2xl font-light text-midnight">Your return postage</h2>
        <p className="mt-1 text-sm text-[#5a4a6e]">Royal Mail Tracked Returns · {postage.trackingNumber}</p>
        {postage.stub && <p className="mt-2 inline-flex rounded-full bg-sun px-3 py-1 text-[11px] font-semibold uppercase tracking-[.1em] text-amber-900">Test label, not valid postage</p>}
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-pink-25 p-4 sm:flex-row sm:items-start">
          {postage.hasQr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/portal/tests/${kitId}/postage/qr`} alt={`QR code for return postage ${postage.trackingNumber}`} width={180} height={180} className="h-[180px] w-[180px] rounded-xl bg-white p-2" />
          )}
          <div className="min-w-0 text-sm text-midnight leading-relaxed">
            <p className="font-semibold">Show this QR code at any Post Office counter.</p>
            <p className="mt-1 text-[#5a4a6e]">They scan it and print the label for you. Stick the label on the return box and hand it in. No printer needed.</p>
            <p className="mt-2 text-[#5a4a6e]">Or {postage.hasPdf ? <a href={`/portal/tests/${kitId}/postage/label`} className="font-semibold text-maroon">print the label</a> : "print the label"} at home and stick it on before you go.</p>
            <p className="mt-2"><a href="https://www.postoffice.co.uk/branch-finder" target="_blank" rel="noopener" className="font-semibold text-maroon">Find your nearest Post Office</a></p>
          </div>
        </div>
        <p className="mt-3 text-xs text-[#8a7a9c]">Post the sample the same day you take it if you can. Lost the label? Contact us and we will issue a new one.</p>
      </div>
    );
  }

  if (!canRequest) return null;

  return (
    <div className="rounded-card bg-gradient-brand p-6 text-white shadow-card" data-testid="return-postage">
      <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/85">Kit {kitCode}</p>
      <h2 className="mt-1 font-display text-2xl font-light">Ready to post your sample?</h2>
      <p className="mt-2 text-sm text-white/90 leading-relaxed">Get your Royal Mail postage here. You will get a QR code to show at a Post Office counter, where they print the label, or a label to print at home. Nothing to pay.</p>
      {address ? (
        <form
          onSubmit={(e) => { e.preventDefault(); run(address); }}
          className="mt-4 space-y-3 rounded-2xl bg-white p-4 text-midnight"
          data-testid="postage-address"
        >
          <p className="text-sm text-[#5a4a6e]">We need the address the parcel is sent from, for the label.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm"><span className="block font-semibold mb-1">First name</span><input required value={address.firstName} onChange={(e) => setAddress({ ...address, firstName: e.target.value })} className={inputClass} autoComplete="given-name" /></label>
            <label className="text-sm"><span className="block font-semibold mb-1">Last name</span><input required value={address.lastName} onChange={(e) => setAddress({ ...address, lastName: e.target.value })} className={inputClass} autoComplete="family-name" /></label>
          </div>
          <label className="block text-sm"><span className="block font-semibold mb-1">Address line 1</span><input required value={address.addressLine1} onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })} className={inputClass} autoComplete="address-line1" /></label>
          <label className="block text-sm"><span className="block font-semibold mb-1">Address line 2 (optional)</span><input value={address.addressLine2 ?? ""} onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })} className={inputClass} autoComplete="address-line2" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm"><span className="block font-semibold mb-1">Town or city</span><input required value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className={inputClass} autoComplete="address-level2" /></label>
            <label className="text-sm"><span className="block font-semibold mb-1">Postcode</span><input required value={address.postcode} onChange={(e) => setAddress({ ...address, postcode: e.target.value })} className={`${inputClass} uppercase`} autoComplete="postal-code" /></label>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Get my postage"}</Button>
            <button type="button" onClick={() => setAddress(null)} className="min-h-[44px] px-2 text-sm font-semibold text-maroon">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="mt-4">
          {error && <p className="mb-3 text-sm text-white">{error}</p>}
          <Button variant="white" disabled={pending} onClick={() => run()}>{pending ? "Creating…" : "Get my postage"}</Button>
        </div>
      )}
    </div>
  );
}
