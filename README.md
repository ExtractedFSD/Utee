# Utee Portal

Customer, lab, clinic and admin portal for Utee's UTI test kits and supplement
subscriptions. Built with Next.js (App Router) + Supabase, integrating with
Shopify (orders), Recharge (subscriptions), Resend (email) and Royal Mail
tracking.

## The journey

1. **Order** — Shopify fires `orders/create` → `/api/webhooks/shopify`. A portal
   account is auto-created for the customer (passwordless: they sign in with a
   one-time email code) and a welcome email is sent.
2. **Fulfilment** — Admin creates pre-printed QR kit labels (`/admin/kits` →
   "Print labels"), then at packing time links a kit code to the order and
   enters both Royal Mail tracking numbers. The patient gets a dispatch email
   reiterating: *scan the QR before taking your sample*.
3. **Activation** — The patient scans the QR (`/k/{code}`), signs in, completes
   the symptom (triage) form and ticks consent, then takes the sample and posts
   it in the freepost return box.
4. **Transit** — Royal Mail tracking events arrive at `/api/webhooks/tracking`
   and appear on the customer's timeline for both directions.
5. **Lab** — The lab scans the QR on the pot → sees the *specimen number only*
   (never patient identity), confirms receipt, runs the test, and uploads
   structured results + optional PDF. Customer sees "received" / "analysis
   complete" but never raw results.
6. **Clinic** — Clinic is notified, marks the case received, reviews symptoms +
   lab results, and publishes the final patient report (PDF).
7. **Report** — Customer is emailed, sees "report ready" on their timeline, and
   downloads/prints the PDF for their GP. Upsells (urologist appointment,
   supplements) are shown in the portal.

Every transition appends to an append-only `kit_events` audit log and fans out
email notifications to the right party.

## Areas & roles

| Area | Path | Who | Sees |
|---|---|---|---|
| Patient portal | `/portal` | `customer` | Own orders, live tracking timeline, submitted symptoms, final report, subscription skip/delay/cancel, upsells |
| Lab | `/lab` | `lab` | Specimen codes + lab state only — no patient identity or symptoms |
| Clinic | `/clinic` | `clinic` | Symptoms + lab results, uploads final report |
| Admin | `/admin` | `admin` | Pipeline of all kits, patient deep-dives, kit fulfilment & QR printing, lab/clinic views |
| Dashboard | `/admin/dashboard` | `super_admin` | Customers, revenue, stage funnel, active subscriptions |

Customers' reads go through Supabase RLS (they can only ever select their own
rows; `lab_results` has **no** customer policy at all). Staff areas use the
service role behind explicit role checks (`src/lib/auth.ts`).

## Setup

1. **Supabase** — create a project, then run `supabase/migrations/0001_init.sql`
   in the SQL editor (creates schema, RLS, storage buckets, the
   auth→profile trigger). In Auth settings, enable the **Email** provider and
   turn OFF "Confirm email" double opt-in for OTP logins to work smoothly.
2. **Env** — copy `.env.example` to `.env.local` and fill everything in.
3. **Install & run** — `npm install && npm run dev`.
4. **Staff users** —
   `node scripts/create-staff-user.mjs lab@yourlab.com lab "Partner Lab"`
   (likewise for `clinic`, `admin`, `super_admin`). Staff log in at `/login`
   with a one-time email code, same as customers.
5. **Shopify webhooks** — Settings → Notifications → Webhooks: add
   `orders/create` and `orders/updated` → `https://your-domain/api/webhooks/shopify`
   (JSON). Put the shown signing secret in `SHOPIFY_WEBHOOK_SECRET`. Set
   `TEST_KIT_SKUS` to your test-kit SKU(s).
6. **Recharge** — create an API token (read subscriptions/charges, write
   subscriptions) → `RECHARGE_API_TOKEN`. Register webhooks
   `subscription/created|updated|cancelled` → `/api/webhooks/recharge`, and put
   the webhook client secret in `RECHARGE_WEBHOOK_SECRET` — the endpoint
   rejects any post that isn't signed with it.
7. **Resend** — verify your sending domain, set `RESEND_API_KEY` and
   `EMAIL_FROM`. `LAB_NOTIFICATION_EMAIL` / `CLINIC_NOTIFICATION_EMAIL` receive
   the operational notifications.
8. **Tracking** — for go-live, point Royal Mail Tracking API push notifications
   (or AfterShip mapped to the payload in
   `src/app/api/webhooks/tracking/route.ts`) at `/api/webhooks/tracking` with
   the `X-Tracking-Secret` header. For local dev keep `TRACKING_PROVIDER=mock`,
   which adds "simulate carrier scan" buttons on the admin kit page so you can
   demo the entire journey end-to-end.

## Demo walkthrough (no integrations needed)

With only Supabase configured and `TRACKING_PROVIDER=mock`:

1. Create a customer: `node scripts/create-staff-user.mjs you+patient@x.com customer "Pat Test"`,
   then insert a test order for them (or POST a sample payload to the Shopify
   webhook with HMAC disabled locally).
2. As admin: create a kit batch, print labels, dispatch a kit against the order.
3. As admin (kit page): simulate "outbound delivered".
4. As the customer: visit `/k/UT-XXXXXX` (the QR URL), fill in triage + consent.
5. As admin: simulate "return in transit".
6. As lab: open the specimen, confirm receipt, upload results.
7. As clinic: mark received, upload the final report PDF.
8. As the customer: watch the timeline update at every step and download the
   report. As super admin: see the funnel move on `/admin/dashboard`.

## Not in v1 (deliberate)

- Urologist booking — upsell card is a "coming soon" placeholder.
- Supplements upsell links to the Shopify store (`NEXT_PUBLIC_SHOPIFY_STORE_URL`).
- Royal Mail API polling — events are ingested via webhook/aggregator instead.

## Compliance notes (please review with your clinical adviser)

Symptoms + lab results are special-category health data under UK GDPR: host the
Supabase project in a UK/EU region, sign DPAs with Supabase/Resend/Recharge,
add a privacy notice + retention policy, and keep the consent text
(`triage_submissions.consent_text`) versioned if it changes. The portal records
consent with a timestamp at triage time.
