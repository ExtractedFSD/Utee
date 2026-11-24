# Utee portal: product map

Written from the live app at portal.myutee.co.uk, browsed as the demo patient (Olivia Bennett) at 390px and 1440px on 24 November 2026. Screenshots: `docs/ux/screenshots/round-0/{phone,desktop}/`.

## What the system is

Utee sells a home urine test kit for urinary tract infections (UTIs). The portal is the patient's side of that service and, inside it, the **UTI Passport**: a private, patient-kept record of every UTI, antibiotic, test result, scan, supplement and daily check-in, which can be shown to a GP or clinic as a read-only copy or a PDF.

Who uses it:

- **Patients** (customers), mostly women with recurrent UTIs, often in pain, anxious, tired, on a phone. They arrive from a Shopify order email, a QR code on the kit box, or a reminder email.
- **Clinicians** a patient chooses to share with (GP, A&E, urology clinic). They open a share code at `/passport` and see a read-only summary; they do not need an account.
- Internal roles (lab, clinic, fulfilment, admin) have their own areas under `/lab`, `/clinic`, `/fulfilment`, `/admin`. They are out of scope for this review except where the patient journey touches them (the report arriving on the kit page).

How the Passport fits: the test kit journey (buy, scan, symptoms, post sample, result) feeds the Passport automatically, and the Passport stands on its own for people who never buy a kit. The portal home shows both.

## Screens

### Public (no sign-in)

| Screen | URL | Purpose | Leads to |
|---|---|---|---|
| Sign in | `/login` | One card, three steps: email, then (new accounts only) name and date of birth, then an 8-digit code from email. Kit-aware when arrived from a QR scan. | `/portal`, or the page in `?next=` (triage form, kit page) |
| Enter kit code | `/start` | For people who cannot scan the QR: type the code printed under it. Validates format locally. | `/k/{code}` then sign in |
| Open a shared Passport | `/passport` | Clinician enters a 12-character share code (`XXXX-XXXX-XXXX`). | `/passport/{code}` |
| Shared Passport | `/passport/{code}` | Read-only summary for a clinician: In brief strip, disease burden, antibiotic history, cultures and investigations with source pills and verify buttons (when signed in as a clinician), collapsed timeline, PDF link. | PDF at `/passport/{code}/pdf` |
| Pass-on decision | `/kits/transfer/{token}` | From an email: approve or decline giving a kit to someone who scanned it. | Done page |

### Portal (signed in)

Top bar on every portal page: Utee logo, Home, UTI Passport, Orders, Subscriptions, Sign out. On the phone the tabs scroll sideways.

| Screen | URL | Purpose | Leads to |
|---|---|---|---|
| Portal home | `/portal` | "Welcome back." Passport hero (state-aware: new, open UTI, between UTIs), Your test kits (two most recent, stage pills), Recent orders, Subscriptions, From Utee row (urologist appointment, supplements, community). Notices for kit scan outcomes. | Passport, kit page, All kits, orders |
| All kits | `/portal/tests` | Every kit, in progress first, closed under Past tests. | Kit page |
| Kit page | `/portal/tests/{kitId}` | One test's journey: Has your kit arrived? / Complete symptom form callout; return postage; Your report is ready; timeline; delivery and return tracking; pass this kit on; submitted symptoms. | Symptom form, report PDF, pass-on page |
| Pass this kit on | `/portal/tests/{kitId}/pass-on` | Give an unused kit to another adult (email or code). | Portal home with notice |
| Symptom form | `/triage/{code}` | Five steps before taking the sample: who the test is for, safety questions, history, antibiotics, symptoms with severity. | Kit page |
| Orders | `/portal/orders`, `/portal/orders/{id}` | Shopify order history. | Order detail |
| Subscriptions | `/portal/subscriptions` | Recharge subscriptions (empty state links to the shop). | Shop |

### UTI Passport (signed in, consent given)

Passport pages share a second navigation: on the phone a bottom bar (Today, History, Record, Share, Una); on desktop the same five as pills under the top bar. Una is a chat sheet that slides up over any page.

| Screen | URL | Purpose | Leads to |
|---|---|---|---|
| Consent | `/portal/passport/consent` | First visit only: what the Passport stores and the two consents (Passport, optional research). | Guided setup |
| Guided setup | `/portal/passport/setup` | Una asks about menopause, contraception, pregnancy, then what you take, then past UTIs one message at a time. "Prefer a form?" link. | Today |
| Add UTIs quickly | `/portal/passport/setup?mode=utis` | Same chat, past UTIs only. | Today |
| Today | `/portal/passport` | Home of the Passport. Hero: open UTI (days in, feeling, symptoms today) or between UTIs (days since, recent result) with Log a UTI; diary half with five faces, streak, Add a note, See my diary. Below: At a glance, What I'm taking, Last 12 months, My patterns. Settings link. | Log, diary, record, history, settings |
| Log a UTI | `/portal/passport/log` | One form: when it started, what you notice (symptom chips), triggers, treatment, test. | Today or episode |
| UTI (episode) | `/portal/passport/episodes/{id}` | One UTI in full, edit or end it, add treatment, test, check-ins. | History |
| History | `/portal/passport/history` | Three views as pills: UTIs (cards per episode), Everything (timeline by month), Day by day (last 30 days grid plus daily entries). `?view=days` is the diary. | Episode, day sheet |
| Record | `/portal/passport/record?tab=` | Four tabs: About you (three steps: about you, UTI history, contact and hospital), Results (cultures with S/I/R), Investigations (scans, bloods, camera tests), Taking (supplements, medicines, habits, stopped). Each has an Add button and Edit links. | Add/edit forms as sheets |
| Share | `/portal/passport/share` | Download PDF; New share code (who for, how long, consent tick); active codes with QR, copy link, full screen, revoke. | Shared Passport |
| Settings | `/portal/passport/settings` | Reminders (daily while a UTI is open, monthly nudge), Una AI on/off, Download my data (FHIR), consents, Delete my passport data. | Consent |
| Una sheet | any passport page | Chat sheet over the page: same guided conversation for quick logging, with AI on/off pill. | Saves into the record |

Older addresses redirect: `/portal/passport/cultures`, `/investigations`, `/prevention`, `/about-me`, `/timeline`, `/diary` go to the matching Record tab or History view. `/portal/tracker/*` redirects to `/portal/passport/*`.

## How people move between screens

1. **From an email or QR**: scan → `/k/{code}` → sign in → symptom form (kit in hand) or portal home with a notice (kit not theirs, ask to pass on).
2. **Sign in from nowhere**: `/login` → portal home → "UTI Passport" top tab → consent (first time) → guided setup → Today.
3. **Inside the Passport**: bottom bar on the phone, pills on desktop. Today is the hub; History and Record are reference; Share is the output; Una is the shortcut for typing instead of tapping.
4. **Back out**: breadcrumbs ("Today", "Portal") on sub-pages; browser back; the top bar's Home.

## Top tasks a real user comes to do

1. **Create my Passport for the first time** (consent, say who I am, add my past UTIs, see Today make sense).
2. **Log a new infection fast while I feel terrible** (Log a UTI from Today or the portal home, three or four taps, symptoms and when it started).
3. **Tell the Passport how I am today** (tap a face, add a note, keep the streak, see the UTI's day count).
4. **End a UTI and say what worked** (close the open UTI, record the antibiotic and whether it helped).
5. **Add a result** (a culture from the GP with sensitivities, a home dipstick, or see my Utee result arrive).
6. **Add a scan or blood test** (investigation with date, normal or not, numbers).
7. **Record what I take to prevent UTIs** and mark whether it helps or that I stopped it.
8. **Find my history** before an appointment (how many this year, which antibiotics, what the lab grew).
9. **Share my Passport with a GP, A&E or clinic** (make a code, show the QR or hand over the PDF; the clinician opens it on their screen).
10. **Fix a mistake** (edit a UTI's dates, a treatment, a result; delete something added by accident).
11. **Sign back in on another device** (email, 8-digit code, land where I was).
12. **Use my test kit** (confirm it arrived, fill the symptom form, get return postage, read the report).

## Personas used in testing

- **First-timer**: never seen it; arrives at `/portal` after signing in; must understand what the Passport is and what to do first within ten seconds.
- **Mid-infection returner**: knows the app, in pain, wants Log a UTI or a face tap done in under a minute, one-handed.
- **Showing a GP**: in a consulting room, needs the share code or QR in two taps, and the clinician's view must read at a glance.

## Awkward paths to test every round

Empty states (no UTIs, no results, no kits, no codes), wrong input (bad code, future date, end before start, blank required), very long text (notes, antibiotic names, organism lists), going back mid-form, refreshing mid-chat and mid-form, slow connection (loading states), sign-in code expired or mistyped, a shared code that has expired.
