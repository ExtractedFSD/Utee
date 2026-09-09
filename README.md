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

### Kits sold outside the Utee store (retail / other marketplaces)

Kits that never go through Shopify are printed as normal. At packing time the
admin uses "Prepare a retail kit" (`/admin/kits`) to record the tracking number
of the pre-paid return label packed with it, instead of dispatching it against
an order. The kit stays in the `created` state, marked *retail* in the stock
list, and the customer registers it themselves:

1. They scan the QR and land on `/login` with the kit remembered.
2. If their email already has a portal account they just sign in. If not, the
   login form creates a customer account for them — this is the only
   self-service signup, and it only works while holding the QR of an unclaimed
   kit (`src/app/login/actions.ts`).
3. On return to `/k/{code}` the kit is claimed for their account
   (`src/lib/kits.ts`): it jumps straight to `delivered`, a "Kit linked to your
   account" event is logged, and they're sent to the symptom form. From there
   the lab → clinic → report journey is identical to a store kit.

A store kit can never be claimed by a stranger: it is assigned to its buyer at
dispatch, and scanning someone else's kit only ever shows "not yours".
Retail kits have no outbound shipment, but their return label is tracked like
a store kit's, so the customer sees "Sample on its way to the lab" and the lab
is notified when Royal Mail accepts the parcel.

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

1. **Supabase** — create a project, then run each file in
   `supabase/migrations/` in order in the SQL editor (`0001_init.sql` creates
   schema, RLS, storage buckets, the auth→profile trigger; later files are
   incremental). In Auth settings, enable the **Email** provider and
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

## Testing end to end

### Making the QR codes scannable

The QR on every label encodes `NEXT_PUBLIC_APP_URL/k/{code}`, so a phone can
only follow it if that URL is reachable from the phone:

- **Deployed** (Vercel or similar): set `NEXT_PUBLIC_APP_URL` to the public
  URL, and in Supabase → Authentication → URL Configuration set the Site URL
  to the same value and add `https://your-domain/**` to the redirect allow
  list. Print labels from `/admin/kits/print` after that so they carry the
  right URL.
- **Local dev on a phone**: run `npm run dev` and expose port 3000 with a
  tunnel (`npx localtunnel --port 3000`, `ngrok http 3000`, or
  `cloudflared tunnel --url http://localhost:3000`). Put the tunnel URL in
  `NEXT_PUBLIC_APP_URL`, restart the dev server, and reprint the labels. With
  `TRACKING_PROVIDER=mock` the admin kit page gains "simulate carrier scan"
  buttons, so the whole journey can be walked from a phone and a laptop
  without Shopify or Royal Mail.

### Automated journeys (Playwright)

`npm run test:e2e` drives the real UI in Chromium against a running portal
and the Supabase project in `.env.local`:

- `e2e/store-journey.spec.ts` — signed Shopify webhook → account + order →
  admin prints and dispatches → outbound delivery scan → customer scans the
  QR, signs in through the login page, submits symptoms → return scan (with a
  BST offset timestamp, as Royal Mail sends) → lab receives and uploads
  results → clinic publishes the report → customer downloads the PDF. Along
  the way it checks the lab never sees identity or symptoms, the customer can
  never read `lab_results`, other customers and roles are kept out, and a
  super-admin rollback deletes the published PDF.
- `e2e/retail-journey.spec.ts` — admin attaches a return label to an
  unassigned kit, a buyer with no account scans it, gets an account from the
  login page, claims the kit, submits symptoms, and the return scan + lab
  receipt follow as for a store kit.
- `e2e/pressure.spec.ts` — bad webhook signatures, unhandled Shopify topics,
  retried webhooks, malformed and offset timestamps, unknown parcels, reused
  and identical tracking numbers, three people racing to claim one kit, and
  replayed carrier events.

Setup once: `npx playwright install chromium`. Then, with `.env.local`
filled in (Supabase keys plus `SHOPIFY_WEBHOOK_SECRET` and
`TRACKING_WEBHOOK_SECRET` — the tests sign requests with the same values the
app verifies against):

```
npm run dev            # or point E2E_BASE_URL at a deployed portal
npm run test:e2e       # add --headed to watch it
```

Everything the suite creates uses `@e2e.invalid` email addresses and is
deleted when the run finishes; set `E2E_KEEP=1` to keep it for inspection.
No emails are sent: one-time codes are minted server-side and the login
page's send-code request is stubbed. Because the suite writes to the
Supabase project in `.env.local`, point it at a staging project rather than
production.

### Load (`npm run test:load`)

`node scripts/load-test.mjs --url http://localhost:3000 --concurrency 20 --seconds 15`
hammers the login page, the QR landing and the tracking webhook (valid and
invalid secret) and prints req/s and p50/p95/p99 latency per target. It
writes nothing: the parcel it reports doesn't exist. Run it against a
production build (`npm run build && npm start`) for meaningful numbers — the
dev server compiles on demand and is many times slower.

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
