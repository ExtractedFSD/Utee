const BRAND = "#0d9488";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function wrap(title: string, bodyHtml: string) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f8fafc;font-family:Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;padding-bottom:24px;">
      <span style="font-size:24px;font-weight:700;color:${BRAND};letter-spacing:-0.5px;">utee</span>
    </div>
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
      <h1 style="font-size:18px;margin:0 0 16px;">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;padding-top:24px;">
      Utee — UTI testing &amp; care. This is a service email about your order or test.
    </p>
  </div>
</body></html>`;
}

function button(href: string, label: string) {
  return `<p style="text-align:center;margin:24px 0;">
    <a href="${href}" style="background:${BRAND};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-weight:600;display:inline-block;">${label}</a>
  </p>`;
}

const p = (text: string) =>
  `<p style="font-size:14px;line-height:1.6;color:#334155;margin:0 0 12px;">${text}</p>`;

/**
 * Sends via Resend. Soft-fails (logs) when RESEND_API_KEY is unset so local
 * dev and webhook processing never break on email problems.
 */
export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email skipped — no RESEND_API_KEY] to=${opts.to} subject="${opts.subject}"`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Utee <onboarding@resend.dev>",
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      console.error(`[email] Resend error ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error("[email] send failed", err);
  }
}

export const emails = {
  portalWelcome: (orderNumber: string) => ({
    subject: `Your Utee account is ready — order ${orderNumber}`,
    html: wrap(
      "Welcome to your Utee portal",
      p(`Thanks for your order <strong>${orderNumber}</strong>. We've created your secure portal account — log in any time with just your email address (we'll send you a one-time code, no password needed).`) +
        p(`In your portal you can track your order, manage any subscriptions, and — if you've ordered a UTI test kit — follow your sample's journey to the lab and download your final report.`) +
        button(`${APP_URL}/login`, "Open my portal") +
        p(`<strong>Ordered a test kit?</strong> When it arrives, scan the QR code inside and complete the short symptom form <em>before</em> taking your sample. Your kit can't be processed without it.`)
    ),
  }),

  kitClaimed: (kitCode: string) => ({
    subject: `Your Utee test kit ${kitCode} is registered`,
    html: wrap(
      "Your kit is linked to your account",
      p(`Test kit <strong>${kitCode}</strong> is now registered to this email address. Log in any time with just your email — we'll send you a one-time code, no password needed.`) +
        p(`<strong>Next step:</strong> complete the short symptom form <em>before</em> taking your sample, then post the sample back in the pre-paid return box. You can follow your sample's journey to the lab and download your final report in your portal.`) +
        button(`${APP_URL}/portal`, "Open my portal")
    ),
  }),

  kitShipped: (kitCode: string, trackingNumber: string) => ({
    subject: "Your Utee test kit is on its way",
    html: wrap(
      "Your test kit has been dispatched",
      p(`Your UTI test kit (ref <strong>${kitCode}</strong>) is on its way via Royal Mail Tracked. Tracking number: <strong>${trackingNumber}</strong>.`) +
        p(`<strong>Important — read before you use the kit:</strong> inside you'll find a urine pot, an absorbent pad bag, instructions, and a pre-paid return box. You <strong>must scan the QR code on the kit and complete the symptom form before taking your sample</strong>, so your symptoms reach the lab alongside your sample.`) +
        button(`${APP_URL}/portal`, "Track my kit")
    ),
  }),

  triageReceived: (kitCode: string) => ({
    subject: "Symptoms received — you're ready to take your sample",
    html: wrap(
      "Thanks — your symptoms have been recorded",
      p(`We've recorded the symptom form for kit <strong>${kitCode}</strong>. Please take your sample now following the instructions, seal it in the return box, and post it the same day if possible.`) +
        button(`${APP_URL}/portal`, "View my timeline")
    ),
  }),

  receivedByLab: (kitCode: string) => ({
    subject: "Your sample has arrived at the lab",
    html: wrap(
      "Sample received by the lab",
      p(`Good news — your sample (kit <strong>${kitCode}</strong>) has been received by our partner laboratory and analysis will begin shortly. We'll let you know as soon as testing is complete.`) +
        button(`${APP_URL}/portal`, "View my timeline")
    ),
  }),

  labComplete: (kitCode: string) => ({
    subject: "Lab analysis complete — now with our clinical team",
    html: wrap(
      "Lab analysis complete",
      p(`The laboratory has finished analysing your sample (kit <strong>${kitCode}</strong>). Your results and symptoms are now with our clinical team, who will prepare your final report.`) +
        button(`${APP_URL}/portal`, "View my timeline")
    ),
  }),

  reportReady: (kitCode: string) => ({
    subject: "Your Utee report is ready to download",
    html: wrap(
      "Your report is ready",
      p(`Your clinician-reviewed report for kit <strong>${kitCode}</strong> is now available in your portal. You can download or print it to share with your GP or doctor.`) +
        button(`${APP_URL}/portal`, "Download my report") +
        p(`Need to speak to someone? You can book a 5-minute urologist appointment directly from your portal.`)
    ),
  }),

  labNewSpecimen: (kitCode: string) => ({
    subject: `Specimen ${kitCode} inbound`,
    html: wrap(
      "New specimen on its way",
      p(`Specimen <strong>${kitCode}</strong> has been activated by the patient and the return parcel is in transit. Scan the QR code on the pot when it arrives to confirm receipt.`) +
        button(`${APP_URL}/lab`, "Open lab portal")
    ),
  }),

  clinicNewCase: (kitCode: string) => ({
    subject: `Case ${kitCode} ready for clinical review`,
    html: wrap(
      "New case for review",
      p(`Lab results for specimen <strong>${kitCode}</strong> have been uploaded. The patient's symptoms and lab results are ready for clinical review.`) +
        button(`${APP_URL}/clinic`, "Open clinic portal")
    ),
  }),

  subscriptionChanged: (action: string, productTitle: string, detail: string) => ({
    subject: `Subscription ${action}: ${productTitle}`,
    html: wrap(
      `Subscription ${action}`,
      p(`Your subscription to <strong>${productTitle}</strong> has been updated.`) +
        p(detail) +
        button(`${APP_URL}/portal/subscriptions`, "Manage my subscriptions")
    ),
  }),
};
