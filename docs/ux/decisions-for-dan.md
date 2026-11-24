# Decisions for Dan

Things found during the UX review that change what the product does, touch health wording, or need a product call. Nothing here has been changed in code.

## Open

1. **Log a UTI saves an empty form.** Tapping "Save and go to Today" with no date changed and no symptoms ticked creates a UTI starting today with no symptoms, and takes you to Today. Found round 1 while testing wrong input. It is a valid thing to record (a UTI that has just started, symptoms not yet known), so I have not blocked it. Options: (a) leave it, (b) require at least one symptom or the "Other" box, (c) ask "Start a UTI from today with no symptoms yet?" before saving. My recommendation is (c): one confirmation, no new fields.

2. **Contact address for the portal footer.** Round 1 found no Help or Contact route anywhere. The new footer on every portal page links to "Your data and privacy" (Settings) and "Your test kits", and shows "Contact Utee" only when the environment variable `NEXT_PUBLIC_SUPPORT_EMAIL` is set in Vercel. Set it to the address you want patients to write to and the link appears on the next deploy. Nothing else is needed.

3. **"S / I / R" expanded on the Results tab.** The footnote now reads "S = sensitive, I = intermediate, R = resistant, as the lab reported it." This is the standard lab meaning of the letters and does not change any result, but it is health wording, so I am flagging it.

4. **Order status words.** The Orders list showed Shopify's raw status ("fulfilled", "processing"). It now says "Sent", "Partly sent" or "Being prepared". Change the words if you prefer others.

5. **Delete buttons are now filled maroon.** Reviewers could not tell "Yes, delete it" from "Cancel" because both were white outlined pills. The destructive button is now the filled pill and Cancel stays outlined. If the brand rule is that only one filled button appears per screen, say so and I will try a different distinction.

6. **Guided setup "Skip for now".** The three about-you questions in Una's setup can now be skipped with one tap, which records "prefer not to say" for the unanswered ones (the same value typing "rather not say" gives). They can be filled in later from Record, About you.

## Decided

(none yet)
