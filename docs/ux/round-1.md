# Round 1

Tested 24 November 2026 against production as the demo patient, at 390px and 1440px. Material: 32 static screens per width (`screenshots/round-0`) and 141 flow steps across 11 tasks (`screenshots/round-1/flows`). Three fresh reviewers scored from the screenshots alone, with no sight of the code or of each other: phone (all material), desktop static, desktop flows. Their full reports, 313 numbered problems, are in `reviews/round-1-*.md`. This log merges them, records what I verified by hand, and sets the fix list.

## Scores (fresh reviewers)

| Heading | Phone | Desktop static | Desktop flows | Round 1 |
|---|---|---|---|---|
| 1. Navigation and findability | 5 | 5 | 6 | **5** |
| 2. Clarity of wording | 5 | 6 | 6 | **6** |
| 3. Mobile layout | 6 | (n/a) | (n/a) | **6** |
| 4. Desktop layout | (n/a) | 5 | 6 | **5** |
| 5. Forms and data entry | 4 | 6 | 3 | **4** |
| 6. Feedback and states | 4 | 6 | 3 | **4** |
| 7. First-time experience | 5 | 5 | 6 | **5** |
| 8. Accessibility | 5 | 5 | 4 | **5** |
| 9. Trust and tone | 7 | 6 | 6 | **6** |
| 10. Consistency | 5 | 5 | 5 | **5** |

Round score is the rounded mean of the reviewers who could judge the heading.

## Hand checks on the reviewers' criticals

Reviewers can only see what the harness showed them, so I re-ran the doubtful ones by hand before accepting a severity.

| Claim | Result | Status |
|---|---|---|
| One save of Log a UTI created two UTIs | One save creates one UTI; the second card was left over from an earlier harness run. | Not a bug. The real finding stands: a second UTI can be started while one is open, with no warning. |
| "Other" symptom text is lost | Stored correctly (`other:Dull ache low down`), but not shown on the UTI page or the clinician's view. | Display bug, major. |
| Face tap gives no feedback | Works: the face fills, "Saved" appears next to the question and the streak line updates. The harness tap did not register. | Feedback exists but is small and easy to miss; minor. |
| Note save gives no feedback | Confirmed: the note saves when the box loses focus, with no Save button, no visible label and no "Saved" message. | Major. |
| Empty Log submit saves a UTI | Confirmed. | Major; see decisions. |
| Empty Add a result saves a blank culture | Confirmed: three blank "Date unknown · Not sure" rows were created by the harness. | Major. |
| Results cannot be deleted | The whole card is a button that opens the edit sheet; "Remove" is at its foot. Nothing on the card says it is tappable. | Affordance bug, major; deletion works. |
| Investigation add never progressed | Harness mismatch (it looked for "Kidney blood tests"; the chip says "Kidney bloods"). Save is disabled with no reason until a type is chosen. | Disabled-button finding stands, minor. |
| Consent toggle did nothing | Harness could not find the switch by label; switches work. The consent page was not captured. | Re-test in round 2 with a working flow. |
| Bad sign-in email shows no error | The browser's own bubble appears ("Please include an '@'...") and vanishes; nothing persistent, wording is the browser's. | Major. |
| US date order in date pickers | The headless browser ran with a US locale; UK phones show day first. | Harness artefact; harness now runs en-GB. The "calendar is the only way" point stands as minor. |
| Loading state on a slow connection | Pages are server-rendered with no route loading state, so the old page stays until the new one arrives. | Major: add loading states. |

## Issues to fix this round

Severity after verification. Rubric items in brackets. Root causes in shared components where there is one.

### Critical

1. Log a UTI while a UTI is already open starts a second open UTI silently; Today then shows only the newer one and counts rise [5.10, 9.4]. Fix: when a UTI is open, the Log page says so first and offers "Open that UTI" or "Start a new UTI".

### Major

2. Log a UTI saves with nothing chosen [5.7]. Fix: one confirmation when no symptoms are chosen ("Save a UTI starting today with no symptoms yet?") rather than a hard block (see decisions).
3. Severity rating is ten 26px squares with 4px gaps and no end labels, revealed below the fold [3.4, 8.4, 2.10]. Fix: two rows of five 44px targets with "1 mild" and "10 worst" labels, directly under the chip list.
4. "Other" symptom box has a placeholder as its only label, a different focus ring, and its text never shows on the UTI page or the clinician view [5.2, 10.8, 6.11]. Fix: visible label, shared input style, show the text wherever the symptom is listed.
5. Today's note saves on blur with no label, no Save button and no confirmation [5.2, 6.8]. Fix: visible label, "Save note" button, "Saved" message; keep blur save.
6. Portal top tabs clip at 390px ("SUBSC…") with no cue; Record's four tabs overflow so the active "Taking" tab is off screen [1.4, 1.9, 3.1]. Fix: wrap both rows so every tab is visible.
7. No Help, Contact or Privacy route anywhere [7.7, 10.7, 9.8]. Fix: a footer on every portal page with "Your data" (settings) and "Contact Utee"; contact address needs Dan (decisions).
8. Share code never shows the web address a clinician types it into [9.9, 1.5]. Fix: print "Type this code at portal.myutee.co.uk/passport" on the card, the full-screen view and the printable copy.
9. New share code sheet: name field has only a placeholder, the consent checkbox is a bare 16px native box, two Cancel controls; removing a code is instant with no confirmation and no message [5.2, 3.4, 10.1, 5.10, 6.8]. Fix: visible label, 24px checkbox with the whole row tappable, one Cancel, "Remove this code?" confirmation, "Code removed" message.
10. Add a result saves a blank culture; result cards show no Edit affordance; S/I/R letters unexplained [5.7, 1.9, 2.9]. Fix: validate on submit ("Enter the sample date or tick 'I don't know the date'", "Choose what was found"), "Edit" on each card, legend "S = sensitive, I = intermediate, R = resistant".
11. Disabled Save or Add buttons with no reason on the result, investigation and taking sheets [6.10]. Fix: enabled buttons that validate on tap and say what is missing.
12. Taking edit sheet: "Done" implies nothing to save; "Remove" has no confirmation [2.7, 5.10]. Fix: "Save changes", "Remove X from your record?" confirmation, "Removed" message.
13. Sign in: bad email relies on the browser bubble [6.4, 6.6]. Fix: in-page error "Enter an email address in the right format, like name@example.com" with a red border.
14. No loading state on navigation; on a slow connection the old page just sits there [6.1]. Fix: route loading skeletons for the portal and the Passport.
15. Text under 14px across the app: bottom-nav labels 10px, eyebrows and pills 11px, face labels 11px, grey captions 12 to 13px; grey #8a7a9c on pale pink is under 4.5:1; inactive top tabs at 80% white on the gradient are under 4.5:1 [3.3, 8.1]. Fix: raise the shared size tokens, darken the tertiary text colour, inactive tabs at 90% white.
16. Guided setup opens with a free-text menopause question with no tap options, no reason and no skip [5.6, 7.2, 7.4]. Fix: tap chips for the three "about you" questions, one line on why, a visible "Skip for now".
17. Kit page has no way back at the top [1.2]. Fix: breadcrumb to Your test kits.
18. Consent withdrawal switch has no text saying what it does [9.8, 5.10]. Fix: one line under it ("Your entries stay stored; the Passport pages close until you turn this back on") and a confirmation.
19. Dates and times in several formats: "24 Nov 2026", "Tue 24 Nov", "15 Nov 2026, 09:30" [2.5, 10.4]. Fix: one formatter: "24 November 2026", "9:30am"; short weekday forms only inside the diary grid.

### Minor (fixed where cheap this round, otherwise carried)

20. Buttons: "Continue" on the kit code page, "Add something", "Open", "Download" [2.7]. Fix labels.
21. "Same as last time" styled as a text link [1.6, 10.2]. Fix: chip.
22. "Choose all that apply" hint missing on the symptom question [5.6].
23. No "UTI logged" confirmation after saving [6.8]. Fix: a notice on Today after `?logged`.
24. Delete confirmation buttons identical in style; no "UTI deleted" message [6.9, 6.8].
25. Month tiles and the Day-by-day grid carry no legend or text [8.3]. Fix: legend lines.
26. Cards with no tap cue (History UTI cards, result cards) [1.8, 3.11].
27. "View", "View all", "Browse" link labels [1.5].
28. Orders status pill "Fulfilled" [2.9]. Fix: "Sent".
29. Settings: "Download my data … JSON, CSV or FHIR" [2.9]; "Monthly nudge" [9.1]; "she matches plain phrases" [9.1].
30. Share page explanatory paragraph sits after the codes [2.1, 7.1].
31. Shared Passport shows the patient's email; the consent sentence does not say so [9.9]. Fix wording.
32. Kit page: "GP or doctor", "Episodes", "09:30", "1–3 days" [10.5, 2.5].
33. Subscriptions empty-state marketing register [2.2].

### Noted, not changed (see `decisions-for-dan.md`)

Upper-case tracked button labels (brand rule versus readability); the streak line (Dan asked for it); "Main organism" and other lab terms on Today and Results (clarifying could change clinical meaning); symptom form labels ("urinate") on the kit page; Una's handling of "no symptoms"; asking when something was stopped; promotions on the portal home; whether to require a symptom on Log a UTI.

## Verification

Each fix is checked on the branch's preview deployment at 390px and 1440px with fresh screenshots before being marked done; results are recorded in round 2's log and the reviewer is given the new screenshots cold.
