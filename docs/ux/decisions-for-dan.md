# Decisions for Dan

Things found during the UX review that change what the product does, touch health wording, or need a product call. Nothing here has been changed in code.

## Open

1. **Log a UTI saves an empty form.** Tapping "Save and go to Today" with no date changed and no symptoms ticked creates a UTI starting today with no symptoms, and takes you to Today. Found round 1 while testing wrong input. It is a valid thing to record (a UTI that has just started, symptoms not yet known), so I have not blocked it. Options: (a) leave it, (b) require at least one symptom or the "Other" box, (c) ask "Start a UTI from today with no symptoms yet?" before saving. My recommendation is (c): one confirmation, no new fields.

## Decided

(none yet)
