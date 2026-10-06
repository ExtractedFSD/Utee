import { createAdminClient } from "@/lib/supabase/admin";

const BRAND = "#91193b"; // Utee maroon
const MIDNIGHT = "#1d003a";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Headings are Cooper Light, as everywhere else in the brand. Mail clients
 * don't have it installed, so it is served from the portal as a web font;
 * clients that ignore @font-face (Gmail) fall back to Georgia.
 */
const FONT_FACE = `@font-face{font-family:'Cooper';font-style:normal;font-weight:300;src:url('${APP_URL}/fonts/CooperLight.ttf') format('truetype');}`;

function wrap(title: string, bodyHtml: string) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>${FONT_FACE}</style></head><body style="margin:0;padding:0;background:#ffe5f2;font-family:Poppins,Helvetica,Arial,sans-serif;color:${MIDNIGHT};">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;padding-bottom:24px;">
      <img src="${APP_URL}/logo-maroon.png" alt="Utee" width="96" height="36" style="display:inline-block;width:96px;height:auto;border:0;" />
    </div>
    <div style="background:#ffffff;border-radius:24px;padding:32px;box-shadow:0 10px 30px rgba(29,0,58,.14);">
      <h1 style="font-family:'Cooper',Georgia,serif;font-weight:300;font-size:26px;line-height:1.15;margin:0 0 16px;color:${MIDNIGHT};">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:#6f6188;font-size:12px;padding-top:24px;">
      Utee, UTI testing &amp; care. This is a service email about your order or test.
    </p>
  </div>
</body></html>`;
}

function button(href: string, label: string) {
  return `<p style="text-align:center;margin:24px 0;">
    <a href="${href}" style="background:${BRAND};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:9999px;font-weight:600;font-size:13px;letter-spacing:.14em;text-transform:uppercase;display:inline-block;">${label}</a>
  </p>`;
}

const p = (text: string) =>
  `<p style="font-size:15px;line-height:1.55;color:${MIDNIGHT};margin:0 0 12px;">${text}</p>`;

export type EmailStatus = "sent" | "failed" | "skipped" | "delivered" | "bounced" | "complained" | "delivery_delayed";

/**
 * Writes one email_log row per recipient. Never throws: a logging problem
 * must not break the action that sent the email.
 */
async function logEmail(row: {
  kitId?: string | null;
  to: string[];
  subject: string;
  kind?: string;
  status: EmailStatus;
  providerId?: string | null;
  error?: string | null;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("email_log").insert(
      row.to.map((to) => ({
        kit_id: row.kitId ?? null,
        to_email: to,
        subject: row.subject,
        kind: row.kind ?? null,
        status: row.status,
        provider_id: row.providerId ?? null,
        error: row.error ?? null,
      }))
    );
  } catch (err) {
    console.error("[email] log failed", err);
  }
}

/**
 * Sends via Resend and records the attempt in email_log. Soft-fails (logs)
 * when RESEND_API_KEY is unset so local dev and webhook processing never
 * break on email problems.
 */
export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  /** The kit this email is about, so it shows on the admin kit page. */
  kitId?: string | null;
  /** Template name, for filtering the log. */
  kind?: string;
}): Promise<{ ok: boolean; id?: string }> {
  const to = Array.isArray(opts.to) ? opts.to : [opts.to];
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email skipped, no RESEND_API_KEY] to=${to} subject="${opts.subject}"`);
    await logEmail({ ...opts, to, status: "skipped", error: "RESEND_API_KEY not set" });
    return { ok: false };
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
        to,
        subject: opts.subject,
        html: opts.html,
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[email] Resend error ${res.status}: ${text}`);
      await logEmail({ ...opts, to, status: "failed", error: `Resend ${res.status}: ${text.slice(0, 500)}` });
      return { ok: false };
    }
    let id: string | undefined;
    try {
      id = (JSON.parse(text) as { id?: string }).id;
    } catch {
      // Resend always returns JSON; keep going without the id if not.
    }
    await logEmail({ ...opts, to, status: "sent", providerId: id ?? null });
    return { ok: true, id };
  } catch (err) {
    console.error("[email] send failed", err);
    await logEmail({ ...opts, to, status: "failed", error: err instanceof Error ? err.message : String(err) });
    return { ok: false };
  }
}

export const emails = {
  portalWelcome: (orderNumber: string) => ({
    subject: `Your Utee account is ready for order ${orderNumber}`,
    html: wrap(
      "Welcome to your Utee portal",
      p(`Thanks for your order <strong>${orderNumber}</strong>. We've created your secure portal account. Log in any time with just your email address (we'll send you a one-time code, no password needed).`) +
        p(`In your portal you can track your order, manage any subscriptions, and, if you've ordered a UTI test kit, follow your sample's journey to the lab and download your final report.`) +
        button(`${APP_URL}/login`, "Open my portal") +
        p(`<strong>Ordered a test kit?</strong> When it arrives, scan the QR code inside and complete the short symptom form <em>before</em> taking your sample. Your kit can't be processed without it.`)
    ),
  }),

  kitClaimed: (kitCode: string) => ({
    subject: `Your Utee test kit ${kitCode} is registered`,
    html: wrap(
      "Your kit is linked to your account",
      p(`Test kit <strong>${kitCode}</strong> is now registered to this email address. Log in any time with just your email. We'll send you a one-time code, no password needed.`) +
        p(`<strong>Next step:</strong> complete the short symptom form <em>before</em> taking your sample, then post the sample back in the pre-paid return box. You can follow your sample's journey to the lab and download your final report in your portal.`) +
        button(`${APP_URL}/portal`, "Open my portal")
    ),
  }),

  kitShipped: (kitCode: string, trackingNumber: string) => ({
    subject: "Your Utee test kit is on its way",
    html: wrap(
      "Your test kit has been dispatched",
      p(`Your UTI test kit (ref <strong>${kitCode}</strong>) is on its way via Royal Mail Tracked. Tracking number: <strong>${trackingNumber}</strong>.`) +
        p(`<strong>Important. Read before you use the kit:</strong> inside you'll find a urine pot, an absorbent pad bag, instructions, and a pre-paid return box. You <strong>must scan the QR code on the kit and complete the symptom form before taking your sample</strong>, so your symptoms reach the lab alongside your sample.`) +
        button(`${APP_URL}/portal`, "Track my kit")
    ),
  }),

  triageReceived: (kitCode: string) => ({
    subject: "Symptoms received. You're ready to take your sample",
    html: wrap(
      "Thanks, your symptoms have been recorded",
      p(`We've recorded the symptom form for kit <strong>${kitCode}</strong>. Please take your sample now following the instructions, seal it in the return box, and post it the same day if possible.`) +
        button(`${APP_URL}/portal`, "View my timeline")
    ),
  }),

  receivedByLab: (kitCode: string) => ({
    subject: "Your sample has arrived at the lab",
    html: wrap(
      "Sample received by the lab",
      p(`Good news: your sample (kit <strong>${kitCode}</strong>) has been received by our partner laboratory and analysis will begin shortly. We'll let you know as soon as testing is complete.`) +
        button(`${APP_URL}/portal`, "View my timeline")
    ),
  }),

  labComplete: (kitCode: string) => ({
    subject: "Lab analysis complete, now with our clinical team",
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

  labSpecimenDelivered: (kitCode: string) => ({
    subject: `Specimen ${kitCode} delivered to you`,
    html: wrap(
      "Specimen delivered",
      p(`Royal Mail reports that specimen <strong>${kitCode}</strong> has been delivered to the laboratory. Please scan the QR code on the bag to confirm receipt and start the test.`) +
        button(`${APP_URL}/lab`, "Open lab portal")
    ),
  }),

  labWaitingSince: (kitCode: string) => ({
    subject: `Specimen ${kitCode} awaiting results`,
    html: wrap(
      "Specimen awaiting results",
      p(`Specimen <strong>${kitCode}</strong> was confirmed received but no result has been recorded yet.`) +
        button(`${APP_URL}/lab`, "Open lab portal")
    ),
  }),

  adminLabIssue: (kitCode: string, summary: string, reasons: string[], note?: string) => ({
    subject: `Lab problem on specimen ${kitCode}: ${summary}`,
    html: wrap(
      summary,
      p(`The laboratory has parked specimen <strong>${kitCode}</strong> as a problem:`) +
        `<ul style="font-size:15px;line-height:1.55;color:${MIDNIGHT};margin:0 0 12px 20px;padding:0;">${reasons.map((r) => `<li>${r}</li>`).join("")}</ul>` +
        (note ? p(`Lab note: ${note}`) : "") +
        p("The customer has been told we are looking into a problem with their test. Decide what happens next from the kit's admin page: ask the lab to test again, or close the kit and arrange a replacement.") +
        button(`${APP_URL}/admin`, "Open admin")
    ),
  }),

  customerLabProblem: (kitCode: string) => ({
    subject: "A problem with your Utee test",
    html: wrap(
      "We're looking into a problem with your test",
      p(`We've hit a problem testing your sample (kit <strong>${kitCode}</strong>). This can happen when a sample is damaged in the post or a test needs repeating.`) +
        p("You don't need to do anything right now. The Utee team will be in touch shortly about what happens next.") +
        button(`${APP_URL}/portal`, "View my timeline")
    ),
  }),

  adminLabQuery: (kitCode: string, reasons: string[], note?: string) => ({
    subject: `Lab problem on specimen ${kitCode}`,
    html: wrap(
      "Test failed",
      p(`The laboratory recorded an invalid run for specimen <strong>${kitCode}</strong>:`) +
        `<ul style="font-size:15px;line-height:1.55;color:${MIDNIGHT};margin:0 0 12px 20px;padding:0;">${reasons.map((r) => `<li>${r}</li>`).join("")}</ul>` +
        (note ? p(`Lab note: ${note}`) : "") +
        button(`${APP_URL}/admin`, "Open admin")
    ),
  }),

  adminLabEscalation: (kitCode: string, note: string) => ({
    subject: `Note from the lab on specimen ${kitCode}`,
    html: wrap(
      "Note from the lab",
      p(`The laboratory has added a note on parked specimen <strong>${kitCode}</strong>:`) +
        p(`<em>${note}</em>`) +
        p("Decide whether the lab should test the sample again or the kit should be closed and a replacement arranged, then update the kit from the admin page.") +
        button(`${APP_URL}/admin`, "Open admin")
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

  clinicResultsAmended: (kitCode: string) => ({
    subject: `Lab results amended for case ${kitCode}`,
    html: wrap(
      "Lab results amended",
      p(`The laboratory has corrected the results for specimen <strong>${kitCode}</strong> before you picked the case up. Please review the case again before writing the report.`) +
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
