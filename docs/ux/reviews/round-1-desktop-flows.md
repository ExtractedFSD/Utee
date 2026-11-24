# Round 1 review: desktop task flows (1440px)

Independent review from screenshots only: `docs/ux/screenshots/round-1/flows/desktop/*.jpg` (68 full-page captures, 900px viewport), judged against `docs/ux/rubric.md` with `docs/ux/product-map.md` for context. No source code, live app or other files were consulted. All findings are at 1440px wide; the "mobile layout" heading is scored provisionally from what transfers (sheet closing, target sizes, type sizes) and flagged as such.

Flows covered: log, logEmpty, today, result, investigation, taking, share (patient and clinician), una, settings, slow, signin.

## 1. Score table

| # | Heading | Score | One-line justification |
|---|---|---|---|
| 1 | Navigation and findability | 6 | Titles, breadcrumbs and the five Passport pills are clear, but the pills vanish on Log a UTI, "Today" stays highlighted on Settings, and edit, delete and remove actions hide behind icon-only "…" menus. |
| 2 | Clarity of wording | 6 | Calm plain English on most screens, but generic buttons (Save, Done, Open, Add something, Yes, delete it), clinical codes (USS KUB, PVR, eGFR, S/I/R, >10^5, FHIR), abbreviated and US-format dates, and "Tap" on desktop. |
| 3 | Mobile layout (provisional, desktop evidence only) | 5 | Sheets and dialogs all have a visible Close/Cancel, but face labels are about 11px, the consent checkbox is a bare native box well under 24px, the rating boxes are small unlabelled targets, and three menus are icon-only. |
| 4 | Desktop layout | 6 | Sensible 720px and 1100px columns, two-column Today; but the sticky Save bar on Log a UTI covers the rating rows and the "Other" field, History/Record leave most of 1440px empty, and the h1 column is not aligned with the pill navigation. |
| 5 | Forms and data entry | 3 | A single Log save produced two identical open UTIs; an empty Log submit and an empty Add a result both saved blank records; the "Other" symptom text typed by the user was dropped; dates use a US-format calendar picker as the only method; several fields have no visible label. |
| 6 | Feedback and states | 3 | Tapping a face, saving a note, saving a UTI, ending it, deleting it and removing a share code all produce no confirmation; a bad email on sign-in shows no error; failed submits never show an error summary; the slow-connection state shows a half-built page with no loading message. |
| 7 | First-time experience (partial: sign-in only) | 6 | Email plus code with no password is good and the consent tick is not pre-ticked, but the consent page itself could not be reached in these captures and the duplicated / blank records would confuse a first-timer. |
| 8 | Accessibility | 4 | Ten unlabelled rating boxes, a "Feeling" row of coloured squares with no text, white 11px labels on a pink gradient, errors not tied to fields with a red border or "Error:" prefix, and icon-only buttons. |
| 9 | Trust and tone | 6 | Tone is calm and honest ("This is your record, not advice", "opened once"), consent is explicit; but blank "Date unknown · Not sure" cultures and duplicated treatments reach the clinician's view, two UTIs can be open at once, and a streak mechanic nudges the user. |
| 10 | Consistency | 5 | Five date formats, Save/Done/Add/Yes, delete it for the same act, Remove and Delete for similar things, two Cancel controls in one dialog, "passport" and "Passport", Investigations / test or scan / scans, bloods and camera tests, and two dark primary buttons on the episode page. |

## 2. Problems found

Each line: flow and step (viewport) — what is wrong — rubric item — severity — proposed fix.

### Log a UTI, end it, change its date, delete it

1. log-05 (Desktop 1440) — After one save of the Log a UTI form, History shows two identical cards "23 Nov 2026 · OPEN · DAY 2 · Burning when peeing, Peeing more often +1 more". One save created two UTIs, or a second tap of "SAVE AND GO TO TODAY" was accepted. — 5.12 (also 9.4) — Critical — Disable and show a busy state on the Save button as soon as it is pressed; make the save idempotent on the server; if a UTI is already open, ask "You already have a UTI open from 23 November. Add to it or start a new one?" instead of creating another.
2. log-06, log-08, share-clinician-02 (Desktop 1440) — The free text typed under "Other" on the Log form ("A dull ache low down that comes and goes…") is not shown anywhere afterwards: the episode page lists "Other", and the clinician's view lists "other". The user's words are lost or hidden. — 5.7, 6.11 (also 9.4) — Critical — Store and display the typed text in place of "Other" on the episode page, History card and shared view.
3. log-04 (Desktop 1440) — After saving, the user lands on Today with no message that the UTI was saved; only "Day 2 of this UTI" implies it. — 6.8 — Major — Show a persistent inline confirmation at the top of Today: "Your UTI from 23 November is saved. Tap a face to say how you feel today."
4. log-01 to log-03 (Desktop 1440) — The Passport navigation pills (Today, History, Record, Share, Una) are absent on the Log a UTI page although present on every other Passport page. — 1.4 — Major — Keep the pill row on the Log page, or state clearly in the layout that the form is a full-screen step with a Back link (it already has "‹ Today"), but be consistent with the other forms, which keep the pills.
5. log-02, log-03 (Desktop 1440) — The fixed bottom bar with "SAVE AND GO TO TODAY" sits over the content: in log-02 the first row of rating boxes is hidden under the bar, in log-03 the "Other" text field sits directly against it, so a focused field can be hidden. — 4.9 (also 3.6) — Major — Add bottom padding equal to the bar height to the form, or place the Save button at the end of the form on desktop where there is room.
6. log-02, log-03 (Desktop 1440) — Each symptom's severity scale is ten empty white boxes with only "Tap to rate" on the right. There are no numbers, no end labels (mild / severe) and no indication which end is worse. — 8.3, 8.7, 3.11 — Major — Label the scale (1 to 10 inside the boxes, "Mild" and "Severe" at the ends) and give each box an accessible name such as "Burning when peeing, 7 out of 10".
7. log-02, log-03 (Desktop 1440) — "Tap to rate" and, on History, "Tap a UTI to open it." are phone wording shown with a mouse. — 2.4, 10.10 — Minor — Use device-neutral wording: "Rate it" / "Choose a UTI to open it", or drop the hint.
8. log-03 (Desktop 1440) — The "Other" text field has no visible label; the only cue was a placeholder, which scrolled away once text was typed. — 5.2 — Major — Add a visible label above the field: "What else did you notice?".
9. log-01 (Desktop 1440) — "Today" is pre-selected for "When did it start?". A sensible default (7.5, 7.9) but it is a single-choice question with an option pre-selected, so a user who skims will record the wrong start date. — 5.6 — Minor — Keep the default but make it visibly a default ("Today (change)") or show the resulting date in the heading: "Started today, 24 November".
10. log-01 (Desktop 1440) — The form only shows "When did it start?" and "What are you noticing?"; the triggers, treatment and test sections named in the product map are not visible, with no sign that more appears later. — 1.9 — Minor — If those sections appear after a selection, say so ("You can add triggers and treatment after saving"); otherwise show them.
11. log-07 (Desktop 1440) — Ending a UTI shows "SAVE" and "CANCEL". "Save" does not say what it does. — 2.7 — Minor — Rename to "Save end date" or "Mark this UTI as over".
12. log-07 (Desktop 1440) — Two dark filled primary buttons are on screen at once: "SAVE" in the inline panel and "I FEEL BETTER" below the card. — 10.2 — Major — Hide "I feel better" while the end-date panel is open, or make Save the only primary.
13. log-08 (Desktop 1440) — After ending the UTI there is no confirmation; the heading simply changes to "23 to 24 Nov 2026". — 6.8 — Major — Add an inline success message: "This UTI is now marked as over on 24 November. You can reopen it if symptoms come back."
14. log-09 (Desktop 1440) — "Change start date" and "Delete this UTI" are hidden behind an icon-only "…" button with no visible label. — 1.9, 3.11, 8.10 — Minor — Label the button ("More" or "Edit dates") or show "Change start date" as a text link next to the date.
15. log-10 (Desktop 1440) — "Change start date" offers Today, Yesterday, 2 days ago, Earlier and a "DONE" button. "Done" does not say whether the change is saved, and "Today" can be chosen for a UTI that ended yesterday with no visible guard. — 2.7, 5.7 — Minor — Rename to "Save new start date"; show the chosen date in words ("Starts 23 November"); block or warn when the start would be after the end.
16. log-11, logEmpty-02 (Desktop 1440) — Delete confirmation reads "Delete this UTI?" with buttons "YES, DELETE IT" and "CANCEL". The button starts with "Yes", and the panel does not name the UTI's dates. — 2.7, 5.10 — Minor — Use "Delete the UTI from 23 to 24 November" as the heading and "Delete this UTI" as the button.
17. log-12, logEmpty-03 (Desktop 1440) — After deleting, History reloads with no message that the UTI was deleted. — 6.9 — Major — Show "The UTI from 23 to 24 November was deleted." at the top of History.
18. log-05, log-12 (Desktop 1440) — The "Feeling" row on each History card is a row of pink squares of varying shade with no text or numbers. — 8.3 — Major — Add a text summary ("Awful to Good over 10 days") or a tooltip and accessible name per square.
19. log-05, log-06, log-08 (Desktop 1440) — Dates appear as "23 Nov 2026", "Mon 23 Nov", "DAY 2 · STARTED MON 23 NOV", "23 to 24 Nov 2026" and on Today "Started Mon 23 Nov". NHS style is "23 November 2026". — 2.5, 10.4 — Major — Pick one format with the month in full and use it everywhere; drop weekday abbreviations.
20. log-06 (Desktop 1440) — Empty rows read "None recorded" for triggers, treatment and tests but "None" for notes. — 10.5 — Minor — Use the same word in all five rows.

### Submit the log form empty

21. logEmpty-01 (Desktop 1440) — Submitting the Log form with nothing chosen except the pre-selected "Today" saved a UTI with "What you noticed: None recorded" and no error. No "There is a problem" summary, no inline error. The user may not realise a UTI was created. — 5.7, 6.4, 6.6 — Critical — Validate on submit: "Choose at least one thing you are noticing, or choose 'No symptoms yet'" with an error summary at the top; do not save until one answer is given.
22. logEmpty-01 (Desktop 1440) — The empty submit created a second open UTI ("Day 1 of this UTI, Started Tue 24 Nov") while the 23 November UTI was still open; Today now shows only the newer one, hiding the first. — 9.4, 5.12 — Critical — Prevent two open UTIs: offer to add to the open one, or require the open one to be ended first.

### Today: face tap and note

23. today-02 (Desktop 1440) — After tapping a face, the screen is identical to before: no face is highlighted, "Check in today to start a streak" is unchanged, nothing says the check-in was saved. — 6.8, 6.1, 8.9 — Critical — Highlight the chosen face, change the line to "Checked in: OK, 24 November", and announce it politely to screen readers.
24. today-03 (Desktop 1440) — "Add a note" opens a text area whose only cue is the placeholder "Anything worth remembering: what you drank, how you slept, what you took". There is no visible label, no Save button and no Cancel. — 5.2, 3.10, 6.8 — Major — Add a label ("Today's note"), a "Save note" button and a "Cancel" link.
25. today-05 (Desktop 1440) — The "note saved" step is identical to the typing step: the text sits in the box with no saved message, timestamp or change of state, so the user cannot tell whether the note is kept. — 6.8, 6.11 — Critical — After saving, show the note as text with "Saved at 5:30pm" and an "Edit" link; while saving, show a busy state.
26. today-01 (Desktop 1440) — The face labels "Awful, Bad, OK, Good, Great" are about 11px white text on a pink gradient, and "Check in today to start a streak" is pale pink on pink. Both look below 4.5:1 and below the 14px floor. — 8.1, 3.3 — Major — Use at least 14px labels in a colour that passes 4.5:1 against the gradient, or put the labels on a solid chip.
27. today-01 (Desktop 1440) — "Check in today to start a streak" with a flame icon is a gamified urgency cue in a health record. — 9.10, 9.11 — Minor — Replace with a factual line: "No check-in yet today."
28. today-01 (Desktop 1440) — "I feel better", "Details" and "Add a note" are styled as underlined links but perform actions (end the UTI, open a form). — 1.6 — Minor — Style actions as buttons; keep underlined links for navigation only.
29. today-01 (Desktop 1440) — "Last investigation: USS KUB · 11 May" shows a clinical abbreviation with no plain word and a date without a year. — 2.2, 2.9 — Minor, wording only, check with the owner — "Kidney and bladder ultrasound (USS KUB) · 11 May 2026".
30. today-06 (Desktop 1440) — The step labelled "diary" shows the Today page unchanged. The hero has no "See my diary" link that the product map describes, so the diary could not be reached from Today in this capture. — 1.3, 1.9 — Major — Add a visible "See my diary" link in the hero next to "Add a note".
31. today-01 (Desktop 1440) — The h1 "Today" sits in the 1100px grid while the active pill "TODAY" is also highlighted; on sub-pages (History, Record, Share) the h1 column is indented 170px further than the pill row, so the page title is not aligned with the navigation. — 4.4, 4.5 — Minor — Align the content column's left edge with the pill row at every width, or centre both.

### Add a culture (Results)

32. result-04 (Desktop 1440) — The add-result flow saved a card "Date unknown · Standard culture (NHS lab) · Not sure" with no date, no organism and no error shown; two identical blank cards were already there from earlier attempts. — 5.7, 6.4, 6.6 — Critical — Require at least a date or "I don't know the date" and an organism or "Not grown / don't know" before saving; show an error summary otherwise.
33. result-05, result-06 (Desktop 1440) — The steps named "delete-confirm" and "after-delete" are identical to the list: no delete control, no confirmation and no deletion happened. Result cards show no Edit or Delete affordance at all. — 5.10, 6.9, 1.9 — Critical — Put an "Edit" link on each result card that opens the sheet with a "Delete this result" action and a named confirmation.
34. result-02 (Desktop 1440) — "Sample date" is a native date input showing "mm/dd/yyyy" (US order) with a calendar icon, and it is the only way to enter the date; no Today / Yesterday / "not sure". — 5.5, 2.5 — Major — Use day, month and year text boxes with an example ("for example 6 8 2026") plus a "Date unknown" option.
35. result-02 (Desktop 1440) — "Which test?" has "Standard culture (NHS lab)" pre-selected, so a user who skips it records the wrong test. — 5.6 — Minor — Leave none selected.
36. result-02 (Desktop 1440) — "Which test?" lists brand names "Lodestar, Focus Labs, Tota, MicrogenDx" with no plain description. — 2.9 — Minor, wording only, check with the owner — Group them under "A private lab (Lodestar, Focus Labs…)" or add a one-line hint.
37. result-02 (Desktop 1440) — Inside the dialog, "TAKE A PHOTO OF THE REPORT" is a dark primary button while the real submit is off-screen, and "FILL IN THE FORM" is a disabled button with no text saying why. — 10.2, 6.10 — Major — Make the photo option a secondary button; replace the disabled button with text ("Type a description above, then choose Fill in the form").
38. result-02, result-03 (Desktop 1440) — The dialog is taller than the viewport and is clipped at the bottom ("Pseudomonas, Klebsiella pneumoniae, + Other" cut in half); no Save button is visible in either step. — 3.10, 4.9 — Major — Give the dialog an internal scroll with a sticky footer holding "Save this result" and "Cancel".
39. result-01 (Desktop 1440) — "E. coli · >10^5" uses a caret for an exponent; "S · Cefalexin", "R · Amoxicillin", "I · Co-amoxiclav" use single-letter codes, explained only in a 13px footer "S / I / R as reported by the lab". — 2.9, 8.3 — Minor, wording only, check with the owner — Write "more than 100,000 per ml" and spell the codes out on first use ("S = sensitive, I = intermediate, R = resistant") above the list.

### Add a scan or blood test (Investigations)

40. investigation-02 to -06 (Desktop 1440) — All five steps show the same open "Add a test or scan" dialog with nothing selected; the add, added, delete-confirm and after-delete states were never reached. From the screenshots the task cannot be completed. — 5.1, 6.1 — Critical (unconfirmed, see section 3) — Re-run by hand; if the type chips do not respond, fix; in any case the flow needs a visible result.
41. investigation-02 (Desktop 1440) — "SAVE" is a disabled grey button with no text saying what is missing. — 6.10 — Major — Keep the button live and validate on submit, or add "Choose what the test was to continue".
42. investigation-02 (Desktop 1440) — Two Cancel controls: a "CANCEL" pill top right and a "Cancel" link next to Save. — 10.1 — Minor — Keep one, at the bottom next to the primary action.
43. investigation-02 (Desktop 1440) — No date field, no "normal / not normal" and no numbers are visible before choosing a type, and nothing says they will appear. — 1.9, 5.1 — Minor — Show the full short form at once, or add "Pick the test to see the rest of the form".
44. investigation-01 (Desktop 1440) — Three names for one thing: tab "Investigations", intro "Scans, bloods and camera tests", button "ADD A TEST OR SCAN". — 10.5 — Minor — Use one phrase everywhere ("Scans and blood tests").
45. investigation-01 (Desktop 1440) — "USS KUB · PVR 20 ml", "Creatinine 68 μmol/L · eGFR 92 mL/min" with no plain words. — 2.2, 2.9 — Minor, wording only, check with the owner — Lead with the plain phrase ("Kidney ultrasound", "Kidney blood test") and keep the figures after it.

### Add, stop and delete something you take

46. taking-02 (Desktop 1440) — The search field's only cue is the placeholder "Search, for example D-mannose, Hiprex, oestrogen"; no visible label. — 5.2 — Major — Add the label "What do you take?" with the examples as a hint under it.
47. taking-03, taking-04, taking-07 (Desktop 1440) — "When did you start?" is a US-order native date picker ("mm/dd/yyyy") and is the only way to enter the date; it is not marked optional although the item saves without it. — 5.5, 5.3, 2.5 — Major — Day, month, year text boxes, "(optional)" in the label, and a "Not sure" choice.
48. taking-03 (Desktop 1440) — "ADD" is disabled until a chip is chosen, with no text saying why. — 6.10 — Minor — Keep it live and validate, or add "Choose one item above".
49. taking-04 (Desktop 1440) — The submit button says "ADD". — 2.7 — Minor — "Add Vitamin C".
50. taking-07 (Desktop 1440) — The edit sheet's only closing control is "DONE"; there is no Save and no Cancel, so the user cannot tell whether changes to the date, rating or notes are saved or discarded. — 6.8, 2.7, 10.3 — Major — "Save changes" and "Cancel", with a saved confirmation on the list.
51. taking-08 (Desktop 1440) — Pressing "I'VE STOPPED THIS" only fades the button; no stop-date question and no confirmation appears, then the item silently moves to "Stopped taking (4)". — 6.8, 5.10 — Major — Ask "When did you stop?" (Today / Earlier) and confirm: "Vitamin C moved to Stopped taking."
52. taking-10 (Desktop 1440) — The step named "deleted" is identical to "stopped": "Stopped taking (4)" is unchanged and no confirmation of removal is shown; the item could not be shown as deleted. — 6.9, 5.10 — Major (unconfirmed, see section 3) — "Remove" should open a named confirmation ("Remove Vitamin C from your record?") and then confirm the result in the list.
53. taking-01, taking-07 (Desktop 1440) — "Remove" is used here for deleting an item, "Delete this UTI" on episodes, and "Remove" again for share codes. — 10.1 — Minor — One word for permanent deletion of a record ("Delete"), used everywhere.
54. taking-01 (Desktop 1440) — Status text varies: "helps ✓", "Is it helping? not sure", "not rated yet" (in bold maroon, looking like a link). — 10.5 — Minor — One pattern: "helps", "not sure if it helps", "not rated yet", all in the same style.
55. taking-01 (Desktop 1440) — "ADD SOMETHING" does not say what will be added. — 2.7, 1.5 — Minor — "Add something you take".

### Share: create a code, full screen, clinician view, remove

56. share-02 (Desktop 1440) — The free-text "who for" field has no visible label; the placeholder "For example Dr Patel, or the UTI Institute" is the only cue. — 5.2 — Major — Label it "Their name or clinic (optional)" with the example as a hint.
57. share-02 (Desktop 1440) — "How long should it work for?" has "7 days" pre-selected. — 5.6 — Minor — Leave none selected, or show the default explicitly ("7 days (recommended)").
58. share-02 (Desktop 1440) — The consent checkbox is a bare native box roughly 14px square beside two lines of text; it is not clear the text is clickable. — 8.4, 3.4 — Major — Use a 24px or larger checkbox with the whole sentence as its label.
59. share-03 (Desktop 1440) — Submitting without the tick shows only "Tick the box to share." in red under the box; no "There is a problem" summary, no red border, no "Error:" prefix. — 6.4, 6.5 — Major — Add the error summary pattern with a link to the checkbox, and mark the checkbox group in error.
60. share-02 (Desktop 1440) — Two Cancel controls in one dialog ("CANCEL" pill top right, "Cancel" link by the primary button). — 10.1 — Minor — Keep one.
61. share-04 (Desktop 1440) — After creating a code there is no message; a second card appears with the same name "My GP", so two active codes are indistinguishable. — 6.8, 9.9 — Major — Confirm "Share code GXYB-RTNY-ABL6 created for My GP. It works until 1 December 2026 at 11:34am." and show the exact expiry on every card.
62. share-01, share-04 (Desktop 1440) — "Expires in 5 days" / "Expires in 7 days" with no date or time, while the clinician's page says "valid until Tue 1 Dec, 11:34". — 2.5, 10.4, 9.9 — Minor — "Works until 1 December 2026, 11:34am" on both.
63. share-07 → share-08 (Desktop 1440) — "Remove" in the "…" menu removed the code immediately: no confirmation naming the code and no message afterwards. — 5.10, 6.9 — Major — Confirm "Remove the code for My GP? Anyone who has it will no longer be able to open your Passport." then show "Share code removed."
64. share-01 (Desktop 1440) — "DOWNLOAD PDF" is the dark primary button while the page's main task is creating a share code, which is secondary. — 10.2, 1.3 — Minor — Make "Create a share code" the primary.
65. share-05 (Desktop 1440) — Full-screen QR is good (code, brightness hint, "CLOSE"). The hint "Turn your screen brightness up so the code scans." is fine. No issue; noted for completeness.

### Clinician: wrong code and opened Passport

66. share-clinician-01 (Desktop 1440) — After entering a wrong code the field is empty again (placeholder "ABCD-EFGH-JKLM" showing), so the clinician must retype everything. — 5.7 — Major — Keep the typed code in the field when showing the error.
67. share-clinician-01 (Desktop 1440) — The error "That code is not recognised, has expired or has been removed by the patient. Ask them for a new one." is in red text under the field only; no error summary, no red border, no "Error:" prefix. — 6.4, 6.5 — Major — Add the summary and field error styling; keep the wording, which does say what to do.
68. share-clinician-01 (Desktop 1440) — Button "OPEN" and hint "It is twelve letters and numbers". — 2.7, 2.5 — Minor — "Open the Passport"; "12 letters and numbers".
69. share-clinician-02 (Desktop 1440) — The read-only Passport lists three cultures "Date unknown · Not sure · Standard culture (NHS lab)" and three "Vitamin C, unknown to 24 Nov 2026 · stopped 24 Nov 2026" lines: blank and duplicated records created by the patient's accidental empty saves are shown to the clinician as part of the record. — 9.4, 9.7 (root cause 5.7) — Critical — Block blank saves (items 21, 32) and hide or clearly mark incomplete entries in the shared view.
70. share-clinician-02 (Desktop 1440) — "Drinking more water, since 22 Jan 2026 · since 22 Jan 2026" repeats the date; "Vitamin C, unknown to 24 Nov 2026" uses "unknown" for a missing date; "patient: worked yes" is not a sentence. — 2.4, 2.9 — Minor — "Drinking more water · since 22 January 2026"; "Vitamin C · start date not recorded · stopped 24 November 2026"; "patient says it worked".
71. share-clinician-02 (Desktop 1440) — The "In brief" strip is a good at-a-glance summary, but it is followed by a single narrow column about 860px wide with small text; at 1440px the clinician scrolls roughly 4,000px. Antibiotic history, culture results and investigations could sit side by side. — 4.2 — Major — Two-column layout at 1280px and above (burden and antibiotics left, cultures and investigations right), keep "In brief" full width.
72. share-clinician-02 (Desktop 1440) — "lab: R (9 Nov)", "lab: S (9 Nov)", "lab: I (9 Nov)" use single-letter codes with no key on this page. — 2.9, 8.3 — Minor, wording only, check with the owner — Spell out on first use or add a key under the heading.
73. share-clinician-02 (Desktop 1440) — A "FHIR" button sits in the header with no explanation. — 2.9 — Minor — "Download as FHIR (for clinical systems)" or move it to the foot.
74. share-clinician-02 (Desktop 1440) — The patient's email and home address are shown to anyone holding the code. The patient consent text says "anyone with this code can read my UTI Passport" but does not say contact details are included. — 9.8, 9.9 — Major, check with the owner — Either leave contact details out of the shared view or name them in the consent sentence ("including my date of birth, email and address").

### Una chat helper

75. una-01 (Desktop 1440) — The message box's only cue is the placeholder "Type here…"; no visible label. — 5.2 — Minor — Visually hidden label at minimum ("Message to Una"); better a visible one.
76. una-01 (Desktop 1440) — "SEND" is a disabled button when the box is empty, with no text. — 6.10 — Minor — Keep it live; an empty send can simply do nothing.
77. una-03 (Desktop 1440) — The user typed "Feeling fine today, no symptoms" and Una replied "Let's get today logged." then "What are you noticing today?", asking for symptoms the user just said they do not have, and nothing was recorded. — 6.8, 2.10 — Major — When the message already answers the next question, skip it: "Logged: feeling fine, no symptoms, 24 November. Anything else?" with Yes/No chips.
78. una-02 (Desktop 1440) — The not-understood reply "I didn't catch that. You can tell me about a UTI, how today is going, or something you've started or stopped taking." is calm and offers routes. No issue; noted because it is a good model for other errors.

### Settings, delete confirmation, consent

79. settings-01 (Desktop 1440) — On the Settings page the "TODAY" pill is highlighted as if the user were on Today. — 1.1, 1.4 — Minor — Highlight no pill on Settings, or add Settings to the row.
80. settings-01 (Desktop 1440) — The consents "Storing my UTI Passport entries" and "Anonymised research use" are instant toggles. Switching off the first withdraws consent to store health data; there is no confirmation naming what happens to the record. — 5.10, 6.9, 9.8 — Major — Make withdrawing storage consent a confirmed step: "Withdraw consent? Your Passport entries will be [deleted / kept but hidden] and you will not be able to log until you consent again."
81. settings-03 (Desktop 1440) — The step after withdrawing consent shows the Today page with every entry still visible and no message. Either the toggle did nothing (no feedback) or consent was withdrawn while the record still displays (misleading). — 6.8, 9.8 — Critical (which case applies cannot be told from the capture) — After withdrawal, land on the consent page with a clear statement of what happened to the data.
82. settings-04 to settings-07 (Desktop 1440) — The consent page, the unticked-submit error and the re-consent result could not be seen: all four captures show the Today page. — 7.6, 6.4 — Not scored; check by hand (section 3).
83. settings-02 (Desktop 1440) — Delete expander: the text is clear and names what is deleted (good), but "DELETE EVERYTHING" is a disabled button with no reason text, the label "Type DELETE to confirm" is about 13px, and typing a word is a memory-and-typing hurdle for someone unwell. — 6.10, 3.3, 8.12 — Minor — Keep a strong confirmation but make it a named button on a second step ("Delete all my Passport data") rather than a typed word; 16px label; no disabled state.
84. settings-01 (Desktop 1440) — "Download my data · Everything in your passport. JSON, CSV or FHIR." lists formats most users will not know, and the single "DOWNLOAD" button gives no choice. — 2.9, 1.5 — Minor — "Download a copy of everything in your Passport" with a format choice explained in plain words.
85. settings-01, share-01, settings-02 (Desktop 1440) — "passport" lowercase ("Delete my passport data", "Everything in your passport", "your passport PDF") against "UTI Passport" elsewhere. — 10.5, 2.6 — Minor — Capitalise "Passport" consistently.
86. settings-01 (Desktop 1440) — Toggles change state with no saved message. — 6.8, 8.9 — Minor — Brief inline "Saved" next to the toggle, announced politely.

### Slow connection

87. slow-01 (Desktop 1440) — At one second the page shows History content in fallback fonts with the Passport pill row missing and a large blank band below; nothing says the page is still loading, there is no spinner or skeleton, and the layout then jumps when the pills and web fonts arrive. — 6.1, 4.9 — Major — Reserve space for the pill row, show a visible "Loading your history…" state or skeleton cards, and use font-display: optional or a matched fallback so text does not reflow.

### Sign-in with a bad email

88. signin-02 (Desktop 1440) — Submitting "notanemail" produces no visible error: the card is identical to before. If a browser tooltip appeared it has gone, leaving nothing persistent. — 6.4, 6.5, 6.6 — Critical — On submit show "There is a problem" with "Enter an email address in the correct format, like name@example.com", a red border and focus on the field.
89. signin-01 (Desktop 1440) — The hint "We'll email you a one-time code. No password, no account to create." sits under the field, not between label and field. — 5.2 — Minor — Move the hint above the field.
90. signin-01 (Desktop 1440) — Placeholder "you@example.com" inside the field. Acceptable with the visible label, but it disappears on typing. — 5.2 — Minor — Move the example into the hint.

### Cross-cutting (every Passport page, Desktop 1440)

91. All pages — Buttons and small labels render in full capitals ("SAVE AND GO TO TODAY", "ADD A RESULT", "UTI PASSPORT", "PRESCRIBED MEDICINES"). Allowed only if the underlying text is sentence case and styled with CSS, which cannot be seen here. — 2.6 — Minor, check by hand — Confirm text-transform is used and source text is sentence case; consider dropping capitals on long buttons for readability.
92. History, Record, Share, Settings — A single 720px column centred in 1440px leaves about 360px empty each side and a long scroll; History cards could show two per row and Record lists could use the width. — 4.2 — Minor — Widen to about 960px and arrange cards in two columns at 1280px and above.
93. Result, investigation, taking and share dialogs — Each dialog scrolls with the page and is clipped by the viewport in the capture; where it is taller than 900px the primary action is off-screen. — 3.10, 4.9 — Major — Fixed dialog with internal scroll and a sticky action footer.
94. Episode, Share — Three different "…" icon-only menus hold Change start date / Delete, Printable copy / Remove. — 8.10, 10.9 — Minor — Give them accessible names that say the outcome and consider visible text actions.

## 3. Could not be judged from the material supplied

- Whether the duplicate UTI in log-05 came from one save (server double-write) or from the capture tool pressing Save twice; either way the button did not go quiet. Check by hand with one click on a throttled connection.
- The Investigations add, added, delete-confirm and after-delete states (investigation-02 to -06 all show the untouched dialog). Whether choosing a type reveals date, normal/abnormal and number fields, and whether an investigation can be deleted.
- Deleting a result: no delete control is visible on result cards and the delete-confirm / after-delete captures show no change. Confirm by hand whether results can be edited or deleted at all.
- Deleting an item from "Stopped taking": taking-10 is identical to taking-09.
- The consent page, the unticked consent submit error, and the re-consent result (settings-04 to -07 show Today). Also what actually happened to the record when storage consent was toggled off in settings-03.
- The diary (today-06 shows Today), and the History "Everything" and "Day by day" views.
- Whether the face tap in today-02 saved anything server-side; only the absence of visible feedback is certain.
- Whether the sign-in form shows a native browser validation bubble (transient, not captured) or nothing at all.
- Hover, focus and keyboard order (4.6, 4.7, 8.5), reduced-motion behaviour (8.11), screen-reader announcements (6.2, 8.9), programmatic labels and error associations (8.7, 8.8), `inputmode`, `type="email"` and `autocomplete` (5.4), browser title "Error:" prefixes (6.4), behaviour of browser Back (1.2), and 200% / 400% zoom reflow (3.9, 4.8).
- Whether button capitals are CSS styling over sentence-case text (2.6).
- Whether modal backdrops only cover the first 900px (seen in every dialog capture) is a full-page screenshot artefact of position: fixed or a real bug when the page is scrolled.
- Empty states (no UTIs, no results, no codes): every list reviewed had data, so 6.3 and 7.8 are not assessed.
- All of heading 3 (360px and 390px) and most of heading 7: no phone captures and no first-run captures were supplied for this round; the scores given for 3 and 7 are provisional.
- Colour contrast values were estimated by eye, not measured (8.1, 8.2).
