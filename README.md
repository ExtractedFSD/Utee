# Utee Portal

Customer, lab, clinic and admin portal for Utee's UTI test kits and supplement
subscriptions. Built with Next.js (App Router) + Supabase, integrating with
Shopify (orders), Recharge (subscriptions), Resend (email) and Royal Mail
tracking.

## The journey

1. **Order** — Shopify fires `orders/create` → `/api/webhooks/shopify`. A portal
   account is auto-created for the customer (passwordless: they sign in with a
   one-time email code) and a welcome email is sent.
2. **Fulfilment** — A super admin generates kit codes in batches
   (`/admin/kits/batches`): random, 7 characters plus a check character from
   the Crockford alphabet (no I, L, O or U), stored as `7K4M92QX`, printed as
   `UT-7K4M-92QX`, unique across every batch. The batch downloads as a CSV
   (`sequence, kit_code_display, qr_url`) for the label printer; marking it
   "sent to printer" turns its codes into usable stock, and a spoiled label
   set can be voided. At packing time an admin links a printed kit to the
   order (orders without a kit, searchable) and enters both Royal Mail
   tracking numbers. The patient gets a dispatch email reiterating: *scan
   the QR before taking your sample*. Code rules live in
   `src/lib/kit-code.ts`; entry accepts any spelling (case, dashes, the UT
   prefix, I/L for 1 and O for 0) and rejects a wrong check character.
3. **Activation** — The patient scans the QR (`/k/{code}`), or types the code
   at `/start` if they have no phone to scan with, signs in, completes
   the symptom (triage) form and ticks consent, then takes the sample and posts
   it in the freepost return box. The form is four steps, defined in
   `src/lib/triage/questions.ts`: a safety check (eight yes/no warning signs;
   any "yes" shows an urgent-care screen with a call-111 button before the
   patient can continue); UTI history (had a UTI before, and if so episode
   counts for 6 and 12 months plus past antibiotics from the tracker's
   searchable list, each with whether it worked, or "I don't know" on its
   own); symptoms as tick-all-that-apply with the change over the past
   24 hours (-5 to +5), duration and pregnancy; then notes, consent and the
   optional research consent. Answers are saved as one JSON document
   (`triage_submissions.symptoms`, `version: 3`; the summary component still
   renders the earlier shapes); the clinic case page shows every answer and
   any safety flags.
4. **Transit** — With `TRACKING_PROVIDER=trackship`, both tracking numbers
   are registered with TrackShip at dispatch (`src/lib/trackship.ts`) and
   its status webhooks land at `/api/webhooks/trackship`, authenticated by
   the API key TrackShip echoes in its `trackship-api-key` header (set the
   URL under "Connect a Store" > "Tracking API App"; the App Name there is
   `TRACKSHIP_APP_NAME`). Scan times arrive without a zone and are read as
   Europe/London. Admins can pull the latest state with "Refresh from
   TrackShip" on the kit page. The generic `/api/webhooks/tracking` shape
   still works for any other carrier feed. Events appear on the customer's timeline for both
   directions, and the lab is emailed when the return parcel is delivered.
5. **Lab** — The lab scans the QR on the bag → sees the *specimen number only*
   (never patient identity), confirms receipt (which returns them to the
   queue so a batch can be scanned in) and later records the Lodestar UTI
   Test sheet (`src/lib/lab-sheet.ts`): six uropathogens ticked if positive
   (several at once is common), plus the positive and negative controls,
   both of which must have passed, and an error tick. A valid run goes to
   the clinic as positive or negative. The first invalid run is kept on the
   result and the sheet is offered again, with nothing said to the
   customer. A second invalid run, or a sample that arrives unusable
   (leaked, empty, damaged tube or packaging, or something else with a
   note), creates a `lab_issues` row, parks the kit in `lab_query` (the
   lab's "Error queue"), emails `ADMIN_NOTIFICATION_EMAIL`, and tells the
   customer "We're looking into a problem with your test". Utee resolves it
   from the admin kit page: ask the lab to test again, or close the kit
   and arrange a replacement. The lab can add a note for Utee at any time.
6. **Clinic** — Clinic is notified, marks the case received, reviews symptoms +
   lab results, and publishes the final patient report (PDF).
7. **Report** — Customer is emailed, sees "report ready" on their timeline, and
   downloads/prints the PDF for their GP. Upsells (urologist appointment,
   supplements) are shown in the portal.

Every transition appends to an append-only `kit_events` audit log and fans out
email notifications to the right party. Every email sent is recorded in
`email_log` (recipient, subject, template, Resend id, status); super admins
see it per kit on the admin kit page and across the board at `/admin/emails`,
and Resend's delivery webhook (`/api/webhooks/resend`, signed with
`RESEND_WEBHOOK_SECRET`) updates each row to delivered or bounced.

### Kits sold outside the Utee store (retail / other marketplaces)

Kits that never go through Shopify come from the same batches. At packing time
the admin uses "Prepare a retail kit" (`/admin/kits`) to record the tracking number
of the pre-paid return label packed with it, instead of dispatching it against
an order. The kit stays in the `printed` state, marked *retail* in the stock
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
   Then set the **Magic Link** email template (Authentication → Emails) to
   the contents of `supabase/templates/magic-link.html`, with the subject
   "Your Utee sign-in code". It is styled like the portal's own emails and
   carries both the code and a link that works from any browser (the link
   goes through `/auth/confirm`, which verifies the token hash server-side
   and sets the session cookies, so it does not depend on the browser that
   asked for it).

   Set the Site URL to the portal's public URL and add
   `https://<portal-domain>/**` to the redirect allow list so `redirect_to`
   can carry the page the patient was heading for. The login page keeps the
   code step through a reload and offers "Send a new code", so a patient who
   comes back from their mail app is never asked to start again.
2. **Env** — copy `.env.example` to `.env.local` and fill everything in.
3. **Install & run** — `npm install && npm run dev`.
4. **Staff users** —
   `node scripts/create-staff-user.mjs lab@yourlab.com lab "Partner Lab"`
   (likewise for `clinic`, `fulfilment`, `admin`, `super_admin`). Staff log
   in at `/login` with a one-time email code, same as customers. A
   `fulfilment` user lands on `/fulfilment`: the dispatch and retail tools
   and the stock list, with no access to patients, results or reports.
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
2. As super admin: generate a kit batch, download the CSV, mark it as sent to
   the printer. As admin: dispatch a kit against the order.
3. As admin (kit page): simulate "outbound delivered".
4. As the customer: visit `/k/XXXXXXXX` (the QR URL), fill in triage + consent.
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
  list. Generate batches after that so the CSV carries the right URL.
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

## UTI tracker

A private diary of UTIs inside the patient portal (`/portal/tracker`), open to
anyone with an account, not only test buyers. It records what the user logs
and reflects it back as plain counts. It never diagnoses, scores risk,
recommends treatment or mentions products; all wording that could be read
that way lives in `src/lib/tracker/copy.ts` for compliance review.

**Guided setup.** After consent, `/portal/tracker/setup` runs a scripted
conversation (about you, what you take, then UTIs) where people type in their
own words or tap the options. Every assistant line comes from the copy file;
nothing is generated. A typed answer is read into form fields by
`src/lib/tracker/guided/extract.ts`: with `ANTHROPIC_API_KEY` set it uses the
Anthropic API with a fixed schema (`guided/schema.ts`), otherwise the
rule-based reader in `guided/local.ts`. The person always reviews the filled
chips before Next or Save. After reading a UTI the chat asks, in turn, only for
what is still missing (has it ended, any antibiotic, did it help, any test),
each answerable by a chip or in words. `?mode=utis` ("Add UTIs quickly") skips
straight to UTIs, and several UTIs in one message become one review card each;
`?mode=prevention` ("Update by chat") reads what has started and stopped and
updates the prevention list. Each quick mode offers the other before finishing.

**Una.** The helper is called Una (`copy.guided.name`). She sits as a bubble in
the corner of every tracker page (`tracker/layout.tsx`, `components/ChatBubble.tsx`)
once a person is set up, and reads free-form messages: a UTI, a change in what
they take, or both in one message (`guided/schema.ts` freeSchema). She also
asks two data-driven questions, still from fixed copy: whether something on the
list for three weeks or more is helping, and, when an antibiotic-type
prevention is active, whether they were still taking it when a new UTI started.
The monthly reminder email links to "Update by chat". Every conversation is
kept in `tracker_chats` (migration `0006_chats.sql`, owner-only RLS) so it can
be reopened from the bubble's History view and continued. The chat is
plain language: Una asks one question at a time and the person answers in
words (dates like "last Tuesday", symptoms, antibiotic names, "yes" or "save"
for decisions). A few decision chips (Save, Change something, yes/no) remain.
AI reading can be switched off per person in tracker Settings
(`tracker_profiles.una_ai`, migration `0007_una_ai.sql`); the chat shows a
one-line caveat either way. Entry points are labelled "Talk to Una".

**Prevention.** "What I'm taking" (`/portal/tracker/prevention`, table
`tracker_preventions`, migration `0005_prevention.sql`) records everything a
person takes to help prevent UTIs: prescribed medicines, hormonal options,
vaccines, supplements, creams and sprays, searchable (brands and spellings
included) and multi-select from the list in `src/lib/tracker/prevention.ts`.
Retired options stay in `RETIRED_OPTIONS` so old rows still read well. Each item keeps a start and stop date and a
self-rating ("Is it helping?"), so the history and what people feel works are
kept. It is asked on "About you", shown as coloured pills on the dashboard, and
included in the GP summary and exports.

**Data.** Nine `tracker_*` tables (`supabase/migrations/0003_tracker.sql`),
every row keyed by `user_id` with owner-only row-level security. The app
reads and writes them with the user's own session only (`src/lib/tracker/data.ts`).
Consent (tracker, and optional research) is stored with the wording and its
version. The antibiotic picklist is `src/lib/tracker/antibiotics.json`,
editable without code changes; entries are stored by `id`, never as typed
text, and there is an empty `dmd_code` for later NHS mapping.

**What leaves the portal.** Nothing. Tracker pages make requests only to the
portal itself and to the Supabase project (London region, encrypted at
rest, under DPA). There is no analytics, pixel or Klaviyo integration in the
portal. `e2e/tracker.spec.ts` records every network request during a full
tracker session and fails if any other host appears.

**Service-role access to tracker tables** is limited to two places, both
aggregate or metadata only: the super-admin dashboard counts consents and
episodes, and the reminder job reads who opted in, whether they have an
open episode and when they were last reminded. No staff screen shows an
individual's entries.

**Audit.** `tracker_audit_log` records consent changes, exports, summary
downloads, deletes and reminders sent. Page views are not logged.

**Export and delete.** Settings offers JSON and CSV exports and a hard delete
of everything (episodes cascade to symptoms, triggers, treatments, tests;
plus check-ins, consents and profile). The audit row for the delete survives.

**Reminders.** Opt-in, sent by the portal through Resend from a daily Vercel
Cron job (`vercel.json`, `/api/cron/tracker-reminders`, protected by
`CRON_SECRET`). Subject lines and bodies never mention symptoms or UTIs.

**GP summary.** `/portal/tracker/summary` renders a one-page PDF server-side
(`src/lib/tracker/pdf.tsx`). Utee tests linked to an episode show their
status and "clinical report available in the portal"; the lab outcome is
never shown, matching the rest of the portal.

**Tests.** `npm run test:unit` covers red flags, antibiotic search, stats and
copy rules. `npm run test:e2e` walks the whole tracker on a phone-sized
viewport, checks export, delete, the PDF, cross-user isolation and the
third-party network rule.

## Not in v1 (deliberate)

- Urologist booking — upsell card is a "coming soon" placeholder.
- Supplements upsell links to the Shopify store (`NEXT_PUBLIC_SHOPIFY_STORE_URL`).
- Royal Mail API polling — events are ingested via webhook/aggregator instead.

## Compliance notes (please review with your clinical adviser)

Symptoms + lab results are special-category health data under UK GDPR: host the
Supabase project in a UK/EU region, sign DPAs with Supabase/Resend/Recharge,
add a privacy notice + retention policy, and keep the consent text
(`triage_submissions.consent_text`) versioned if it changes. The portal records
consent with a timestamp at triage time. The questionnaire also offers an
optional research consent (`research_consent`, with the wording shown saved
in `research_consent_text`), separate from the consent needed to run the
test; the clinic case page shows whether it was given.
