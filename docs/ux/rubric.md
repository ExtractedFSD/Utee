# UX rubric for the Utee portal and UTI Passport

Built from primary sources read for this review (see `research-notes.md`): Nielsen Norman Group's ten usability heuristics, WCAG 2.2 (W3C Recommendation), Apple Human Interface Guidelines, Material Design 3, the NHS digital service manual (content guide, design system, accessibility) and the GOV.UK Design System (errors, validation, question pages), plus MDN on `inputmode`.

Who it is for: people who get UTIs, often recurrent ones. They may be in pain, anxious, tired, and on a phone. Everything must be obvious, calm and quick at 360px and 390px wide, and must not fall apart at 1280px and 1440px.

## How to score

Each heading is scored 1 to 10 against its criteria, across every screen and state reviewed, not just the best one.

| Score | Meaning |
|---|---|
| 10 | Every criterion met on every screen reviewed. |
| 9 | One minor miss, nothing a user would notice in normal use. |
| 7 to 8 | A few minor misses, or one that slows a user down on one screen. |
| 5 to 6 | At least one major problem: users are slowed or confused on a common task, or the same minor problem repeats across many screens. |
| 3 to 4 | A critical problem on one task: a user cannot complete it, loses data, or is misled. |
| 1 to 2 | Several critical problems, or the heading is essentially not addressed. |

Severity for individual issues:

- **Critical**: a user cannot complete a task, loses what they typed, or is misled about their health record or who can see it.
- **Major**: a user is slowed down or confused on a common task, has to guess, or a stated criterion fails on a primary screen.
- **Minor**: polish; a user would still succeed without noticing.

Thresholds used in this rubric where sources disagree: tap targets 44 by 44 CSS px to pass for primary controls (Apple), 24 by 24 as the hard floor (WCAG 2.2 AA 2.5.8), 48 as the ideal (Material); text contrast 4.5:1, or 3:1 at 24px or 19px bold (WCAG, NHS); body text 16px on the phone, nothing below 14px (NHS); no asterisks, "(optional)" instead (GOV.UK, NHS); validate on submit, not while typing (GOV.UK, NHS).

## 1. Navigation and findability

Is it obvious where everything is?

1. On every screen the user can tell where they are: one page title that names the task or place, not repeated elsewhere.
2. A visible way back one step sits at the top of every sub-page (breadcrumb or back link), and the browser Back button also works and does not repeat a one-time action.
3. The two primary tasks, log a UTI and show my Passport, are one tap from the Passport home and the portal home, with the control in the thumb zone on a phone.
4. Primary navigation is in the same place with the same labels on every page at a given width; the Passport's own navigation (Today, History, Record, Share, Una) is always visible on Passport pages.
5. Link and button text says where it goes or what it does without surrounding context; no "click here", "view", "here"; the text matches the destination's title.
6. Buttons are for actions and links for navigation, and they look different; links do not open new tabs without saying so.
7. Headings form a correct outline (one h1, sections as h2, no skipped levels) so the page scans by eye and by screen reader.
8. Lists and cards lead with a short unique heading that mirrors the destination; no card offers more than three actions.
9. Nothing most users need is hidden behind an expander, a "more" menu or a scroll-sideways row; where a row scrolls sideways there is a visible cue.
10. Old or deep links land somewhere sensible (redirects to the right tab or view) and the address bar reflects the view the user is in.

## 2. Clarity of wording

Plain English, reading age about 9 to 11, labels that say what they do.

1. Sentences are 20 words or fewer; paragraphs are three sentences or fewer (spot-check five on each screen).
2. Reads at about reading age 9 to 11: short common words, no stacked clauses; where a medical term is needed the plain word comes first and the term follows in brackets.
3. NHS vocabulary: "pee" or "urine", not "wee"; "urinary tract infection (UTI)", not "water infection"; "medicine", not "medication"; "pharmacy", not "chemist"; "get" or "have" symptoms, not "develop" or "experience"; "a GP"; "you", never "the patient".
4. Active voice and direct instructions ("Add the date it started"), not passive or abstract ("The start date should be entered").
5. Numbers in NHS style: numerals including 1 and 2; "1 in 4" rather than "25%"; dates as "6 August 2026" with the month in full; times as "5:30pm"; ranges with "to".
6. Sentence case everywhere: headings, buttons, labels, tabs. No Title Case. Capitals only for names and accepted acronyms (NHS, GP, UTI, A&E). Small-caps styling of labels is acceptable only if the underlying text is sentence case.
7. Every button says what happens when you tap it, as a verb phrase ("Save this UTI", "Create a share code"), not "Submit", "OK", "Yes", "Next".
8. Labels and questions are short and in sentence case with no trailing colon; hint text is one short phrase under the label, no full stop, no links.
9. No jargon, codes or developer words reach the screen: no raw keys ("1_2_days"), "null", "undefined", "token", status codes.
10. Where it is not obvious why something is asked, one short sentence says why.
11. Microcopy avoids "please", "sorry", "invalid", "you forgot", exclamation marks and humour.

## 3. Mobile layout (360px and 390px wide)

Thumb reach, tap targets, no sideways scrolling, readable without zooming.

1. No horizontal page scrolling and no clipped content at 360px (and at 320px, the WCAG reflow width).
2. Single column: fields, buttons and cards stack; the only side-by-side fields are day, month and year.
3. Body text is at least 16px; nothing visible is smaller than 14px; lines are at most about 75 characters.
4. Every tappable thing (buttons, list rows, icon buttons, chips, checkboxes and radios with their labels, nav items, faces) has a hit area of at least 44 by 44 CSS px, and nothing interactive is under 24 by 24; neighbours are at least 8px apart.
5. The primary button spans the form's width and there is only one primary button on the screen; it sits in the lower half within thumb reach, or is fixed to the bottom without covering content.
6. Fixed bars (top bar, bottom nav, sticky save bar) never cover the focused input when the keyboard is open, and the page's last content is never hidden under them.
7. Nothing essential sits under the status bar, notch or home indicator; safe areas are respected.
8. Side gutters are consistent (16px convention); spacing between like items is uniform; nothing touches the screen edge.
9. At 200% browser zoom or a large system font, text wraps rather than truncating or overlapping.
10. Sheets, dialogs and toasts fit the viewport, can be closed with a visible control (not only a swipe or tap-outside), and do not trap scrolling.
11. Icon-only controls have a visible label or a clear accessible name; meaning never depends on an icon alone.

## 4. Desktop layout (1280px and 1440px wide)

Sensible use of space, line lengths, nothing stretched or lost.

1. Content has a maximum width (about 960px for pages, a reading column of 60 to 75 characters for text) and is not stretched across the viewport; fields and buttons keep sensible widths.
2. Space is used, not wasted: at 1440px a page with several cards or sections arranges them side by side where that helps scanning, rather than one narrow column with large empty margins and a long scroll.
3. Input widths match the expected answer (short for numbers and dates, wide for free text).
4. The layout is the same at 1280px and 1440px, with no awkward empty region, orphaned element or misaligned column.
5. Multi-column arrangements keep one clear primary action per screen and preserve reading order; the h1 stays near the top left.
6. Hover and focus states are visible on all interactive elements, and the keyboard focus indicator is clearly visible when tabbing.
7. Everything works by keyboard alone (Tab, Shift+Tab, Enter, Space, arrows) in an order that matches the visual order.
8. At 400% zoom from 1280px the page reflows to one column without sideways scrolling.
9. Sticky headers or bars never hide a focused element and take only a small share of the viewport height.
10. Desktop and phone offer the same features under the same names; nothing is phone-only or desktop-only.

## 5. Forms and data entry

Few fields, right keyboard types, sensible defaults, easy to fix mistakes.

1. Each form step asks one thing, or one tightly related group, with the question as the heading; steps are short enough to finish while unwell.
2. Every field has a visible label above it (placeholders are not labels); hints sit under the label and before the field.
3. Optional fields say "(optional)"; no asterisks; every field asked is one the Passport really needs.
4. Keyboard types fit the answer: `inputmode="numeric"` or `"decimal"` for numbers (not `type="number"`), `type="email"` for email, `type="tel"` for phones, `autocomplete` set where a purpose exists; the sign-in code field accepts a pasted or autofilled code.
5. Dates the user knows well are quick to enter (Today, Yesterday, 2 days ago, or day, month and year as text with an example); dates they cannot know exactly offer "not sure" or a coarse choice; calendar pickers are never the only way.
6. Single-choice questions use one-tap options with none pre-selected; multi-choice questions say "choose all that apply" and offer a clear "none of these" where it fits.
7. Validation runs on submit; the user's answers stay on the page; nothing is cleared or lost.
8. Information already known (name, date of birth, last UTI's details, current medicines) is pre-filled or offered, never retyped; anything the app can work out (today's date, a course end date from its length) is computed for the user.
9. Sign-in needs no memory or puzzle: email plus a code, paste works, the code can be resent, and the user lands back where they were going.
10. Before anything irreversible (delete, share, send) there is a clear confirmation that names what will happen; routine saves do not add an extra step.
11. Inputs tolerate real-world entry: spaces and dashes in codes, typed units, upper or lower case, common typos and abbreviations; names and emails are not autocorrected; nothing silently truncates.
12. Double-tapping Save cannot create a duplicate; the button shows a busy state and goes quiet while saving.

## 6. Feedback and states

Loading, empty, success and error states all exist and say what to do next.

1. Anything slower than about a second shows a visible in-place loading state, ideally immediately, and the button that started it shows busy and cannot be tapped again; nothing with consequences happens without telling the user.
2. Status and saved messages are announced politely to screen readers without moving focus; errors move focus to the error summary or field.
3. Every empty state says in one sentence what the screen will show once there is data and offers the single next action; it never looks like an error or a broken page.
4. On a failed submit, an error summary headed "There is a problem" appears at the top of the content, takes focus, and lists each error as a link to its field; the browser title starts with "Error:".
5. Each inline error sits after the label and hint, in red with a hidden "Error:" prefix, with a red border on the field, using the same words as the summary.
6. Error wording says what went wrong and how to fix it in the question's own words ("Enter the date it started"); never "Please", "Sorry", "invalid", a code, or a bare "Something went wrong".
7. Failures that are not the user's doing (offline, server error, expired session, expired share code) get their own message saying what happened, what they can do now and whether their entries are safe.
8. Success is confirmed where the user is (a persistent message or the updated screen), stating what happened and what is next; important confirmations are not a two-second toast.
9. Destructive actions need a confirmation whose button names the action and is not red alone; the result is confirmed.
10. Disabled controls are avoided; where something is unavailable, text next to it says why.
11. Nothing a user typed is lost on refresh, going back, or a slow connection, or the screen warns before it happens.

## 7. First-time experience

A new user understands what the Passport is and what to do first, within 10 seconds.

1. The first Passport screen says in one sentence what it is, who can see it and the one action to start, readable at 360px without scrolling past the primary button.
2. Only what is needed to start is asked first; the user sees value (their Today screen) before deep history is requested; each question says why it is asked.
3. Creating an account and signing in need no password, no puzzle and no memorised code; paste and autofill work.
4. Any guided set-up can be skipped or swapped for a plain form with a visible link, and never blocks the primary task.
5. Logging the first UTI is possible with no knowledge of the app: one question at a time, "not sure" options, sensible defaults such as today's date.
6. What happens to health data (what is stored, where, who can see it, how to export or delete it) is explained in plain English before the first health question, and consent is a specific untouched choice, not pre-ticked.
7. Help and contact routes are visible on the first screens in the place they appear everywhere else.
8. The empty home shows no zero-filled charts or placeholder figures that could be read as real.
9. Defaults are visible and changeable.
10. A returning user lands on their Passport, not on onboarding again.

## 8. Accessibility

Contrast, focus states, keyboard use, screen reader labels, text resizing.

1. Text contrast is at least 4.5:1 (3:1 at 24px or 19px bold) everywhere, including hint text, small labels, pills, text on gradients and on coloured buttons.
2. Non-text contrast is at least 3:1 for field borders, checkbox and radio outlines, focus rings, meaningful icons and chart marks.
3. Nothing is conveyed by colour alone: status pills, severity bars and S/I/R results carry text or an icon too.
4. Every interactive target is at least 24 by 24 CSS px, primary ones 44 by 44.
5. Everything works by keyboard; focus order follows reading order; focus is always visible with a clear indicator; focus is never hidden behind sticky bars or sheets.
6. The page reflows at 320px without two-dimensional scrolling; text spacing overrides and 200% zoom lose nothing.
7. Every control has a programmatic label (a visible label linked to the field, or a legend for a group); hints and errors are associated with the field.
8. Errors are identified in text at the field and announced; a correction is suggested.
9. Live changes (saved, loading, counts, revealed questions) are announced without stealing focus.
10. Images have alt text or are marked decorative; icon buttons have names that say the outcome ("Delete this UTI"), not the icon.
11. Motion respects reduced-motion settings; nothing auto-plays, loops or flashes.
12. Authentication and repeated entry meet WCAG 2.2: paste allowed, autofill supported, no puzzle, known data pre-filled, help in a consistent place.

## 9. Trust and tone

Calm, respectful, never alarming or patronising, clear about what happens with health data.

1. Tone is factual and neutral: no exclamation marks, no jokes, no emoji, no "Oops" or "Yay", including in empty states and errors.
2. No blame: never "you forgot", "you failed", "invalid"; the copy describes the next step.
3. People-first language: "you have a UTI", "people who get UTIs"; never "sufferer", "suffering from", "victim".
4. Reassurance is specific and true to the record, never vague ("don't worry") and never a clinical claim the app cannot stand behind.
5. Warnings are rare and proportionate: at most two per page, each with a short clear heading, used only for time-critical or health-significant information; routine information is never red.
6. Urgent-care wording is calm and exact ("Contact your GP today, or call NHS 111"), never alarm words or shouting capitals.
7. The app describes itself as a record the user keeps and shows to a clinician; it never implies diagnosis or replaces clinical judgement.
8. Where health data is collected, plain English says what is stored, where, who can see it and how to export or delete it, one tap away at most.
9. Sharing is explicit and user-initiated with a clear statement of what will be shown and for how long; nothing is shared by default; the user can see who has opened it.
10. Visual tone is calm: error red is reserved for errors, no decorative red, no countdowns or urgency badges.
11. The user is "you", never "the patient"; no infantilising praise ("Great job!").
12. Copy does not assume gender, age or lifestyle.

## 10. Consistency

Same words, same patterns, same button styles for the same things everywhere.

1. The same action has the same label, icon, colour and position on every screen (Save is always Save; Remove is never also Delete for the same thing).
2. One primary, one secondary and one warning button style, each used with one meaning; never two primary buttons on a screen.
3. Form parts (label above, hint under label, error under hint, red border, "Error:" prefix) are identical on every form, including sheets and chat.
4. Dates, times and numbers use one format throughout (forms, lists, Today, the shared Passport, the PDF).
5. One word per concept everywhere: UTI, not episode or infection in some places; GP, not doctor; result, not test, for lab findings; "Passport" capitalised the same way.
6. Spacing, type sizes and component sizes come from one scale; headings of the same level look the same on every screen; cards have one radius and one shadow.
7. Help, contact and privacy routes appear in the same order and place for a given width.
8. Focus, hover and pressed states look the same for the same kind of control.
9. Each icon means one thing; no action has two icons and no icon has two meanings.
10. Phone and desktop expose the same features with the same names; only the layout changes.
11. Native controls are used where they do the job (checkbox, radio, select, text inputs) rather than custom look-alikes; Back behaves like Back.

## Reviewer output format

For each round the reviewer writes, in this order:

1. A score table: heading, score 1 to 10, one-line justification.
2. Every problem found, one per line, with: screen name and viewport; what is wrong (quote the words or describe the element); the rubric item it breaks (for example 2.7); severity; a proposed fix.
3. Anything that could not be judged from the material supplied, so it can be checked by hand.
