# Round 2

Tested 24 November 2026 against production (the round-1 fixes merged as PR #68 at 12:44 and live from 12:45), as the demo patient, at 390px and 1440px. Material: 33 static screens per width (`screenshots/round-2/{phone,desktop}`) and 150 flow steps across 11 tasks (`screenshots/round-2/flows/{phone,desktop}`). Three fresh reviewers scored from the screenshots alone, with no sight of the code, of each other, or of round 1: phone (all phone material), desktop static, desktop flows. Their reports are in `reviews/round-2-*.md`.

## Verification of the round-1 fix list

Each item was checked in the browser at both widths from the round-2 captures. "Done" means seen working at 390px and 1440px. Evidence is the capture file name under `screenshots/round-2/`.

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Second open UTI started silently | Done. The Log page shows "You have a UTI open since 23 November 2026" with "Open that UTI" and "Start a new UTI" when one is open. | flows/*/log-06-log-again-guard |
| 2 | Empty Log save | Done. "Save with no symptoms yet?" with "Save anyway" and "Go back"; Go back returns to the form. | flows/*/logEmpty-01, logEmpty-02 |
| 3 | Severity squares | Done. Two rows of five numbered 44px buttons, "1 mild" and "10 worst", "7 of 10" when chosen. | flows/*/log-03, log-04-rated |
| 4 | Other symptom label and display | Done. "Describe the other symptom" label; the text appears in the rating list, on the UTI page and in the clinician's view ("Symptoms: burning, other: Dull ache low down"), checked with a temporary UTI that was removed afterwards. | flows/*/log-03, log-08-episode, flows/phone/share-clinician-03-opened-with-other-symptom |
| 5 | Today's note | Done. "A note about today" label, "Save note" button, "Saved ✓" after saving. | flows/*/today-04, today-05 |
| 6 | Clipped tabs | Done. Portal header tabs wrap to two lines at 390px; Record's four tabs wrap so "Taking" is visible. | phone/portal-home, phone/record-taking |
| 7 | No help, contact or privacy route | Done, with one gap. Footer on every portal page with "Your data and privacy" and "Your test kits". "Contact Utee" appears only once `NEXT_PUBLIC_SUPPORT_EMAIL` is set (decisions, item 2). | any portal capture |
| 8 | Web address for the share code | Done. "Type this code at portal.myutee.co.uk/passport" under the code and on the full-screen view. | flows/*/share-04, share-05 |
| 9 | New share code sheet and removal | Done. "Or type a name (optional)" label, 24px tick box, one Cancel, "Remove this code?" confirmation, "Code removed. Anyone using it has lost access." | flows/*/share-02, share-08, share-09 |
| 10 | Blank culture saved, no Edit cue, S/I/R | Done. Save with nothing says "Enter the sample date, or tick 'I don't know the date'", then "Choose what the test found"; "I don't know the date" tick; "Edit" on each card; footnote spells out S, I and R. | flows/*/result-03, result-04, result-06; phone/record-results |
| 11 | Disabled Save buttons | Done. Save is enabled and says what is missing on the result and investigation sheets. | flows/*/result-03, investigation-03 |
| 12 | Taking sheet "Done", instant Remove | Done. "Changes save as you go." with "Saved ✓"; "Remove Vitamin C from your record?" confirmation; "Removed." notice. | flows/*/taking-07 to taking-10 |
| 13 | Sign-in email error | Done. In-page "Enter an email address in the right format, like name@example.com." with a red border. | flows/*/signin-02 |
| 14 | No loading state | Done. Grey page-shaped skeleton while a page loads. | flows/*/slow-01, slow-02 |
| 15 | Small text and low contrast | Done. No text under 12px remains in the customer app; the grey caption colour is #6b5b80 (5.2:1 on the pink ground); inactive header tabs at 90% white. | any capture |
| 16 | Guided setup first question | Done. Four tap chips plus "Skip for now", with one line on why the questions are asked. | phone/setup, desktop/setup |
| 17 | Kit page has no way back | Done. "‹ Your test kits" breadcrumb. | phone/kit, desktop/kit |
| 18 | Consent switch unexplained | Done. "Your entries stay stored. The Passport pages close until you turn this back on." under the switch; "Switch this off?" confirmation. | flows/*/settings-01, settings-03 |
| 19 | Mixed date formats | Mostly done. "24 November 2026" and "9:30am" across the app. Left over: the ended-UTI eyebrow ("ENDED TUE 24 NOV") and the shared view's "valid until Tue 1 Dec, 12:56" still use the short form. Carried to this round's list. | flows/*/log-10-episode-ended |
| 20 | Vague button labels | Done: "Add something I take", "Add what I'm taking", "Open passport", "Open chat". "Continue" was not found in the customer app. | phone/record-taking, phone/today |
| 21 | "Same as last time" as a link | Done, as a chip. | flows/*/log-01 |
| 22 | "Choose all that apply" | Done. | flows/*/log-01 |
| 23 | No "UTI logged" confirmation | Done. Green "UTI logged. Check in from Today each day while it lasts." on Today. | flows/*/log-05 |
| 24 | Delete buttons alike; no "UTI deleted" | Done. "Yes, delete it" is the filled pill, Cancel outlined; "UTI deleted." on History. | flows/*/log-13, log-14 |
| 25 | Month tiles and day grid without legend | Done. Legend under the 12-month grid and under the day-by-day calendar. | phone/today, phone/history-days |
| 26 | Cards with no tap cue | Done for result and investigation cards ("Edit"). History UTI cards: "Tap a UTI to open it." under the list. | phone/record-results, phone/history-utis |
| 27 | "View", "View all", "Browse" | Done: "All orders", "See plans". "Result ready · View" on the kit row kept (it names the thing). | phone/portal-home |
| 28 | "Fulfilled" | Done: "Sent", "Partly sent", "Being prepared". | phone/orders |
| 29 | Settings copy | Done. | phone/settings |
| 30 | Share explanation after the codes | Done, now above them. | phone/share |
| 31 | Consent sentence and the email | Done. "including my name, date of birth and contact details". | flows/*/share-02 |
| 32 | Kit page wording | "GP or doctor" fixed. "Episodes", "09:30" and "1–3 days" are in the submitted-symptoms summary, which repeats the triage form's own labels; changing them means changing the triage form (decisions). | phone/kit |
| 33 | Subscriptions marketing register | Done. | phone/subscriptions |

## Harness incident, recorded for honesty

The round-2 result and investigation flows were written to open "the first editable card" and remove it. On production that was the demo account's seeded 9 November culture (phone run), 3 April culture (desktop run) and both seeded investigations, not the entry the flow had just added. The deletes themselves worked correctly (the entries disappeared and "Result removed." showed), so the product did what it was told; the harness told it the wrong thing. All four entries were re-inserted from the original seed statements within the hour, the flow's own blank entries were removed, and the harness now targets only the card it created ("Edit: Date unknown"). No other account was touched. The round-1 hand check "deletion works" was right; the round-1 reviewer claim that deleted results stay in the list was a harness artefact.

The desktop log flow also stalled on first run because the UTI page took longer than the harness's wait; the new loading skeleton was visible for several seconds. Noted under this round's issues as a performance observation, not a layout bug.

## Scores (fresh reviewers)

| Heading | Phone | Desktop static | Desktop flows | Round 2 | Round 1 |
|---|---|---|---|---|---|
| 1. Navigation and findability | 7 | 6 | 6 | **6** | 5 |
| 2. Clarity of wording | 6 | 6 | 7 | **6** | 6 |
| 3. Mobile layout | 7 | (n/a) | (n/a) | **7** | 6 |
| 4. Desktop layout | (n/a) | 6 | 7 | **6.5** | 5 |
| 5. Forms and data entry | 6 | 7 | 5 | **6** | 4 |
| 6. Feedback and states | 5 | 5 | 5 | **5** | 4 |
| 7. First-time experience | 5 | 6 | 6 | **6** | 5 |
| 8. Accessibility | 6 | 5 | 6 | **6** | 5 |
| 9. Trust and tone | 7 | 6 | 7 | **7** | 6 |
| 10. Consistency | 6 | 5 | 5 | **5** | 5 |

Round score is the mean of the reviewers who could judge the heading, rounded (6.5 kept as is). Every heading held or rose; the three weakest are now Feedback and states, Consistency, and the two 6s for wording and navigation. 344 problems were listed (136 phone, 99 desktop static, 109 desktop flows); most are repeats of the same root cause seen on several screens.

## Hand checks on the reviewers' criticals and majors

| Claim | Result | Status |
|---|---|---|
| After withdrawing consent the page is empty (phone 115, critical) | Confirmed from the capture: the Settings page redirects to the consent page after the switch, and for about a second shows nothing but the top bar and footer; the consent page then arrives with no message that the Passport was closed. | Major. Fix below. |
| Submitting consent unticked shows nothing (all three) | Confirmed: the server action returns an error but the capture 600ms later shows no change; the only check is on the server. | Major. Fix below. |
| "Normal" is pre-selected on a new investigation and reaches the clinician's view (desktop flows 53, critical) | Confirmed. The draft starts with "Not sure" as the stored value but the chip row shows "Normal" selected in the capture because the chip for "Not sure" and the default are not the same thing; either way a finding is recorded without a choice. | Major. Fix below. |
| Deleted results stay in the list; no Remove control on the result sheet (desktop flows 49, phone 72) | Harness artefact: the sheet scrolls and Remove is below the fold at 1440px; the phone capture shows it. The removal itself works (see the incident above). The confirmation panel is cut off inside the dialog (desktop flows 56) is real. | Minor, with one fix: scroll the confirmation into view. |
| Note saved twice in the diary (phone 27) | The harness's test note is itself the same paragraph twice. Not a bug. | Not a bug. |
| "Saved ✓" shown with unsaved text, Save note looks disabled (desktop flows 26, 27) | At 1440px the harness's typing blurred the box, which auto-saved before the capture; the phone capture shows the button enabled while typing and disabled once saved. The indicator does not say "not saved yet" while typing. | Minor. Fix below. |
| Re-consenting sends a user with a full record back through guided setup (all three) | Confirmed in code: the consent action always redirects to setup. | Major. Fix below. |
| Raw keys "water", "pee_after_sex" on About you step 1 (phone 56) | Confirmed in the capture. The picker shows a chosen option's label only when it is in the list it was given; habits are not. | Major. Fix below. |
| White nav labels on the light end of the header gradient under 4.5:1 (desktop static 4) | Measured: white on the gradient's light end #f490c0 is 2.2:1; on the hero's light end the same. The brand gradient's dark end #962043 is 8.1:1. | Major. Fix below (gradient light end moved to #c0507a, 4.5:1), flagged for Dan. |
| Nothing recorded for medical history while an allergy is listed (both desktop) | Confirmed: the brief counts conditions only. | Minor wording fix below. |

## Issues to fix this round

Numbering continues from round 1. Root causes first.

### Major

34. Consent flow: empty submit says nothing; withdrawal lands on a blank then an unexplained consent page; re-consent goes to guided setup [6.4, 6.8, 7.10]. Fix: client-side check with the error under the tick box, 24px boxes, a "Your UTI Passport is closed. Your entries are stored." notice on the consent page after withdrawal, a way back to the portal, and re-consent returning to Today when a record exists.
35. Investigation "Was it normal?" must be chosen, not defaulted [5.6, 9.4]. Fix: no selection until the person taps; error under the question.
36. Errors sit at the foot of the sheet, one at a time, with no mark on the field [6.4, 6.5]. Fix: all fields checked on one tap, each message under its own field with a red border, the first scrolled into view (results, investigations, share, consent).
37. Adding gives no confirmation while removing does [6.8, 10.1]. Fix: "Result added.", "Scan or blood test added.", "Vitamin C added.", "Share code created for My GP." and named removal banners.
38. "PATIENT" pill on the patient's own screens [9.11]. Fix: "You" in the portal, "Patient" only in the clinician's view.
39. Investigation and lab terms without plain words: "USS KUB", "Cystoscopy", "Laparoscopy", "CT abdomen and pelvis" [2.2, 2.9]. Fix: plain words first in chip labels and card titles, the clinical term in brackets.
40. Header and hero text on the light end of the gradient fails contrast [8.1]. Fix: gradient light end moved from #f490c0 to #c0507a (white 4.5:1); flagged in decisions.
41. History UTI cards and timeline rows do not look tappable; "Tap a UTI to open it." [1.6, 1.8, 4.10]. Fix: "Open" with a chevron on each card, hint removed.
42. Episode page: title is only a date, actions hidden behind an icon-only button [1.1, 8.10]. Fix: "UTI from 23 November 2026"; the menu button gains the visible word "More"; "Delete this UTI" as the confirm label; "UTI ended" notice.
43. Day by day: dates printed twice, no day numbers in the grid [10.4, 8.3]. Fix: one date line per row; day number in every cell.
44. About you step 1 shows raw keys for habits [2.9]. Fix: show labels.
45. Three content widths across the Passport [4.4, 10.6]. Fix: Record, Share, Log, Settings and Setup widen to the History width.
46. Remove confirmation cut off inside the dialog [6.9, 4.9]. Fix: scroll it into view when it opens.
47. Top bar never marks the current section on desktop [1.4]. Fix: underline and aria-current on the active tab.
48. Settings highlights "Today" in the pill row [1.1]. Fix: no active pill on Settings.

### Minor (done this round where cheap)

49. Dates without a year: "since 22 January", "USS KUB · 11 May"; "Nov · 2" tile unexplained; "Tue 24 Nov" eyebrow; "valid until Tue 1 Dec, 12:56" [10.4]. Fix: year everywhere, legend line for the count, long form on the two leftovers (done before this round's reviews).
50. Wording: "Details" to "This UTI", "Manage" to "Edit what I'm taking", "Go back" to "Add symptoms first", "Yes, delete it" to "Delete this UTI", "Tap to rate" to "Rate it (optional)", legend "Clear" to "No UTI", "They cannot change anything" to "The clinician cannot change anything", "FHIR" to "Download for health systems (FHIR)", "Continue" on the kit code page to "Check my kit code", "Removed." to "Vitamin C removed.", "Is it helping? not sure" to "not sure if it helps", "Notes None" to "None recorded", "Nothing recorded for: medical history" to "conditions or operations", "patient: helping no" to "patient says it did not help", "Episodes, past 6 months" to "UTIs in the past 6 months", "Worse (-2)" to "worse", "dispatched" to "sent".
51. Share: empty state with the next step; expiry as a date and time; consent sentence split in three; visible "Remove this code" next to the menu; "Share code created" banner.
52. Log form: the empty-save question scrolls into view and takes focus; "Same as last time" on its own line; the Other box is a full-width two-line field; long custom names do not squash the rating heading; the sticky bar's link says which UTI.
53. Today: "See my diary" in the open hero; faces no wider than 480px on desktop; "Not saved yet" while the note differs from the saved one; a bigger note box.
54. Sign in and kit code: hints above the fields; links to "I have a kit code" and "I'm a clinician with a share code"; red border on the kit code field.
55. Settings: one Cancel in the switch-off sheet; "Saved" after a toggle; "Choose a format and download".
56. Taking: visible search label; "Or browse the list" as a plain heading; "not rated yet" as plain text; "(optional)" on the start date; "Add a scan or blood test" on the Investigations tab.
57. Una: "feeling fine, no symptoms" with no open UTI gets a reply that points to the diary instead of asking about a new UTI; the didn't-catch reply gives an example.
58. Text under 14px raised to 14px for hints, legends and footnotes across the Passport.

### Noted, not changed (see `decisions-for-dan.md`)

Pre-selected answers ("Today", "Still going", "Standard culture", "7 days"); "Save" versus saves-as-you-go on the Taking sheet; upper-case tracked buttons; the streak line; the shop line on Today and the promotional cards on the portal home; the consent paragraphs (legal text); generic antibiotic names in lower case; Una saving a "no symptoms" check-in to the diary; day, month and year text boxes instead of the native date picker; a public help or privacy link (needs the address and the privacy page URL).

## Verification

Each fix is checked on production after merge at 390px and 1440px with fresh screenshots; results are recorded in round 3's log and the reviewers are given the new screenshots cold.
