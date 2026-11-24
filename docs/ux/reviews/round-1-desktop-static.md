# Round 1 review: desktop, static screenshots (1440px)

Reviewer: independent UX review, judged only from `docs/ux/rubric.md`, `docs/ux/product-map.md` and the 32 files in `docs/ux/screenshots/round-0/desktop/`. No source code, no live app, no hover, keyboard or screen-reader checks. Viewport 1440 by 900; captures are full page.

Material notes before scoring:

- `consent.jpg` is identical to `today.jpg` (the demo account has already consented, so `/portal/passport/consent` redirected). The consent screen is not reviewed.
- `record-about-step1.jpg` and `una-sheet.jpg` are contact sheets of thumbnails of the other captures, not screens. The About-you step 1 form and the Una chat sheet are not reviewed.
- `login-code.jpg` shows the email step with the address typed in, not the 8-digit code step. The code step is not reviewed.
- `about-me`, `cultures`, `investigations`, `prevention`, `diary` and `timeline` are byte-identical to their redirect targets (`record-about`, `record-results`, `record-investigations`, `record-taking`, `history-days`, `history-everything`). Redirects work (1.10 passes for these six); they are reviewed once under the target name.
- Screens never captured: episode page, order detail, pass this kit on, symptom form (triage), the shared Passport as a clinician sees it, any add/edit sheet, any loading or saving state, any empty Passport state, any error summary on a Passport form.

Personas held in mind: a first-time user arriving at `/portal`; a returning user mid-infection who wants Log a UTI done fast; someone showing their Passport to a GP on a laptop.

## 1. Score table

| Heading | Score | Justification |
|---|---|---|
| 1. Navigation and findability | 5 | Kit page has no way back; "show my Passport" is two taps from the portal home; revoke is behind an unlabeled "···"; link text "VIEW", "View all", "Browse"; Settings reachable only from Today; the top bar never marks the current section. |
| 2. Clarity of wording | 6 | Plain, calm English almost everywhere, but dates are never in NHS style, several buttons are bare verbs ("OPEN", "CONTINUE", "DOWNLOAD", "ADD SOMETHING"), codes reach the screen ("(-2)", ">10^5", "S / I / R", "JSON, CSV or FHIR"), and the kit page uses "urinate", "Episodes" and "doctor". |
| 3. Mobile layout | 6 (provisional) | Cannot be judged at 1440px. Provisional only, inferred from component sizes seen: 12 to 13px captions on most screens are under the 14px floor, symptom chips are about 40px tall. Replace with the phone review's score. |
| 4. Desktop layout | 5 | Three different content widths (1104, 768, 672px) across pages; on History, Record, Share and Settings the Passport nav sits at the 1104px edges while the content sits in a 672px column, leaving a misaligned, empty band on both sides; portal hero is one line of text in a 1104px band; Today has a 400px empty region bottom right; Orders row is stretched edge to edge. |
| 5. Forms and data entry | 6 | Log a UTI is a good form (Today, Yesterday, 2 days ago, Earlier; Same as last time; chips). But guided set-up asks a single-choice question as free text with no quick replies and no reason, hints sit under fields not labels, no "choose all that apply", Send is a disabled button, and no error summary pattern is seen. |
| 6. Feedback and states | 6 | Kit code error is inline, red, and says how to fix it; "not opened yet" and "Expires in 5 days" on Share are good; Subscriptions empty state is fine. No "There is a problem" summary, a disabled Send, "COMING SOON" cards that look clickable, and no loading, saving or Passport empty state was captured. |
| 7. First-time experience | 5 | Consent screen not captured. Guided set-up opens with a menopause question that gives no reason and has no skip; no help or contact route on any screen; the portal home surrounds the Passport with shop cards. "Prefer a form?" and "Skip for now" (on the UTIs step) are the right ideas. |
| 8. Accessibility | 5 | Meaning by colour alone in three places (Last 12 months grid, "Feeling" squares, toggles); 12 to 13px grey captions and the pale email on the gradient bar look under 4.5:1; icon-only "···"; "Tap" instructions on desktop; S/I/R chips do carry letters. Keyboard and focus not judged. |
| 9. Trust and tone | 6 | Calm copy, "This is your record, not advice", "Emails never mention symptoms", expiry and open status on shares are all good. But the user's own entries are tagged "PATIENT", shop and "COMING SOON" cards sit on the health home, a "streak" nudges an unwell person, and the urologist card promises a prescription. |
| 10. Consistency | 5 | Column widths, breadcrumbs (present on Tests, Log, Settings; absent on Kit page, Setup), "passport" vs "Passport", test/result/investigation naming, "Portal" vs "Home", Edit shown on Taking but not Results, LOG A UTI missing from the Day by day view, two unrelated things in the same white pill button style. |

## 2. Problems found

Severity per the rubric: critical (cannot complete, loses data, misled about record or who sees it), major (slowed, confused, has to guess, or a stated criterion fails on a primary screen), minor (polish).

### Global (every portal page, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| G1 | All Passport sub-pages (History, Record ×4, Share, Settings) | The Passport nav pills ("TODAY, HISTORY, RECORD, SHARE" left, "UNA" right) sit at x=168 and x=1272, the edges of a 1104px container, while the page content sits in a 672px column starting at x=384 (768px on History). The h1 is 216px to the right of the first pill and there is an empty 216px band each side of the content for the full page height. | 4.4, 4.5 | Major | Put the Passport nav and the page content in the same container. Either widen the Passport sub-pages to the Today width and use the space (see per-screen notes) or narrow the nav to the 672px column. |
| G2 | Portal home, Today, Kit, Orders, Subscriptions (1104px) vs Tests, Log, Record, Share, Settings, Setup (672px) vs History (768px) | Three different maximum content widths. Moving between Home, Tests and Kit the title jumps from x=168 to x=384 and back. | 4.4, 10.6 | Major | Pick one page width (about 960 to 1104px) for every page and one inner reading column (about 672px) for forms and text, always centred or always left-aligned within it. |
| G3 | All signed-in pages | The top bar tabs HOME, UTI PASSPORT, ORDERS, SUBSCRIPTIONS have no visible current state on any capture (not on Home, Orders, Subscriptions or any Passport page). | 1.1, 1.4 | Minor | Give the current top tab a visible state (underline or filled pill) matching the Passport nav's filled pill. |
| G4 | All signed-in pages | "dan+demo@extracted.co.uk" in the top bar is about 12px, pale pink on a pink-to-red gradient, and shows a raw email where the account has a name (Olivia Bennett). | 8.1, 3.3 | Minor | Show the first name, or the email at 14px or larger in white; move it into a menu if space is tight. |
| G5 | All pages | No help, contact, privacy or "how my data is used" link on any screen, including sign-in, Start, the shared Passport entry and the portal home. | 7.7, 10.7, 9.8 | Major | Add a small footer on every page with Help, Contact and Privacy in the same order, and the same three links under the sign-in card. |
| G6 | All pages | Every button and nav label is set in letter-spaced capitals ("CONTINUE WITH EMAIL", "LOG A UTI", "DOWNLOAD REPORT (PDF)", "SIGN OUT"). Acceptable only if the underlying text is sentence case. | 2.6 | Check | Confirm the markup is sentence case with `text-transform`; if the source text is capitals, change it. Consider dropping the transform on long labels ("SAVE AND GO TO TODAY") which are hard to read in caps. |
| G7 | Portal home, Tests, Kit, Orders, History, Record Results and Investigations | Dates are "6 Nov 2026", "15 Nov 2026, 09:30", "12 Nov 2026" everywhere. NHS style is "6 November 2026" and "9:30am". | 2.5, 10.4 | Minor (repeats on 9 screens) | One date formatter: day, month in full, year; times as "9:30am". Where space is tight (timeline rail, day grid) a short month is acceptable but the same everywhere. |
| G8 | Record About, Share, Settings, Setup, Setup-UTIs | "passport" is lower case in running text ("as they appear on your passport", "your passport PDF", "Delete my passport data", "Everything in your passport", "set up your passport") while headings and the nav say "UTI Passport". | 10.5 | Minor (repeats on 5 screens) | Capitalise "Passport" everywhere it means the product. |
| G9 | History (all views), Record (all tabs), Kit, Share, Setup | Secondary text (hints, footers, date rails, tracking numbers, "Una uses AI to read what you type", "S / I / R as reported by the lab") is about 12 to 13px in mid grey on pale pink. | 8.1, 3.3 | Minor (repeats) | Raise secondary text to 14px minimum and darken to pass 4.5:1 against #FCE4EF-ish backgrounds. |
| G10 | History UTIs, Record Results, Record Investigations | The user's own entries carry a pill reading "PATIENT". The user is "you", never "the patient". | 9.11, 2.3 | Major | Rename the source pill to "You added" / "Added by you" (and keep "UTEE LAB", "GP" and so on for other sources). |
| G11 | History UTIs ("Tap a UTI to open it."), History Day by day ("Tap any day to add or change it.") | "Tap" instructions on a desktop screen with a mouse. | 10.10, 2.x | Minor | Use "Select" or "Open", or make the affordance visible (chevron, link styling) so no instruction is needed. |

### Sign in (`/login`, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| L1 | Sign in | The card has no title. The only heading-like text is the tagline "Your UTI Passport, tests and orders." The page does not say "Sign in" anywhere. | 1.1, 7.1 | Minor | Add an h1 "Sign in or create your account" inside the card above the field. |
| L2 | Sign in | Hint "We'll email you a one-time code. No password, no account to create." sits under the field, not under the label and before the field. | 5.2, 2.8 | Minor | Move it under "Email address" and shorten: "We'll email you a code to sign in. No password needed". |
| L3 | Sign in | "no account to create" conflicts with the product map (new accounts are asked for name and date of birth next). | 2.x, 9.4 | Minor (wording only) | "No password needed" is enough. |
| L4 | Sign in | No route from here to "Open a shared Passport" or "Enter a kit code". A clinician or a kit-in-hand user who lands on `/login` has nowhere to go. | 1.3, 1.5 | Minor | Two links under the card: "Have a kit code?" and "Clinician with a share code?". |
| L5 | Sign in | The email field border is pink-red on the unfocused capture (compare the grey border on the share-code field), which reads as an error state before anything has happened. | 9.10, 10.3 | Minor | Use the grey border by default and the brand colour only for focus, red only for errors. |
| L6 | Sign in | "CONTINUE WITH EMAIL" is 14 characters of caps on a 336px button; fine, but the next step (code) was not captured so paste, resend and expiry behaviour cannot be judged. | 5.9 | Check | Capture the code step next round. |

### Enter kit code (`/start`, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| S1 | Start | Hint "Dashes and capitals don't matter." is under the field with a full stop; should be under the label "Kit code" without one. | 5.2, 2.8 | Minor | Move it under the label: "Dashes and capitals don't matter". |
| S2 | Start | Button "CONTINUE" does not say what happens (you go to sign in). | 2.7 | Minor | "Continue to sign in" or "Find my kit". |
| S3 | Start | Footer "You'll be asked to sign in or create an account first, then taken to your questionnaire." is about 12px, centred, and "questionnaire" is a new word for the "symptom form". | 8.1, 10.5 | Minor | 14px, left aligned, "then taken to your symptom form". |
| S4 | Start | The placeholder "UT - XXXX - XXXX" is spaced differently from the error example "UT-7K4M-92QX" and the typed value "UT - XXXX". | 10.4 | Minor | One mask format in placeholder, example and formatted value. |

### Enter kit code, error (`/start`, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| SE1 | Start error | Error text is red and says how to fix it (good), but there is no "There is a problem" summary, no visible "Error:" prefix, and the field border is the same pink as the focus state rather than clearly red. | 6.4, 6.5 | Minor | Even on a one-field form: red left border on the message, a thicker red field border, hidden "Error:" prefix, and the browser title starting "Error:". |
| SE2 | Start error | Message is three sentences (41 words): "That doesn't look like a Utee kit code. It has 8 letters and numbers, printed under the QR code like UT-7K4M-92QX. Check each character and try again." | 6.6, 2.1 | Minor | "Enter the 8-character kit code printed under the QR code, for example UT-7K4M-92QX". |

### Open a shared Passport (`/passport`, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| P1 | Open a shared Passport | Button "OPEN" is a bare verb. | 2.7 | Minor | "Open the Passport". |
| P2 | Open a shared Passport | "It is twelve letters and numbers" spells the number. | 2.5 | Minor | "It is 12 letters and numbers". |
| P3 | Open a shared Passport | No hint that dashes, spaces and lower case are accepted (the kit-code screen has one). Tolerance itself cannot be judged. | 5.11, 10.3 | Minor | Add "Dashes and capitals don't matter" under the label, matching Start. |
| P4 | Open a shared Passport | Tagline "UTI Passport, shared by the patient" and body "Enter the code the patient gave you". The audience here is a clinician, so third person is defensible, but it is the only place the word appears. | 9.11 | Minor (wording only, check with the owner) | "shared with you by the person it belongs to" or keep "patient" deliberately for the clinician audience and document the exception. |
| P5 | Open a shared Passport | Footer "On a phone, scanning the patient's QR code with the camera opens the passport straight away." is about 12px grey, and "passport" is lower case. | 8.1, 10.5 | Minor | 14px; "Passport". |
| P6 | Open a shared Passport | Share code field border is a light grey that looks under 3:1 against white. | 8.2 | Check | Darken field borders to at least #767676-equivalent. |

### Portal home (`/portal`, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| H1 | Portal home | "Show my Passport" / "Share" is not one tap away. The hero offers only "LOG A UTI"; to reach a share code the user goes UTI PASSPORT, then SHARE (two taps). For the GP persona on a laptop this is the task. | 1.3 | Major | Add a second control in the hero: "Share my Passport" (secondary style) next to "LOG A UTI". |
| H2 | Portal home | The Passport hero is a 1104 by 160px gradient band with one line of text and one button in the left 450px; the right 650px are empty. | 4.2, 4.4 | Major | Use the right half for the three At-a-glance numbers or the "How are you feeling today?" faces, as the Today hero already does, or halve the hero's width and sit "Your test kits" beside it. |
| H3 | Portal home | Kit row status "RESULT READY · VIEW" is a pill that is also the link; "VIEW" is banned link text and the whole row's clickability is not shown. | 1.5, 1.6 | Major | Make the pill a status only ("Result ready") and add a proper link "Read your report" or a chevron on the row. |
| H4 | Portal home | Links "View all", "Browse" and "All kits (1)" do not match their destinations' titles ("Your orders", "Your subscriptions", "Your test kits"). | 1.5 | Minor | "All orders", "Your subscriptions", "All test kits". |
| H5 | Portal home | The "From Utee" row puts three shop cards ("COMING SOON", "FROM £19.99", "SHOP SUPPLEMENTS") directly under the health record on the home page. Two "COMING SOON" cards look clickable but have nothing to do. | 9.10, 6.10, 7.8 | Major | Move marketing below a clear divider or to Orders/Subscriptions; remove or clearly mark non-actionable cards ("Not available yet"); never badge-style "COMING SOON". |
| H6 | Portal home | "SHOP SUPPLEMENTS" uses the same white pill style as the primary "LOG A UTI" in the hero: two primary-looking buttons on one screen. | 10.2 | Minor | Make shop calls to action text links or the secondary style. |
| H7 | Portal home | "Urinary Tract Care, made for people living with UTIs." is Title Case. | 2.6 | Minor | "Urinary tract care, made for people living with UTIs". |
| H8 | Portal home | Urologist card: "Where clinically appropriate, this may include a treatment plan and prescription." sits on the record's home page and reads as a clinical promise. | 9.7 | Wording only, check with the owner | Confirm the claim is one the service can stand behind; otherwise "to talk through your result and next steps". |
| H9 | Portal home | h1 "Welcome back" does not name the place; "YOUR PORTAL" eyebrow does the job in 12px caps. | 1.1 | Minor | h1 "Your portal" with "Welcome back, Olivia" as the lead line, or keep and accept. |
| H10 | Portal home | Kit heading "Kit UT-PDE5-SDFT" leads with a code, not a meaningful name. | 1.8 | Minor | "Test kit, started 6 November" with the code as secondary text. |

### All kits (`/portal/tests`, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| T1 | All kits | Breadcrumb says "Portal" while the top tab for the same page says "HOME". | 1.5, 10.1 | Minor | Use one word; "Home" matches the tab. |
| T2 | All kits | Link from the home page is "All kits (1)" but the page title is "Your test kits". | 1.5 | Minor | Match the two. |
| T3 | All kits | Same "RESULT READY · VIEW" pill-link as H3; no visible affordance on the card. | 1.5, 1.6 | Minor (counted in H3) | As H3. |
| T4 | All kits | 672px column in 1440 with one card; the page is 93 percent empty. With several kits this becomes a long narrow list. | 4.2 | Minor | Use the page width with two kit cards per row, in-progress first. |

### Kit page (`/portal/tests/{kitId}`, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| K1 | Kit page | No breadcrumb or back link. Tests, Log and Settings all have one; this sub-page does not. | 1.2 | Major | Add "‹ Your test kits" above the h1. |
| K2 | Kit page | "Your report is ready" appears three times above the fold: the green pill top right, the green callout heading, and the first timeline entry. | 1.1 | Minor | Keep the callout; drop the pill; shorten the timeline entry to "Report reviewed". |
| K3 | Kit page | "Download it to share with your GP or doctor." — "doctor" alongside "GP". | 10.5, 2.3 | Minor | "with your GP or clinic". |
| K4 | Kit page | "Past 24 hours: Worse (-2)" — "(-2)" is a raw score the user has to guess at. | 2.9 | Major | "Past 24 hours: worse" (drop the number) or explain it ("2 points worse"). |
| K5 | Kit page | "Episodes, past 6 months: 2 / Episodes, past 12 months: 4" — "episode" where the rest of the app says "UTI". | 10.5 | Minor | "UTIs in the past 6 months: 2". |
| K6 | Kit page | Symptom names "Needing to urinate more frequently than normal.", "Pain or burning sensation when you are urinating." use "urinate" and end in full stops; the Passport's Log form says "Peeing more often", "Burning when peeing". | 2.3, 10.5 | Minor | Reuse the Log form's symptom names on the kit page. |
| K7 | Kit page | Times are 24-hour ("09:30", "16:20", "07:14"). | 2.5 | Minor (counted in G7) | "9:30am". |
| K8 | Kit page | Tracking lines "Royal Mail · DEMO00001042GB" are about 12px light grey. | 8.1 | Minor (counted in G9) | 14px, darker. |
| K9 | Kit page | "Track on Royal Mail →" almost certainly opens a new tab or site without saying so. | 1.6 | Check | Add "(opens Royal Mail)" or an external-link icon with that accessible name. |
| K10 | Kit page | Timeline rail icons are pale pink on white (about 2:1). | 8.2 | Minor | Darken the icon circles or treat as decorative. |
| K11 | Kit page | Left "Timeline" card ends at y=1045 while the right column runs to y=1310, leaving a 265px empty region bottom left. | 4.4 | Minor | Let the symptoms card sit in the left column under the timeline, or make the layout two equal columns. |
| K12 | Kit page | "Your test kit has been dispatched" is passive; "Sent via Royal Mail Tracked" fine. | 2.4 | Minor | "We sent your test kit". |

### Orders (`/portal/orders`, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| O1 | Orders | One order row stretched across 1104px: "UT1042" at x=192, price at x=1247, nothing between. | 4.1 | Minor | Cap the list at about 720px or make it a table with product, date, status, total columns. |
| O2 | Orders | "FULFILLED" is Shopify's word. | 2.9, 2.3 | Minor | "Sent" or "Delivered". |
| O3 | Orders | No visible sign that the row opens an order detail page. | 1.6 | Minor | Chevron or "Order details" link. |
| O4 | Orders | Order date "6 Nov 2026" is about 12px grey. | 8.1 | Minor (counted in G9) | 14px. |

### Subscriptions (`/portal/subscriptions`, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| SU1 | Subscriptions | Intro "Skip a delivery, change the date, or cancel. No need to contact us." promises actions that do not exist in the empty state shown below it. | 6.3 | Minor | Show that intro only when there is a subscription. |
| SU2 | Subscriptions | Empty state card is 1104px wide with the text centred in the middle 500px. | 4.1 | Minor | Cap the empty state at about 560px, left aligned with the h1. |
| SU3 | Subscriptions | "Subscribe to our supplements for ongoing preventative urinary tract care." is marketing phrasing. | 2.2 | Minor | "Supplements are delivered on a schedule you set. You can skip or cancel at any time". |

### Today (`/portal/passport`, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| D1 | Today | "Last 12 months" grid: four months are dark red and eight pale pink with no key, no count and no text. The meaning (dark = a UTI that month) is colour alone. A GP looking over the user's shoulder cannot read it. | 8.3 | Major | Add a key ("Dark = month with a UTI") or put a count or dot in each UTI month; make dark cells read as "Jan · 1 UTI". |
| D2 | Today | Right column ends at y=1035 ("Last 12 months"), left column at y=1455 ("My patterns"): a 420 by 536px empty region bottom right. | 4.4, 4.2 | Minor | Move "My patterns" to the right column under "Last 12 months", or split its three groups across both columns. |
| D3 | Today | "Settings" link floats right at y=257, below the h1's baseline, with no icon or button styling. | 4.4, 1.5 | Minor | Align it with the h1 baseline and style as a secondary button "Settings", or put it in the Passport nav row next to UNA. |
| D4 | Today | Hero left half: "6 days since your last UTI ended" and the button occupy 150px of a 275px tall panel. | 4.2 | Minor | Add the last UTI's one-line summary ("9 to 18 November · pivmecillinam · worked") under the headline. |
| D5 | Today | "Last investigation USS KUB · 11 May" has no year while every other date does; "USS KUB" is a clinical abbreviation. | 10.4, 2.2 | Minor (wording only, check with the owner) | "11 May 2026"; show the user's own label but consider offering "Ultrasound of kidneys and bladder (USS KUB)" as the stored name. |
| D6 | Today | "What I'm taking" chips: pale pink for habits, orange for supplements, with no text stating the category. | 8.3 | Minor | The chip text already differs; acceptable, but add a tooltip-free cue such as a small "supplement" word or drop the colour difference. |
| D7 | Today | Footer "Order a Utee test · available any time, not a recommendation" is 13px grey, a shop link inside the health record, with an odd self-disclaimer. | 9.10, 8.1 | Minor | Remove from Today or move to the portal home; if kept, 14px and "Order a Utee test kit". |
| D8 | Today | "Check in today to start a streak" with a flame icon invites daily behaviour from someone who may be unwell. | 9.1, 9.10 | Minor (wording only, check with the owner) | "Check in today" is enough; keep the count if wanted but not as a "streak". |
| D9 | Today | Month labels "Sept" against three-letter "Dec", "Jan", "Aug". | 10.4 | Minor | "Sep". |
| D10 | Today | Source pill "UTEE LAB" is about 11px light blue caps. | 8.1 | Minor | 12px minimum with darker text; same for every source pill. |
| D11 | Today | Faces row: five 50px circles with 12px labels "Awful, Bad, OK, Good, Great". Labels are white on gradient at about 12px. | 8.1 | Minor | 14px labels. |

### Log a UTI (`/portal/passport/log`, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| LG1 | Log a UTI | "What are you noticing?" allows many selections but does not say "choose all that apply"; "Today" is pre-selected for "When did it start?" (allowed by 5.5 as a sensible default). | 5.6 | Minor | Hint under the question: "Choose all that apply". |
| LG2 | Log a UTI | Product map says the form also asks triggers, treatment and test; the capture shows only two cards, so those are either hidden until save or revealed progressively. Cannot judge whether an unwell user sees the whole form length. | 5.1, 1.9 | Check | Capture the form after a symptom is chosen; if sections appear on interaction, state "You can add treatment and a test later" under Save. |
| LG3 | Log a UTI | Sticky save bar is a full-width white band with a 672px button; the bar covers about 70px (8 percent) of the viewport, fine, but on desktop there is no reason for it to be sticky when the form fits above the fold. | 4.9 | Minor | Keep sticky only when the form is taller than the viewport. |
| LG4 | Log a UTI | Symptom chips are about 40px tall, under the 44px primary-target line (desktop mouse use is fine; noted for the phone round). | 3.4, 8.4 | Minor | 44px minimum chips. |
| LG5 | Log a UTI | No sign of whether symptoms are required; no "(optional)" anywhere. | 5.3 | Minor | Label optional groups "(optional)" or state "You can save with just the start date". |

### History, UTIs view (`/portal/passport/history`, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| HU1 | History UTIs | "Feeling" row is a run of small coloured squares (dark to pale pink) with no text, no key and no count; how the user felt each day is colour alone. | 8.3 | Major | Add a key line ("Darker = worse day") as the Day by day view has, or show "awful 3 days, bad 4, ok 3". |
| HU2 | History UTIs | Episode cards have no visible affordance; the footer "Tap a UTI to open it." is the only cue. | 1.6, 1.8 | Minor | Chevron on each card or make the date heading a link "9 November 2026 UTI". |
| HU3 | History UTIs | Column is 768px while every other Passport sub-page is 672px and Today is 1104px. Cards are tall label/value blocks; at 1440 two cards per row would halve the scroll. | 4.2, 4.4 | Minor (counted in G2) | Two columns of cards at 1280 and above. |
| HU4 | History UTIs | Segmented control unselected text ("Everything", "Day by day") is dark on mid pink; contrast looks borderline. | 8.1 | Check | Measure; darken the track or text. |
| HU5 | History UTIs | "Tests  Utee test UTEE LAB" vs "Tests  Dipstick at home · positive PATIENT": row label "Tests" where the Record tab is "Results". | 10.5 | Minor | "Results". |

### History, Everything view (1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| HE1 | History Everything | Detail lines ("3 days · worked: yes", "Feeling: great", "Standard culture (NHS lab) · E. coli: sensitive to Cefalexin, …") are about 12px and use "key: value" style. | 8.1, 2.8 | Minor | 14px; "worked" / "partly worked" / "did not work" without the colon form. |
| HE2 | History Everything | Two pills for lab findings: "RESULT" (E. coli) and "TEST" (Dipstick at home, Urine sent to a lab). The rubric asks for "result" for lab findings. | 10.5 | Minor | One pill "RESULT" for all of them, with the type in the title. |
| HE3 | History Everything | Date rail "18 Nov", "9 Nov" is about 12px light grey. | 8.1 | Minor (counted in G9) | 14px. |
| HE4 | History Everything | 768px single column, 2935px tall. At 1440 a month-per-column or two-column layout would cut the scroll. | 4.2 | Minor | Two columns of month cards at 1280 and above. |

### History, Day by day view (also `/portal/passport/history?view=days` / diary, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| HD1 | History Day by day | "Last 30 days" grid cells carry no date except today ("24"); the weekday letters are about 10px. The user cannot tell which cell is which day without hovering. | 8.3, 8.1 | Minor | Put the day number in every cell at 12px minimum; "Darker = harder day" key is good, keep it. |
| HD2 | History Day by day | Each entry shows the date twice: "Fri 20 Nov" bold then "20 Nov" small beneath. | 10.4 | Minor | Show once. |
| HD3 | History Day by day | "Feeling awful · Peeing more often 8, Burning when peeing 7, Urgent need to pee 7, Blood in urine 3" — bare numbers with no "/10". | 2.9 | Minor | "Peeing more often 8/10" or "(severity out of 10)" once per entry. |
| HD4 | History Day by day | "started pivmecillinam", "started nitrofurantoin" lower case where the same drugs are capitalised everywhere else. | 10.5 | Minor | One casing for medicine names. |
| HD5 | History Day by day | "LOG A UTI" is present on the UTIs and Everything views but missing here; only "ADD TO MY DIARY" remains. | 10.1, 1.3 | Minor | Keep the same two buttons on all three views. |
| HD6 | History Day by day | 4079px tall single 768px column; 30 one-line entries each take about 45px with a two-line date block. | 4.2 | Minor | One row per day with the date on one line; or two columns at 1280 and above. |

### Record, About you tab (`/portal/passport/record?tab=about`, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| RA1 | Record About | Row text "Before menopause · Hormonal coil · Not pregnant · Taking Drinking more water, Peeing after sex, D-mannose, Probiotics" — "Taking Drinking" is a generated collision. | 2.2 | Minor | "Taking: drinking more water, peeing after sex, D-mannose, probiotics" or drop the taking list here since the Taking tab holds it. |
| RA2 | Record About | Tab "About you" and the first row heading "About you" repeat; the h1 is "Record". | 1.1 | Minor | Row heading "Your details". |
| RA3 | Record About | Three "Edit" links are identical visible text; their accessible names cannot be judged. | 1.5, 8.10 | Check | Visually hidden suffix: "Edit your details", "Edit your UTI history", "Edit contact and hospital". |
| RA4 | Record About | The step 1 form (`record-about-step1.jpg`) was not captured, so label, hint, optional marking and input widths cannot be judged. | 5.x | Check | Recapture. |

### Record, Results tab (1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| RR1 | Record Results | Sensitivity chips "S · Cefalexin", "I · Co-amoxiclav", "R · Amoxicillin" use single letters a patient will not know; the footer "S / I / R as reported by the lab." does not expand them. Letters are present so this is not colour alone. | 2.9, 2.2 | Major (wording only, check with the owner) | A key above the chips: "S = the antibiotic should work, I = may work, R = unlikely to work (as reported by the lab)". Do not change the clinical content. |
| RR2 | Record Results | "E. coli · >10^5" — caret notation for 10⁵. | 2.9 | Minor | "more than 100,000 per ml" or a superscript "10⁵" with the plain words first. |
| RR3 | Record Results | Red "R" chips use the error red for a non-error status. | 9.10 | Minor (check with the owner) | Clinical S/I/R colouring is conventional; if kept, make the error red for forms a visibly different tone. |
| RR4 | Record Results | No Edit control on any result card while the Taking tab shows "Edit" on every row. | 10.1 | Minor | Same per-row "Edit" link or the same whole-card open pattern on both. |
| RR5 | Record Results | "white cells 120" bare lower-case fragment as a note. | 2.x | Minor | "White cells: 120" or the user's note as typed, in quotes. |
| RR6 | Record Results | Footer "S / I / R as reported by the lab. This is your record, not advice." about 12px grey. | 8.1 | Minor (counted in G9) | 14px. |

### Record, Investigations tab (1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| RI1 | Record Investigations | Three names for one thing: tab "Investigations", intro "Scans, bloods and camera tests", button "ADD A TEST OR SCAN". "Test" also means the Utee kit and the Results tab's items. | 10.5 | Minor | "Add a scan or blood test"; keep "investigation" as the word in headings. |
| RI2 | Record Investigations | Footer "Normal or abnormal is as the report said it." is awkward. | 2.2 | Minor | "Normal or abnormal is what the report said". |
| RI3 | Record Investigations | Page is 70 percent empty below two cards in a 672px column. | 4.2 | Minor (counted in G1/G2) | Wider container; two cards per row. |

### Record, Taking tab (1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| RT1 | Record Taking | Button "ADD SOMETHING" does not say what. | 2.7 | Minor | "Add something you take". |
| RT2 | Record Taking | "since 22 Jan · helps ✓" and "since 1 Aug · Is it helping? not sure" are lower-case fragments with a question in the middle of a status line. | 2.x | Minor | "Since 22 January · helps" / "Since 1 August · not sure yet". |
| RT3 | Record Taking | "Stopped taking (1)" is an expander hiding content. | 1.9 | Minor | Acceptable for stopped items; add a chevron so it reads as an expander. |

### Share (`/portal/passport/share`, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| SH1 | Share | The only way to revoke a code is behind an icon-only "···" button at the card's top right with no label and no visible menu. | 1.9, 3.11, 8.10, 9.9 | Major | Visible "Revoke this code" (warning style) in the card's button row, or at least a labelled "More" button. |
| SH2 | Share | The statement of what a clinician sees ("The same summary as your passport PDF: your details, UTI history, results, investigations, treatments and diary. They cannot change anything…") is 13px grey centred text under the card, after the actions. "They" has no clear antecedent. | 9.9, 8.1, 2.2 | Minor | Move it above "NEW SHARE CODE" at 16px: "A clinician with this code sees your details, UTIs, results, investigations, treatments and diary. They cannot change anything". |
| SH3 | Share | Primary is "DOWNLOAD PDF" while the in-room task is to show a code; "NEW SHARE CODE" is secondary. | 10.2, 1.3 | Minor | Keep one primary; consider making "New share code" primary when no active code exists and the QR card primary when one does. |
| SH4 | Share | The share card actions "COPY LINK" and "SHOW FULL SCREEN" are fine; "SHOW FULL SCREEN" is the right control for the GP persona. No problem. | — | — | — |

### Settings (`/portal/passport/settings`, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| ST1 | Settings | Passport nav shows "TODAY" as the active pill on the Settings page. | 1.1, 1.4 | Minor | No active pill on Settings, or add a Settings entry. |
| ST2 | Settings | Settings is reachable only from the "Settings" text link on Today; from History, Record or Share there is no route. | 1.4, 10.7 | Minor | Put Settings (gear or text) in the Passport nav row next to UNA on every Passport page. |
| ST3 | Settings | "Everything in your passport. JSON, CSV or FHIR." and button "DOWNLOAD": three formats named by acronym, button says nothing about what you get. | 2.9, 2.7 | Minor | "Download my data" button; a choice sheet with plain words: "Spreadsheet (CSV)", "For another health app (FHIR)", "Everything, raw (JSON)". |
| ST4 | Settings | Toggle state is shown only by colour and knob position; the off toggle is very pale (about 1.5:1 against white). | 8.3, 8.2 | Minor | Add "On" / "Off" text beside each toggle; darken the off track. |
| ST5 | Settings | "Let Una use AI to read my messages / Off: she matches plain phrases and may miss things." — gives the assistant a gender. | 9.12, 2.x | Minor (wording only, check with the owner) | "Off: Una matches plain phrases and may miss things". |
| ST6 | Settings | Consent toggles "Storing my UTI Passport entries" and "Anonymised research use" are both on; switching the first off is destructive. Whether a confirmation follows cannot be judged. | 5.10, 6.9 | Check | Confirm a confirmation dialog names what happens; show whether research consent was pre-ticked at sign-up. |
| ST7 | Settings | Nothing on this page says where data is stored or who can see it; the consent page (not captured) may. | 9.8 | Check | Add one line under "Consents" linking to the plain-English data statement. |

### Guided setup (`/portal/passport/setup`, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| GS1 | Guided setup | First question "Are you before, around or after the menopause?" gives no reason for asking. | 7.2, 2.10 | Major | One line in the bubble: "This helps your GP read your UTI pattern. You can say 'rather not say'". |
| GS2 | Guided setup | A three-option single-choice question is asked as free text: the user must type "before", "around" or "after". The UTIs step has a "Skip for now" chip, so quick-reply chips exist. | 5.6, 7.5 | Major | Offer chips "Before", "Around", "After", "Rather not say" under the bubble; keep the text box for anything else. |
| GS3 | Guided setup | No "Skip for now" and no back link; the only exit is "Prefer a form?". | 7.4, 1.2 | Major | Add "Skip for now" and a "‹ Today" or "Do this later" link. |
| GS4 | Guided setup | "SEND" is rendered disabled (pale) until text is typed. | 6.10 | Minor | Keep it enabled; on an empty send, say "Type an answer or choose one above". |
| GS5 | Guided setup | "Prefer a form?" floats at x=956, y=181, right of and below the h1 baseline, in a page whose content is a 672px column. | 4.4 | Minor | Place it under the h1 as a text link or in the input card. |
| GS6 | Guided setup | "Una uses AI to read what you type. You can switch this off in Settings" is 12px, and the link leaves set-up mid-flow. | 8.1, 6.11 | Minor | 14px; "You can switch this off later in Settings" without a link, or confirm the chat is restored on return. |
| GS7 | Guided setup | Whether health-data storage and visibility were explained before this first health question depends on the consent page, which was not captured. | 7.6 | Check | Recapture consent on a fresh account. |

### Add UTIs quickly (`/portal/passport/setup?mode=utis`, 1440px)

| # | Screen | What is wrong | Rubric | Severity | Proposed fix |
|---|---|---|---|---|---|
| AU1 | Add UTIs quickly | Has a "‹ Today" breadcrumb and "Skip for now" chip while the main Guided setup has neither. | 10.7, 10.1 | Minor | Give both set-up screens the same frame. |
| AU2 | Add UTIs quickly | Instruction bubble asks for five things in one go ("when it started and ended, what you noticed, what you took and whether it helped"). | 5.1 | Minor | Acceptable for a free-text shortcut; add "Say as much or as little as you remember". |
| AU3 | Add UTIs quickly | Disabled "SEND" as GS4. | 6.10 | Minor | As GS4. |

## 3. Not judged from this material

- Hover, focus and pressed states (4.6, 8.5, 10.8); keyboard order and operability (4.7, 8.5); skip links.
- Screen-reader names for icon buttons ("···" on Share, faces on Today, timeline icons), live-region announcements, error association, heading outline (1.7, 8.7, 8.9, 8.10).
- Exact contrast ratios; everything flagged above under 8.1 and 8.2 is by eye and should be measured.
- 400 percent zoom reflow at 1280px (4.8) and 1280px layout parity (4.4): only 1440px was supplied.
- Loading, saving, double-submit, busy states (5.12, 6.1); success confirmations after Save (6.8); offline or server-error messages (6.7); session or share-code expiry messages.
- The consent page, the code step of sign-in (paste, resend, autofill), the Una sheet, the About-you step forms, the Log form after a symptom is chosen (triggers, treatment, test), the episode page, order detail, pass this kit on, the symptom form, the shared Passport as a clinician sees it, the PDF, every add/edit sheet, every Passport empty state, and any delete or revoke confirmation.
- Whether "Track on Royal Mail" opens a new tab, whether share links open in the same tab.
- Whether the all-caps styling is CSS over sentence-case text (2.6).
- Mobile heading 3 in full: scored provisionally only from component sizes seen at desktop.
