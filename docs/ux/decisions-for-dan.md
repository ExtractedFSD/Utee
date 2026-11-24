# Decisions for Dan

Things found during the UX review that change what the product does, touch health wording, or need a product call. Nothing here has been changed in code.

## Open

1. **Log a UTI saves an empty form.** Tapping "Save and go to Today" with no date changed and no symptoms ticked creates a UTI starting today with no symptoms, and takes you to Today. Found round 1 while testing wrong input. It is a valid thing to record (a UTI that has just started, symptoms not yet known), so I have not blocked it. Options: (a) leave it, (b) require at least one symptom or the "Other" box, (c) ask "Start a UTI from today with no symptoms yet?" before saving. My recommendation is (c): one confirmation, no new fields.

2. **Contact address for the portal footer.** Round 1 found no Help or Contact route anywhere. The new footer on every portal page links to "Your data and privacy" (Settings) and "Your test kits", and shows "Contact Utee" only when the environment variable `NEXT_PUBLIC_SUPPORT_EMAIL` is set in Vercel. Set it to the address you want patients to write to and the link appears on the next deploy. Nothing else is needed.

3. **"S / I / R" expanded on the Results tab.** The footnote now reads "S = sensitive, I = intermediate, R = resistant, as the lab reported it." This is the standard lab meaning of the letters and does not change any result, but it is health wording, so I am flagging it.

4. **Order status words.** The Orders list showed Shopify's raw status ("fulfilled", "processing"). It now says "Sent", "Partly sent" or "Being prepared". Change the words if you prefer others.

5. **Delete buttons are now filled maroon.** Reviewers could not tell "Yes, delete it" from "Cancel" because both were white outlined pills. The destructive button is now the filled pill and Cancel stays outlined. If the brand rule is that only one filled button appears per screen, say so and I will try a different distinction.

6. **Guided setup "Skip for now".** The three about-you questions in Una's setup can now be skipped with one tap, which records "prefer not to say" for the unanswered ones (the same value typing "rather not say" gives). They can be filled in later from Record, About you.

7. **The brand gradient's light end is now #c0507a instead of #f490c0.** Round 2's reviewers measured white text on the old light end at 2.2:1 (the top bar's "Home" and "UTI Passport", the hero's eyebrow and face labels). #c0507a is the lightest pink that gives white text 4.5:1, so the header, heroes and promotional cards all use the deeper start now. It still reads as pink to maroon, just less pastel. If the pastel start matters more, the alternative is dark text on those surfaces, which changes more.

8. **Pre-selected answers.** Reviewers in both rounds object to "Today", "Still going", "Standard culture (NHS lab)" and "7 days" coming pre-selected, because a tired person can save without reading. I removed the one that records a finding ("Normal" on a new scan or blood test, now a required choice). The others are sensible defaults that save taps, so I left them. Say if you want them cleared too.

9. **Saves-as-you-go on the Taking sheet versus Save on the Results and Investigations sheets.** Reviewers call this two models for sibling screens. The Taking sheet now says "Changes save as you go" and shows "Saved", which makes it honest, but making all three explicit-Save would be the consistent choice. It is a bigger change to the Taking sheet, so I have left it for you to call.

10. **Public help and privacy links.** Sign in, Enter kit code and Open a shared Passport have no footer because there is no privacy page URL or contact address to link to. Once you set `NEXT_PUBLIC_SUPPORT_EMAIL` (and tell me the privacy policy URL) I can add the same footer there.

11. **Una and "feeling fine, no symptoms".** With no UTI open, Una now says there is nothing to log and points to Today's diary, instead of asking when the new UTI started. Reviewers would prefer her to save the check-in to the diary herself. That is new behaviour (writing a diary entry from chat), so it is your call.

12. **Day, month and year boxes instead of the native date picker** on the result, scan and taking sheets. The GOV.UK pattern; reviewers raised it in both rounds. The native picker shows day first on UK phones, and the sheets now offer "I don't know the date", so I have not replaced it. It is a medium-sized form change if you want it.

13. **Labels on the kit page's symptom summary** ("Needing to urinate more frequently than normal", "Duration: 1–3 days") repeat the triage form's own wording. Changing them means changing the triage form, which is clinical content, so I left them. "Episodes" became "UTIs" and the internal "(-2)" score is no longer shown.

## Decided

(none yet)
