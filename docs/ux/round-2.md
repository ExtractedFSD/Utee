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

(to be filled when the three reviews are in)

## Issues to fix this round

(to be filled)
