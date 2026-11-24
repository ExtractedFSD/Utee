# UX review rubric: research notes (primary sources)

Research notes for the Utee UTI Passport UX review rubric. Users are often in pain, anxious, tired and on a phone. The app is a Next.js web app in UK English, reviewed at 360px and 390px (mobile) and 1280px and 1440px (desktop).

Date of research: 2026-11-24. Research only; this file is not the rubric.

## Access notes (what could and could not be fetched)

The session's network policy blocked direct fetches of these hosts: `www.nngroup.com`, `www.w3.org`, `m3.material.io`, `service-manual.nhs.uk`, `design-system.service.gov.uk`, `developer.mozilla.org`, `w3c.github.io`, `nhsuk.github.io`, `unpkg.com`, `gist.githubusercontent.com`. `developer.apple.com` HTML pages resolved but are JavaScript-rendered (only the page title came back).

Follow-up (same day): the coordinator reported that `www.nngroup.com`, `m3.material.io`, `www.w3.org`, `service-manual.nhs.uk`, `design-system.service.gov.uk` and `developer.mozilla.org` had been added to the allowlist. Three further fetch attempts, spread over several minutes, still failed with DNS `ENOTFOUND` for every one of those hosts from this session, so the NN/g (sections 1 and 7a) and Material (section 4) content below remains snippet-sourced and is flagged as such. Those two sections should be re-verified against the live pages once the allowlist is confirmed to be active for this session; no other section depends on them.

Workarounds used, all of them the same primary text served from a different host:

- WCAG 2.2: the W3C's own source repository, `raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/...` (normative SC text) and `.../understanding/22/...` (Understanding pages). This is the editors' source of the Recommendation; wording checked against the thresholds quoted on the published Understanding pages via search snippets.
- GOV.UK Design System: the published site's own source, `raw.githubusercontent.com/alphagov/govuk-design-system/main/src/...`.
- NHS digital service manual: the published site's own source, `raw.githubusercontent.com/nhsuk/nhsuk-service-manual/main/app/views/...`. Some pages are Nunjucks templates that only include partials; where a partial path could not be guessed (formatting and punctuation, two accessibility partials, confirmation pages) it is noted as unavailable and search snippets of the live page are used.
- MDN inputmode: the MDN content repository, `raw.githubusercontent.com/mdn/content/main/files/en-us/web/html/reference/global_attributes/inputmode/index.md`.
- Apple HIG: Apple's DocC JSON endpoints behind the HIG site, `developer.apple.com/tutorials/data/design/human-interface-guidelines/{layout,accessibility,typography}.json`. These are the same content the HTML pages render.
- Material Design 3: `m3.material.io` was unreachable and has no public source repository. Used Google's own Android developer documentation (`developer.android.com`), which restates the Material touch-target, contrast and window-size-class figures and links to the M3 pages, plus search snippets of the M3 pages themselves. Figures that only came from third parties are flagged.
- NN/g: no alternative host exists. Both articles are summarised from search-engine snippets that quote the live pages; marked as "snippet-sourced" and lower confidence.

---

## 1. Nielsen Norman Group, 10 Usability Heuristics for User Interface Design

Intended URL: https://www.nngroup.com/articles/ten-usability-heuristics/ (not fetchable from this session; content below is snippet-sourced from the live page via search. Confidence: medium. Wording of heuristic names is stable; tip wording may differ slightly.)

Criteria extracted:

- #1 Visibility of system status: "keep users informed about what is going on, through appropriate feedback within a reasonable amount of time". Testable: every action that takes more than about a second shows a visible state change (loading, saved, sent); the user can tell the outcome of their last action without guessing.
- #2 Match between system and the real world: use words, phrases and concepts familiar to the user "rather than internal jargon"; information appears "in a natural and logical order". Testable: no developer or clinical jargon without a plain-English equivalent; order of fields matches how a patient would tell the story (when it started, symptoms, what they took, what happened).
- #3 User control and freedom: a "clearly marked 'emergency exit'" such as Cancel, Back or Undo so users can leave an unwanted action "without having to go through an extended process". Testable: every multi-step flow has a visible Back/Cancel; destructive actions can be undone or are confirmed first.
- #4 Consistency and standards: follow platform and industry conventions; inconsistency "may increase the users' cognitive load by forcing them to learn something new". Testable: the same action has the same label, icon and position everywhere; buttons look like buttons, links like links.
- #5 Error prevention: "eliminate error-prone conditions, or check for them and present users with a confirmation option before they commit"; prevention is better than good error messages. Testable: constrained inputs (pickers, radios) used where free text invites errors; confirmation before delete; sensible defaults.
- #6 Recognition rather than recall: "minimize the user's memory load by making elements, actions, and options visible"; "It's best if the system doesn't need any additional explanation". Testable: the user never has to remember a value from a previous screen to complete the current one; options are shown, not recalled.
- #7 Flexibility and efficiency of use: accelerators "hidden from novice users" may speed up experts. Testable: returning users can repeat a common task (log a new episode) in fewer steps than first-time users, without making the first-time path harder.
- #8 Aesthetic and minimalist design: "keeping the content and visual design focused on the essentials"; "Ensure that the visual elements of the interface support the user's primary goals". Older wording: every extra unit of information "competes with the relevant units of information and diminishes their relative visibility". Testable: no screen contains content the user does not need for the task at hand.
- #9 Help users recognize, diagnose, and recover from errors: error messages "expressed in plain language (no error codes), precisely indicate the problem, and constructively suggest a solution". Testable: each error says what is wrong and what to do, in plain English, with no codes.
- #10 Help and documentation: help should be "easy to search", "focused on the user's task", "concise", and list "concrete steps"; provide help in context at the moment it is needed. Testable: help is reachable from where the question arises, not only from a separate page.

---

## 2. WCAG 2.2 (W3C Recommendation)

URLs read (W3C source repository of the Recommendation):

- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/20/contrast-minimum.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/20/resize-text.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/21/reflow.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/21/non-text-contrast.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/21/text-spacing.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/20/keyboard.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/20/focus-order.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/20/focus-visible.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/22/focus-not-obscured-minimum.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/22/target-size-minimum.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/22/consistent-help.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/20/error-identification.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/20/labels-or-instructions.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/20/error-suggestion.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/22/redundant-entry.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/22/accessible-authentication-minimum.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/21/status-messages.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/terms/20/large-scale.html
- https://raw.githubusercontent.com/w3c/wcag/main/guidelines/terms/21/status-message.html
- https://raw.githubusercontent.com/w3c/wcag/main/understanding/22/target-size-minimum.html

(Canonical published URLs: https://www.w3.org/TR/WCAG22/ and https://www.w3.org/WAI/WCAG22/Understanding/ , unreachable from this session.)

Criteria extracted (normative wording quoted):

- 1.4.3 Contrast (Minimum), Level AA: text and images of text have a contrast ratio of "at least 4.5:1", except "Large-scale text and images of large-scale text have a contrast ratio of at least 3:1"; incidental text (inactive components, pure decoration, not visible) and logotypes have no requirement. Definition of large scale: "at least 18 point or 14 point bold" (roughly 1.5em/150% and 1.2em/120% of default body size; in CSS at 16px body that is about 24px regular or about 18.7px bold; the NHS rounds this to 24px+ or 19px+ bold).
- 1.4.4 Resize Text, Level AA: "text can be resized without assistive technology up to 200 percent without loss of content or functionality" (captions and images of text excepted). Test: browser zoom 200% at 1280px.
- 1.4.10 Reflow, Level AA: content presented "without loss of information or functionality, and without requiring scrolling in two dimensions for: Vertical scrolling content at a width equivalent to 320 CSS pixels; Horizontal scrolling content at a height equivalent to 256 CSS pixels", except parts "which require two-dimensional layout for usage or meaning" (data tables, maps, diagrams). Note: "320 CSS pixels is equivalent to a starting viewport width of 1280 CSS pixels wide at 400% zoom." Test: 320px viewport, or 1280px at 400% zoom, no horizontal scrollbar.
- 1.4.11 Non-text Contrast, Level AA: "contrast ratio of at least 3:1 against adjacent color(s)" for "Visual information required to identify user interface components and states, except for inactive components" and for "Parts of graphics required to understand the content". Applies to input borders, focus rings, checkbox/radio outlines, icons that carry meaning.
- 1.4.12 Text Spacing, Level AA: no loss of content or functionality when setting "Line height (line spacing) to at least 1.5 times the font size; Spacing following paragraphs to at least 2 times the font size; Letter spacing (tracking) to at least 0.12 times the font size; Word spacing to at least 0.16 times the font size." Test: apply a text-spacing bookmarklet; check nothing clips or overlaps.
- 2.1.1 Keyboard, Level A: "All functionality of the content is operable through a keyboard interface without requiring specific timings for individual keystrokes" (path-dependent input excepted).
- 2.4.3 Focus Order, Level A: "focusable components receive focus in an order that preserves meaning and operability."
- 2.4.7 Focus Visible, Level AA: "Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible."
- 2.4.11 Focus Not Obscured (Minimum), Level AA (new in 2.2): "When a user interface component receives keyboard focus, the component is not entirely hidden due to author-created content." Typical failures: sticky headers/footers, cookie banners, bottom sheets covering the focused control.
- 2.5.8 Target Size (Minimum), Level AA (new in 2.2): "The size of the target for pointer inputs is at least 24 by 24 CSS pixels, except when:" Spacing: "Undersized targets (those less than 24 by 24 CSS pixels) are positioned so that if a 24 CSS pixel diameter circle is centered on the bounding box of each, the circles do not intersect another target or the circle for another undersized target"; Equivalent: "The function can be achieved through a different control on the same page that meets this criterion"; Inline: "The target is in a sentence or its size is otherwise constrained by the line-height of non-target text"; User agent control: "The size of the target is determined by the user agent and is not modified by the author"; Essential: "A particular presentation of the target is essential or is legally required". Understanding page: a target passes if a solid 24 by 24 CSS px square fits inside it; zoom cannot be used to pass; the Working Group chose "the smaller measure of 24 by 24 CSS pixels" while 2.5.5 Target Size (Enhanced), Level AAA, uses "44 by 44 CSS pixel". Worked examples: 24px menu items pass; 18px-tall menu items fail; 20x20 icon buttons with 4px gaps pass, with 0px gaps fail; links in paragraphs are excepted.
- 3.2.6 Consistent Help, Level A (new in 2.2): if a set of pages repeats any of "Human contact details; Human contact mechanism; Self-help option; A fully automated contact mechanism", they "occur in the same order relative to other page content, unless a change is initiated by the user". Help may be a link to a help page.
- 3.3.1 Error Identification, Level A: "If an input error is automatically detected, the item that is in error is identified and the error is described to the user in text."
- 3.3.2 Labels or Instructions, Level A: "Labels or instructions are provided when content requires user input."
- 3.3.3 Error Suggestion, Level AA: "If an input error is automatically detected and suggestions for correction are known, then the suggestions are provided to the user, unless it would jeopardize the security or purpose of the content."
- 3.3.7 Redundant Entry, Level A (new in 2.2): "Information previously entered by or provided to the user that is required to be entered again in the same process is either: auto-populated, or available for the user to select", except when "re-entering the information is essential", required "to ensure the security of the content", or "previously entered information is no longer valid".
- 3.3.8 Accessible Authentication (Minimum), Level AA (new in 2.2): "A cognitive function test (such as remembering a password or solving a puzzle) is not required for any step in an authentication process unless that step provides at least one of": "Another authentication method that does not rely on a cognitive function test", "A mechanism is available to assist the user in completing the cognitive function test" (password manager support, copy and paste allowed), "The cognitive function test is to recognize objects", "The cognitive function test is to identify non-text content the user provided to the website". Practical test: password field allows paste and browser autofill; no CAPTCHA puzzle; magic-link or passkey counts as an alternative.
- 4.1.3 Status Messages, Level AA: "status messages can be programmatically determined through role or properties such that they can be presented to the user by assistive technologies without receiving focus." Definition of status message: "change in content that is not a change of context, and that provides information to the user on the success or results of an action, on the waiting state of an application, on the progress of a process, or on the existence of errors." Practical test: toasts, "Saved", "Loading", "3 results" regions have `role="status"`/`aria-live="polite"` (or `role="alert"` for errors).

---

## 3. Apple Human Interface Guidelines (Layout, Accessibility, Typography)

URLs read (Apple's DocC JSON for the same pages):

- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/layout.json
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/typography.json (first 200,000 of 281,026 characters read; remainder is non-iOS size tables)

(Canonical HTML URLs: https://developer.apple.com/design/human-interface-guidelines/layout , .../accessibility , .../typography ; they render via JavaScript so WebFetch saw only titles.)

Criteria extracted:

- Control size (Accessibility, Mobility): iOS/iPadOS "Default control size 44x44 pt", "Minimum control size 28x28 pt". (watchOS 44/28; macOS 28/20; visionOS 60/28; tvOS 66/56.) Note: current HIG frames 44 pt as the default, with 28 pt as an absolute floor; the "Layout" page itself no longer carries a 44 pt sentence.
- Spacing around controls: "it works well to add about 12 points of padding around elements that include a bezel. For elements without a bezel, about 24 points of padding works well around the element's visible edges."
- Text size: iOS/iPadOS "Default size 17 pt", "Minimum size 11 pt". "If you're using a custom font with a thin weight, aim for larger than the recommended sizes."
- Text enlargement: "give people the option to enlarge text by at least 200 percent".
- Contrast table (Accessibility): "Up to 17 pts, All weights, 4.5:1"; "18 pts, All weights, 3:1"; "All sizes, Bold, 3:1". "check the minimum contrast in both light and dark appearances." Note: Apple's bold exception at any size is looser than WCAG (14pt bold), so follow WCAG.
- Colour: "Convey information with more than color alone"; red-green and blue-orange pairings are specifically hard; "Offer visual indicators, like distinct shapes or icons, in addition to color".
- Gestures: "Make sure your UI's core functionality is accessible through more than one type of physical interaction" (e.g. swipe to dismiss must also have a button).
- Motion: when Reduce Motion is on, reduce "automatic and repetitive animations, including zooming, scaling, and peripheral motion"; prefer fades over x/y/z transitions; "Be cautious with fast-moving and blinking animations." Web equivalent: honour `prefers-reduced-motion`.
- Views: "Prefer dismissing views with an explicit action" (avoid auto-dismissing timed toasts for anything important).
- iOS text styles at default (Large) size, pt size/leading: Large Title 34/41; Title 1 28/34; Title 2 22/28; Title 3 20/25; Headline 17/22 semibold; Body 17/22; Callout 16/21; Subhead 15/20; Footnote 13/18; Caption 1 12/16; Caption 2 11/13. Body leading is about 1.3x size.
- Weights: "In general, avoid light font weights"; prefer Regular, Medium, Semibold, Bold; avoid Ultralight, Thin, Light.
- Leading: "If you need to display three or more lines of text, avoid tight leading even in areas where height is limited."
- Hierarchy: "Minimize the number of typefaces you use"; "Prioritize important content when responding to text-size changes" (not everything should scale equally); keep primary elements near the top at large sizes.
- Truncation: avoid truncating text in scrollable regions; show as much useful text at the largest accessibility size as at the largest standard size.
- Layout: "Order content by relative importance"; "place the most important items near the top and leading side"; "Align elements to make them easier to scan, and use indentation to convey hierarchy"; "Use progressive disclosure to make layouts cleaner"; "Differentiate controls from content"; "Use consistent spacing. When content isn't consistently spaced, it no longer looks like a grid and it's harder for people to scan."
- Adaptivity: "Determine layout based on size classes, not device type or orientation"; "Keep functionality the same as size classes change"; "Support Dynamic Type by adjusting your layout to accommodate text at larger sizes."
- Safe areas: "Respecting the safe area is essential to make sure system UI and hardware features like the Dynamic Island don't obstruct content and controls." Web equivalent: `viewport-fit=cover` with `env(safe-area-inset-*)`; nothing fixed to the very bottom without inset.

---

## 4. Material Design 3 (touch targets, layout, readability)

Intended URLs (unreachable): https://m3.material.io/foundations/accessible-design/accessibility-basics and https://m3.material.io/foundations/layout/understanding-layout/overview

URLs actually read (Google's Android design/dev docs that restate and link to the M3 figures):

- https://developer.android.com/design/ui/mobile/guides/foundations/accessibility
- https://developer.android.com/guide/topics/ui/accessibility/apps
- https://developer.android.com/develop/ui/compose/layouts/adaptive/window-size-classes
- https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-basics
- https://developer.android.com/design/ui/mobile/guides/layout-and-content/adapt-layout
- https://developer.android.com/codelabs/adaptive-material-guidance

Criteria extracted:

- Touch target: "Ensure all touch targets are at least 48 dp, even if this extends past the UI element visual" and "touch target size, of at least 48dpx48dp. Larger is even better." M3 grids-and-spacing page (snippet): "Accessible targets should retain a minimum of 48x48dp, even if the visual element, such as an icon, is smaller."
- Spacing between targets: Material density guidance / Android accessibility help (snippet-sourced): at least 8dp between targets.
- Text contrast: "If the text is smaller than 18sp, or if the text is bold and smaller than 14sp, use ... at least 4.5:1. For all other text, set the color contrast ratio to at least 3:1." (Matches WCAG.)
- Non-text contrast: "Use a 3:1 ratio between surfaces and non-text elements. For example, the ratio of a background to an icon would be 3:1."
- Body text size: "Don't make the body size any smaller than 12 sp." Specify text in scalable units so users can enlarge it.
- "Use more than one visual affordance for actions like links" (not colour alone).
- Window size classes (official table): Compact width < 600dp; Medium 600 to < 840dp; Expanded 840 to < 1200dp; Large 1200 to < 1600dp; Extra-large >= 1600dp. "Window size classes map to the compact, medium, and expanded breakpoints in the Material Design layout guidance." For this app: 360px and 390px are Compact; 1280px is Large; 1440px is Large.
- Margins: Expanded "leading and trailing margin of 24dp", pane spacer "24dp" (official M3 breakpoints page, snippet). Compact 16dp and Medium 24dp margins are widely reproduced but only confirmed here from third-party sources (flag as medium confidence).
- Panes: "Compact sizes should stick to a one pane layout. Medium can use 1–2 pane layouts. Large and extra-large can use multiple pane layouts."
- Desktop width: "Set a max width on content and components to prevent stretching full width"; "Make sure inputs and buttons are not stretched"; "Allow a component to change its presentation. For example, a bottom sheet can become a side sheet at larger sizes."
- Line length: "Sticking to a max line length of 60 characters will assist readability" (codelab).
- Keyboard: "If the keyboard is present, move the input up into a focused state"; don't "Hide inputs. Even on smaller screens, the user might not know or be able to scroll the screen."
- Ergonomics: "Keep essential interactions, like primary navigation, in a reachable screen area."
- Density of actions: "Don't overwhelm your user with too many actions per view."
- Alignment: "Establish consistent spacing between like elements"; inconsistent spacing "can make designs appear haphazard."
- Containment: "Use containment to group related content to guide the user through content and actions" (cards).
- Orientation: "Avoid locking your app to portrait only."
- Screen readers: describe UI elements; "Set decorative item descriptions to null"; "Don't rely on gestures to complete all actions".

---

## 5. NHS digital service manual (content guide, design system components, accessibility)

URLs read (site's own source on GitHub; canonical URL in brackets):

Content guide
- https://raw.githubusercontent.com/nhsuk/nhsuk-service-manual/main/app/views/content/how-we-write.njk (https://service-manual.nhs.uk/content/how-we-write)
- https://raw.githubusercontent.com/nhsuk/nhsuk-service-manual/main/app/views/content/health-literacy.njk (/content/health-literacy)
- https://raw.githubusercontent.com/nhsuk/nhsuk-service-manual/main/app/views/content/numbers-measurements-dates-time.njk (/content/numbers-measurements-dates-time)
- https://raw.githubusercontent.com/nhsuk/nhsuk-service-manual/main/app/views/content/a-to-z-of-nhs-health-writing.njk (/content/a-to-z-of-nhs-health-writing)
- https://raw.githubusercontent.com/nhsuk/nhsuk-service-manual/main/app/views/content/inclusive-content/disabilities-and-conditions.njk (/content/inclusive-content/disabilities-and-conditions)
- Formatting and punctuation: source path not found (404 on two guesses); snippet-sourced from https://service-manual.nhs.uk/content/formatting-and-punctuation.
- Not found in the NHS manual: a dedicated page on writing for anxious or stressed users. The closest NHS guidance is the warning callout page ("reassure people, not scare them") and the A to Z entries on "suffering from", "condition", "symptoms". GOV.UK's content design guidance was not fetchable to cross-check.

Design system components
- buttons: .../app/views/design-system/components/buttons/index.njk (/design-system/components/buttons)
- text-input, radios, checkboxes, error-message, error-summary, date-input, hint-text, inset-text, warning-callout, details, summary-list, card: .../app/views/design-system/components/<name>/index.njk (/design-system/components/<name>)
- patterns: question-pages, check-answers (/design-system/patterns/...). confirmation-pages: 404, not read.
- styles: colour, typography, focus-state, layout (/design-system/styles/...)

Accessibility
- .../app/views/accessibility/what-all-nhs-services-need-to-do.njk (/accessibility/what-all-nhs-services-need-to-do)
- .../app/views/accessibility/new-criteria-in-wcag-2-2.njk (/accessibility/new-criteria-in-wcag-2-2)
- partials read: check-colour-contrast, define-focus-styles, do-not-rely-on-colour-or-position-alone, label-form-fields-clearly, write-good-link-and-form-control-names, give-users-time-to-read-and-act, highlight-errors-in-forms. Not found: use-plain-english, write-descriptive-page-titles (404 on guessed paths).

### 5a. Content style criteria

- Reading age: "a reading age of 9 to 11 years old"; where medical content makes that impossible, "make sure that an 11 to 14-year old will understand".
- "We use short sentences of up to 20 words." "We use short paragraphs of up to 3 sentences."
- Active voice: "find a pharmacy", not "a pharmacy can be found".
- Plain term first, medical term in brackets: "piles (haemorrhoids)". Explain medical terms that are not commonly known.
- Prefer short words: "have" or "get", not "experience".
- Content is "factual, neutral and unambiguous"; no metaphors; avoid subjective words ("good", "bad", "easy") except where users use them for symptoms ("bad pain").
- Use specific figures, not vague reassurance: "4 out of 5 people recover fully in a week", not "a good chance of recovery".
- Health literacy: "more than 4 in 10 adults struggle with health content for the public"; "more than 6 in 10 adults struggle with health content that includes numbers and statistics". Do not rely on readability tools; test with users.
- A to Z entries directly relevant to this app:
  - "We use 'urinary tract infections (UTIs)', not 'water infections'."
  - "We use the nouns 'pee' and 'urine'." "We do not use 'wee' because it can confuse people who use voice technologies or screen readers." Verb: "pee", not "urinate" or "pass urine".
  - "We say that people may 'get' or 'have' symptoms, not 'develop' or 'experience' them."
  - "We do not use 'suffering from'." People "have or live with" a condition. Avoid "afflicted by", "victim of".
  - "We use 'condition', 'problem' or 'illness'" rather than "disease" or "disorder".
  - Address the user as "you"; "patients" only in content for health professionals.
  - "We mostly use 'GP'"; "a GP" for getting care, "your GP" for ongoing care. "We use 'A&E'" without spelling it out.
  - "We use 'pharmacy', not 'chemist'." "We use 'medicine', not 'medication'." Over the counter: "medicine you buy (from a pharmacy or shop)".
  - "111 online is not for children under 5."
- Numbers: numerals for all numbers including 1 and 2 ("3 days", "1 in 7"); comma in 1,000; avoid two sets of numerals side by side ("one or two 200mg tablets"); avoid decimals except money, dosage and test results; leading zero "0.25"; ordinals "2nd", "5th" with same-size letters (no superscript, screen readers); not in fixed phrases ("first aid").
- Statistics: "1 in 7 people" rather than "14.3% of people"; spell out common fractions ("two-thirds"); prefer "1 in 2" or "half" to percentages; do not mix formats.
- Dosage: no space between amount and unit: "250mg to 500mg". Temperature: "38C".
- Dates: "6 August 2018"; add the day when helpful: "Wednesday 6 August 2018"; months in full (no "Jan", "Feb").
- Times: 12-hour clock with am/pm and a colon: "5pm", "5:30pm"; "midnight" and "midday"; no 24-hour clock, no "5.00pm". Durations in words: "6 hours 30 minutes".
- Ranges: "to", not hyphens or dashes: "Monday to Friday, 2pm to 6pm".
- Formatting (snippet-sourced): always sentence case, including page titles and headings (proper nouns excepted); avoid dashes, use commas, brackets, shorter sentences or subheadings instead; bold sparingly; no italics or underlining except links.
- Links: text should make sense out of context and say where it goes ("Find your nearest A&E"); match the destination heading; avoid "click here" and "read more"; "find out about" rather than "see"; "Avoid opening links in new tabs or windows"; for documents include type and size "(PDF, 200KB)".

### 5b. Component criteria

Buttons
- "Use buttons to start transactional journeys and carry out actions, like saving information." Do not use buttons for links between content pages or to external sites.
- "Use only 1 primary button on a page." "Try not to have multiple buttons on a page."
- "Align the primary action button to the left edge of the form." On small screens buttons stretch full width (easier one-handed).
- Button text: sentence case, describes the action: "Start now", "Log in", "Continue", "Add another", "Save and continue", "Confirm and send".
- Secondary buttons for optional/less important actions. Warning button only for destructive actions that cannot be undone, preceded by a confirmation step; "Do not rely on red alone".
- Disabled buttons: "poor contrast and can confuse some users"; use only if research shows they help.
- Double submission: show feedback (spinner/modal) first; `data-prevent-double-click`; protect server-side too.
- Reverse/white buttons need a 3:1 background contrast (1.4.11).

Text input
- "Give it a visible label." Labels above inputs, short, sentence case, no colon. Single-question pages: label is the h1.
- "Do not use placeholder text as a label" (disappears when typing; contrast and screen reader issues).
- Width should match the expected answer: fixed widths for known-length content (postcode, phone, NHS number); fluid otherwise.
- Whole numbers: `inputmode="numeric"`; turn off HTML5 validation (`novalidate`). GOV.UK adds: decimals `inputmode="decimal"`; avoid `type="number"` (scroll changes value, no feedback on non-numeric text); `spellcheck="false"` for names, emails, references; `autocomplete` attribute required in production (WCAG 1.3.5); avoid `maxlength`.
- Codes users will not remember (NHS number, reference): monospace with letter spacing (`nhsuk-input--code`).
- Prefix/suffix outside the input and also stated in the label ("Cost, in pounds"); accept the symbol if the user types it.
- "Do not disable copy and paste."

Radios
- "Use radios if users can only choose 1 option from a list." Fieldset + legend (usually the question, and the h1 on a one-question page).
- Order alphabetically by default ("If in doubt, order alphabetically"); or by frequency with care.
- "Do not pre-select options." Radios to the left of labels. Hint "Select 1 option" if unclear.
- Include "None of these" or "I do not know" where valid, after an "or" divider.
- Inline radios only for 2 short options; stack on small screens; no conditional reveal on inline radios.
- Conditional reveal: only questions, keep simple, otherwise next page. Known issue: reveal not announced (fails 4.1.2).

Checkboxes
- For "select more than 1 option" or toggle one option on/off. Fieldset + legend.
- Add hint such as "Select all the options that are relevant to you". Alphabetical by default. Do not pre-select.
- "None" option last after an "or" divider, repeating the question ("No, I do not have any of these symptoms"), exclusive behaviour, avoid "none of the above".
- Small checkboxes only for dense/repeat-use contexts.

Error message
- Only on submit: "Do not show them when a user selects or tabs to a field, types, or moves away from a field."
- Red text after the question and hint; red left border on the group; red border on the field.
- Hidden "Error:" prefix so screen readers hear "Error: Date of birth must be in the past".
- "Focus on telling users how to fix the problem rather than describing what's gone wrong."
- Do not clear the form fields. Same wording in summary and inline.
- Not for ineligibility or permission problems (use an explanatory page with a way out).

Error summary
- "When a user makes a mistake, you must show an error summary at the top of the page" plus inline messages; "even if there's only 1 mistake".
- Heading "There is a problem". Top of `main`, below back link/breadcrumb, above the h1. Move keyboard focus to it. Add "Error: " to the `<title>`.
- Each item links to the field (first field for date inputs; first radio/checkbox for groups).

Date input
- "Use date input when you're asking users for a date they already know." "Do not use date input if users are unlikely to know the exact date." Three fields (day, month, year), fieldset/legend, legend as h1 on one-question pages.
- `autocomplete="bday-day|bday-month|bday-year"` for date of birth (WCAG 1.3.5). GOV.UK adds: accept "january"/"jan"; "Never automatically tab users between fields"; hint example date must be valid for the question.
- GOV.UK error templates: "Enter your date of birth"; "Date of birth must include a month"; "Year must include 4 numbers"; "Date of birth must be a real date"; "[x] must be in the past"; "[x] must be today or in the past"; "[x] must be between [date] and [date]".

Hint text
- "Use hint text to show information that helps the majority of users answer the question." Single short phrase or sentence, no full stops, no links, no interactive elements. "If you need to give a long, detailed explanation, do not use hint text." Screen readers read the whole hint on focus.

Inset text
- For content that "needs to stand out from the rest of the page". "Do not use inset text in transactional pages." "Do not use inset text if you need to tell a user to contact their GP or get medical help" (use care cards). Not for time-critical or health-significant information (use warning callout). Hidden "Information: " prefix. "Don't overdo inset text."

Warning callout
- For information that is time critical, "could have a significant effect on someone's health", or "addresses a common or significant misconception or mistake".
- "Try to give the callout a short, clearly worded heading"; hidden "Important:" prefix unless the heading contains "important".
- "Make the callout concise, specific and self-contained." "Avoid having more than 2 callouts on a page." Aim is "to reassure people, not scare them". Not tested in forms/transactional pages; not for urgent care (care cards).

Details
- For content "only some users will need"; "Do not use it to hide information that most users will need." Short, descriptive summary text. In forms users were reluctant to expand details (thought it was a link that would lose progress).

Summary list
- For key-value pairs and summarising answers (check answers). "Change" links with visually hidden context ("Change date of birth"); pre-populate when changing. Not for tabular data.

Card
- "Use a card to visually group related content and actions"; "Do not use a card to highlight content on a page of long form content." Each card: short, unique heading; short text; at most 3 action links; links mirror the destination heading. Avoid wrapping the whole card in one anchor. Check thirds/quarters on small screens. Primary (chevron) vs secondary cards for prominence.

Patterns
- Question pages: "Make sure you know why you're asking every question and only ask users for information you really need"; start with 1 question per page; "Question pages must include a: back link, page heading, way for users to input information, continue button"; heading is the question and sits in the legend/label; "Do not use the same page heading across multiple pages"; button "Continue", not "Next", left-aligned; allow "I do not know"; "do not break the browser back button"; ask once per journey; progress indicators only if research shows need. GOV.UK adds: "(optional)" on optional labels/legends; "Never mark mandatory fields with asterisks".
- Check answers: single page "immediately before the confirmation screen"; summary lists with "Change" links; skipped optional answers show "Not provided"; send button states the action ("Confirm and send", "Confirm and save"); after a change return to check answers; make clear the transaction is not complete until confirmed.

### 5c. Styles and accessibility criteria

- Typography: "The default paragraph font size is 19px on large screens and 16px on small screens." Small text 16px/14px, use sparingly. Lead paragraph 26px once per page. Transactional h1 uses heading-l (not xl). Links blue and underlined; visited state distinguished; white links need 4.5:1. Left-aligned text; centre/justify only with a clinical or user need.
- Layout: breakpoints Mobile 320px, Tablet 641px, Desktop 769px, Large desktop 990px; default maximum page width 960px; "lines of text content should be no longer than 70 to 80 characters"; "Design for mobile first using a single-column layout and work up to wider layouts"; grid columns apply from 769px; smaller vertical padding recommended for transactional services.
- Colour contrast table (WCAG 2.2 AA / AAA): small text (under 24px, or under 19px bold) 4.5:1 / 7:1; large text (24px+, or 19px+ bold) 3:1 / 4.5:1; components (inputs, buttons) 3:1 / 4.5:1; graphic elements (icons) 3:1 / 4.5:1. Inactive components exempt but recommended to meet anyway. Red, yellow and green shades are the risky ones. Error colour reserved for error states.
- Focus state: yellow background plus thick black bottom border on links; yellow outline plus thick black border on inputs, radios and checkboxes; designed to meet non-text contrast on any NHS background; "The browser default is generally not good enough"; sticky headers and cookie banners must not obscure the focused element (2.4.11).
- Do not rely on colour or position alone: avoid "Press the red button on the right".
- Labels: "every form field has a label that tells users what information they need to enter"; label click moves focus to the field (`for`/`id` match); grouped fields have a legend.
- Time limits: inactivity time limits "at least 20 hours"; warn how much time is left and allow extension.
- Errors: "error messages clearly describe what went wrong and how to fix the problem"; message visibly connected to its input; summary items link to and focus the field.
- What all NHS services must do: "at least level AA of the Web Content Accessibility Guidelines (WCAG 2.2)" and aim for AAA; Equality Act 2010 and Public Sector Bodies Accessibility Regulations 2018; publish an accessibility statement; test with "a range of assistive technologies"; automated testing plus manual checks; include people with access needs in research.
- NHS summary of new 2.2 criteria: "Interactive content must have a minimum size of 24 by 24 CSS pixels" (links in text excepted); sticky headers/footers must not hide focus; drag actions need a single-pointer alternative; "A user should not have to enter the same information more than once on a single journey"; "If you need the user to enter a password, they should be able to copy and paste it"; help "presented consistently across pages".

---

## 6. GOV.UK Design System (error message, validation, question pages)

URLs read (site's own source; canonical in brackets):

- https://raw.githubusercontent.com/alphagov/govuk-design-system/main/src/components/error-message/index.md (https://design-system.service.gov.uk/components/error-message/)
- https://raw.githubusercontent.com/alphagov/govuk-design-system/main/src/patterns/validation/index.md (/patterns/validation/)
- https://raw.githubusercontent.com/alphagov/govuk-design-system/main/src/patterns/question-pages/index.md (/patterns/question-pages/)
- Also read for templates: components/error-summary, text-input, date-input, button (same repository).

Criteria extracted:

Error message
- Show "next to the field, in red, after the question and hint text"; red border connecting message to question; also list every error in an error summary; same wording in both; "Don't clear any form fields when showing errors."
- "Say what went wrong and how to fix it." "Use plain English, positive language, and get to the point." "Read the message aloud. If it doesn't sound like something you would say, rewrite it."
- Reuse the question's words: label "How many hours do you work a week?" gives "Enter how many hours you work a week."
- Specific messages for specific problems (empty, too long, too short, disallowed characters, wrong format). Use instructions for empty fields ("Enter your name") and descriptions for invalid entries ("Name must be 35 characters or less"), consistently.
- Avoid: technical jargon or codes; "forbidden", "illegal", "prohibited", "you forgot"; "Please" (implies a choice); "Sorry" (doesn't help); "valid"/"invalid"; humour or informality; generic messages "An error occurred", "This field is required", "Select an option", "Answer the question".
- Not for ineligibility or service problems; send the user to a page explaining what to do next.
- Hidden "Error:" prefix for screen readers.
- Track how often users see each error.

Validation pattern
- Refuse information that "cannot be correct", is "too ambiguous to use", or is "missing when required". Validate "when the user tries to move on", not on leaving a field; "Generally avoid validating while the user is still typing."
- Ignore unwanted characters (spaces, hyphens, brackets, full stops) in numbers and codes and from copy/paste or dictation; accept unambiguous format variations (postcodes with/without spaces; names with apostrophes and accents).
- On error: show the page again with fields as filled; add "Error: " to the start of the `<title>`; show the error summary at the top and move focus to it; show inline messages.
- Always validate server-side; add client-side only with evidence; rules must not conflict.
- "Turn off HTML5 validation by adding `novalidate`"; "Do not add `required` to input fields."

Question pages
- Ask only what you need; make clear why each question is asked; allow "I do not know"/"I'm not sure".
- "(optional)" on optional labels (or legends for radios/checkboxes); "Never mark mandatory fields with asterisks."
- Every question page: back link, page heading, continue button; progress indicator optional and evidence-led.
- Ask each piece of information once per journey; pre-populate or offer carried-forward answers (ties to WCAG 3.3.7).
- Back link at top; don't break browser back; one-time actions (payments) show a sensible message rather than repeating.
- One question per page by default; legend/label text is the h1; no repeated headings across pages; section name via caption ("About you").
- Hint text: one short sentence, no full stops, no links.
- Complex questions: statement h1, explanatory text, then a specific label above the input.
- Button "Continue", not "Next"; left-aligned.
- Avoid range sliders; if used, provide a non-drag method (2.5.1).

Templates (from component pages)
- Text input errors: "Enter [whatever it is]"; "[x] must be [n] characters or less"; "[x] must be a number"; "[x] must be between [low] and [high]"; "[x] must not include [characters]".
- Error summary: heading "There is a problem"; link each error; first field for multi-field questions; first radio/checkbox for groups.
- Button: "Avoid using multiple default buttons on a single page"; warning buttons "only work if used very sparingly"; "Disabled buttons have poor contrast and can confuse some users, so avoid them if possible"; inverse buttons need 4.5:1.

---

## 7. Mobile form design and keyboard types (NN/g, MDN inputmode)

### 7a. NN/g, "A Checklist for Designing Mobile Input Fields"

Intended URL: https://www.nngroup.com/articles/mobile-input-checklist/ (not fetchable; snippet-sourced; the article has 14 items, only some wording confirmed. Confidence: medium.)

Items confirmed from snippets:
- "Is this field absolutely necessary?" (first item; the checklist should be run on every field; ideal is "100% checklist compliance for 100% of the input fields", otherwise prioritise by frequency and criticality)
- Label above the field (secondary copy wording: "Is the label above it? (Not inside, not below)")
- "Is the field big enough so that most possible field values are visible?"
- "Is the field visible in both orientations when the keyboard is displayed?"
- "Do you have any good defaults for this field? Any history available? Frequently used values?"
- Right keyboard for the field (third-party copy wording: "What is the right keyboard for this field?")
- Do not autocorrect names, addresses and email addresses.
- Related NN/g points from the same search: placeholder text inside a field makes it harder to remember what to enter once typing starts; group form elements with white space; browser autofill should work on name, address, email, phone, password fields; NN/g's "Marking Required Fields in Forms" says marking required fields with an asterisk is an easy usability improvement and marking only optional fields makes the form harder (note this conflicts with GOV.UK/NHS, which mark optional fields with "(optional)" and never use asterisks; for a UK health service follow GOV.UK/NHS, but do mark optionality explicitly either way).

### 7b. MDN, `inputmode` global attribute

URL read: https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/html/reference/global_attributes/inputmode/index.md (canonical: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode ; the requested `/Attributes/inputmode` URL redirects there)

Criteria extracted:
- `inputmode` "hints at the type of data that might be entered by the user ... allows a browser to display an appropriate virtual keyboard"; it "doesn't cause any validity requirements to be enforced".
- Values: `none` ("No virtual keyboard", page supplies its own); `text` (default, "Standard input keyboard for the user's current locale"); `decimal` ("Fractional numeric input keyboard containing the digits and decimal separator for the user's locale", minus key may be absent); `numeric` ("Numeric input keyboard, but only requires the digits 0–9", minus key may be absent); `tel` ("A telephone keypad input, including the digits 0–9, the asterisk (*), and the pound (#) key", prefer `<input type="tel">`); `search` (return key may say "Search", prefer `type="search"`); `email` (includes @, prefer `type="email"`); `url` (/ key prominent, prefer `type="url"`).
- Related attribute: `enterkeyhint` controls the label of the return key (e.g. "Next", "Done", "Send").
- Combined with GOV.UK/NHS: whole numbers (temperature in whole degrees, number of days, number of tablets) use `type="text" inputmode="numeric"`; decimals (37.8C) use `inputmode="decimal"`; phone `type="tel"`; email `type="email" autocomplete="email"`; dates use three text fields with `inputmode="numeric"` and `autocomplete="bday-*"` for date of birth; avoid `type="number"`.

---

## Where the sources disagree (for the rubric author)

- Touch target size: WCAG 2.2 AA floor is 24 by 24 CSS px (2.5.8), with a 44 by 44 CSS px AAA level (2.5.5). Apple: 44x44 pt default, 28x28 pt minimum. Material/Android: 48x48 dp, "larger is even better", 8 dp apart. NHS restates only the WCAG 24px floor. Recommendation for a pain/anxiety context: treat 24px as a hard fail, 44px as the pass threshold for primary controls, 48px as the target, and allow 24px-with-spacing only for inline/secondary links.
- Bold text contrast: Apple allows 3:1 for bold at any size; WCAG only relaxes to 3:1 at 14pt (about 18.7px) bold or larger; NHS rounds to 19px bold. Use WCAG/NHS.
- Minimum text: Apple 11pt minimum (caption), Material 12sp minimum body, NHS 16px body on mobile (14px small text, used sparingly). For a health app read by tired users on a phone, 16px body / 14px smallest is the defensible bar.
- Required vs optional marking: NN/g favours asterisks on required fields; GOV.UK/NHS say never use asterisks and write "(optional)" on optional fields. Follow GOV.UK/NHS for UK health.
- Progress indicators: NN/g-style conventional wisdom favours them; GOV.UK/NHS say add one only if research shows users struggle after fixing question order and count.
- Inline validation: many mobile-form guides recommend real-time validation; GOV.UK/NHS say validate on submit only ("Generally avoid validating while the user is still typing").
- Line length: Material codelab says 60 characters max; NHS says 70 to 80 characters; WCAG AAA (1.4.8) is 80. A 60 to 75 character measure satisfies all.
- Desktop margins: M3 compact 16dp / medium 24dp only confirmed from third-party copies; official M3 confirms 24dp for expanded. Treat 16px/24px gutters as a convention, not a quoted rule.

---

## Candidate rubric criteria

Each bullet is written so a reviewer can answer yes/no from screenshots at 360/390/1280/1440 plus a short interaction. Source in brackets.

### Navigation and findability

1. From any screen, the user can see where they are (page title or h1 that is the task or question, not repeated on other pages) and can get back one step with a visible Back control at the top, without relying on the browser button. [GOV.UK/NHS question pages; NN/g #3]
2. The browser back button works everywhere and returns the previous page in the state the user left it; one-time actions (sending the record to a GP, deleting) show a sensible message instead of repeating. [GOV.UK question pages]
3. The primary task (log a new UTI episode / show my passport) is reachable in one tap from the home screen and the control sits in the thumb-reachable zone on 360px/390px. [Material layout basics; Apple "most important items near the top and leading side"]
4. Primary navigation is in the same place with the same labels on every page at the same breakpoint, and help/contact links appear in the same relative order on every page. [WCAG 3.2.6; NN/g #4]
5. Every link's text says where it goes without surrounding context (no "click here", "read more", "here"); link text matches the destination page heading. [NHS link names]
6. Links do not open new tabs/windows; buttons are used for actions and links for navigation, and they are visually distinguishable. [NHS link names; NHS buttons]
7. Headings form a correct outline (one h1, h2s for sections, no skipped levels) so the page can be scanned by eye and by screen reader. [NHS accessibility content]
8. The page `<title>` is unique and descriptive, and starts with "Error: " when the page shows validation errors. [GOV.UK validation; NHS error summary]
9. Cards and lists lead with a short, unique heading that mirrors the destination; no card has more than 3 actions. [NHS card]
10. Secondary content is behind progressive disclosure (details/expander) only when most users do not need it; nothing most users need is hidden in a details component. [NHS details; Apple progressive disclosure]

### Clarity of wording

1. Body copy sentences are 20 words or fewer and paragraphs are 3 sentences or fewer (spot-check 5 paragraphs). [NHS how we write]
2. Text reads at roughly reading age 9 to 11; where a medical term is unavoidable the plain word comes first with the term in brackets, e.g. "pee (urine)", "water infection" is not used, "urinary tract infection (UTI)" is. [NHS how we write; NHS A to Z]
3. Vocabulary follows the NHS A to Z: "pee"/"urine" not "wee"; "get"/"have" symptoms not "develop"/"experience"; "medicine" not "medication"; "pharmacy" not "chemist"; "condition" or "problem" not "disorder"/"disease"; "you", not "the patient"; "a GP" for getting care. [NHS A to Z]
4. Active voice and imperative instructions ("Add the date your symptoms started"), not passive ("The date should be entered"). [NHS how we write]
5. Numbers follow NHS style: numerals including 1 and 2; "1 in 4" rather than "25%"; no decimals except doses and test values; dates as "6 August 2026" with months in full; times as "5:30pm"; ranges with "to". [NHS numbers]
6. Sentence case everywhere (headings, buttons, labels, nav items); no Title Case, no ALL CAPS except accepted acronyms (NHS, GP, UTI, A&E). [NHS formatting]
7. Every button label is a specific verb phrase describing the action ("Save episode", "Continue", "Confirm and send"), not "Submit", "OK", "Next", "Yes". [NHS/GOV.UK buttons; GOV.UK question pages]
8. Labels and legends are short questions or noun phrases in sentence case with no trailing colon; hint text is a single short phrase with no full stop and no links. [NHS text input; NHS hint text]
9. No internal jargon, codes or developer terms are visible (no "null", "undefined", "500", "token", "payload", "sync failed (E42)"). [NN/g #2, #9]
10. Each screen states why it is asking for information when that is not obvious (e.g. "We ask so your GP can see the pattern"), in one short sentence. [GOV.UK question pages]
11. Microcopy avoids "please", "sorry", "invalid", "forbidden", "you forgot", and humour. [GOV.UK error message]

### Mobile layout (360px and 390px)

1. No horizontal scrolling and no clipped content at 360px wide (and at 320px, which is the WCAG reflow width), in both portrait and after rotating to landscape. [WCAG 1.4.10; NHS layout 320px breakpoint]
2. Single-column layout: inputs, buttons and cards stack; no side-by-side form fields except the day/month/year date input. [NHS layout "mobile first ... single-column"]
3. Body text is at least 16px and no visible text is smaller than 14px; line length does not exceed about 75 characters. [NHS typography; Apple/Material minimums; NHS 70 to 80 characters]
4. Every tappable control (buttons, links in lists, icon buttons, checkboxes, radios including their labels, nav items) has a hit area of at least 44 by 44 CSS px, and nothing interactive is smaller than 24 by 24 CSS px; adjacent targets have at least 8px between them. [WCAG 2.5.8; Apple 44pt; Material 48dp + 8dp]
5. Primary buttons span the full width at mobile widths and are left-aligned to the form edge; there is only one primary button on the screen. [NHS buttons]
6. Fixed/sticky headers, footers or bottom bars never cover a focused input or the field being typed into when the on-screen keyboard is open; the focused input scrolls into view. [WCAG 2.4.11; Material "don't hide inputs"]
7. Content respects device safe areas: nothing essential sits under the status bar, notch/Dynamic Island area or home indicator. [Apple safe areas]
8. Side gutters are consistent (16px is the NHS/Material convention) and spacing between like elements is uniform; nothing touches the viewport edge. [Material alignment; Apple consistent spacing]
9. Text at 200% browser zoom (or large system font) still fits without truncation or overlap; labels wrap rather than truncate with an ellipsis. [WCAG 1.4.4; Apple truncation]
10. Modals, bottom sheets and toasts fit within the viewport, can be dismissed with a visible button (not only a swipe), and do not trap scroll. [Apple explicit dismissal; Apple multiple interaction types]
11. Images and icons scale without becoming the only carrier of meaning; icon-only buttons have a visible text label or a tooltip-free accessible name. [Material "more than one visual affordance"]

### Desktop layout (1280px and 1440px)

1. Content has a maximum width (NHS default 960px; reading column about 60 to 75 characters) and is not stretched across 1280px/1440px; inputs and buttons keep sensible widths and are not stretched full width. [NHS layout; Material adapt layout]
2. Form input widths match the expected answer (short for day/month/year, temperature, counts; wide for free text). [NHS/GOV.UK text input]
3. Layout at 1280px and 1440px is the same layout (both are Material "Large", no breakpoint between them), with no awkward empty region or orphaned element. [Material window size classes]
4. Multi-column arrangements (e.g. list + detail) keep a single clear primary action per screen and preserve the reading order; the h1 stays near the top-left. [Material panes; Apple hierarchy]
5. Hover, focus and active states are visible on all interactive elements, and the keyboard focus indicator is clearly visible at all times when tabbing. [WCAG 2.4.7; NHS focus state]
6. Keyboard only: every control can be reached and operated with Tab/Shift+Tab/Enter/Space/arrows, in an order that matches the visual order. [WCAG 2.1.1, 2.4.3]
7. At 400% zoom from 1280px (equivalent to 320px) the page still reflows to one column with no horizontal scroll. [WCAG 1.4.10 note]
8. Text, borders, icons and focus rings meet contrast (4.5:1 text, 3:1 non-text) at desktop sizes, and large headings used as "large text" are at least 24px (or 19px bold) to qualify for 3:1. [WCAG 1.4.3/1.4.11; NHS colour table]
9. Sticky headers/sidebars never obscure a focused element and do not consume more than a small fraction of the viewport height. [WCAG 2.4.11; NHS focus state]
10. Desktop does not add functionality that is missing on mobile; the same tasks are possible at all four widths. [Apple "Keep functionality the same as size classes change"]

### Forms and data entry

1. Each form screen asks one thing (or one tightly related group) with the question as the h1 inside the label/legend; the Continue button is labelled "Continue" and left-aligned. [GOV.UK/NHS question pages]
2. Every field has a visible label above it; no placeholder is used as a label; hint text appears under the label and before the input. [NHS text input; NHS hint text]
3. Optional fields say "(optional)" in the label or legend; no asterisks; every field asked for is one the service really needs. [GOV.UK question pages]
4. Numeric fields use `type="text"` with `inputmode="numeric"` (whole numbers) or `inputmode="decimal"` (e.g. 37.8); none use `type="number"`; phone uses `type="tel"`, email `type="email"`; `autocomplete` is set where a purpose exists (name, email, tel, bday-*). [GOV.UK text input; MDN inputmode; WCAG 1.3.5]
5. Dates the user knows (symptom start, antibiotic start) use three day/month/year text fields with a valid example in the hint ("For example, 15 3 2026"); the component accepts "3", "03" and "march"; it never auto-tabs between fields. Dates the user cannot know exactly offer "I'm not sure" or a coarse choice. [NHS/GOV.UK date input]
6. Single-choice questions use radios (none pre-selected, "or" divider before "None of these"/"I do not know"); multi-choice use checkboxes with a "Select all that apply"-style hint and an exclusive "No, I do not have any of these symptoms" last. [NHS radios; NHS checkboxes]
7. Validation runs on submit only (not on blur or keystroke); the form reloads with the user's answers intact; nothing is cleared. [GOV.UK validation; NHS error message]
8. Information already given in this session (name, date of birth, previous episode details) is pre-filled or selectable, never re-typed. [WCAG 3.3.7; GOV.UK question pages]
9. Copy and paste work in every field including password; the password field offers show/hide and accepts browser/password-manager autofill; sign-in offers a non-memory alternative (magic link, passkey or code) and uses no CAPTCHA puzzle. [WCAG 3.3.8; NHS text input; NHS new criteria]
10. Before anything is sent or saved permanently there is a "Check your answers" page using a summary list with "Change" links; the final button names the action ("Confirm and send"). [NHS check answers]
11. Inputs tolerate real-world entry: spaces/hyphens in numbers and codes are ignored; typed units ("38C", "500 mg") do not cause errors; no `maxlength` silently truncates. [GOV.UK validation; GOV.UK text input]
12. Double-tapping Save/Send cannot create a duplicate record; the button shows a busy state and the server de-duplicates. [NHS buttons]

### Feedback and states (loading, empty, success, error)

1. Any action taking longer than about 1 second shows a visible in-place loading state (spinner, skeleton or progress text) and the triggering button is disabled or shows busy while it runs. [NN/g #1; NHS buttons]
2. Loading, success and "saved" messages are announced to screen readers via `role="status"`/`aria-live="polite"` without moving focus; errors use `role="alert"` or the error summary with focus moved to it. [WCAG 4.1.3; NHS error summary]
3. Empty states (no episodes yet, no results) say in one sentence what the screen will show and offer the single next action ("Add your first episode"); they never look like an error or a loading failure. [NN/g #1, #8]
4. On validation failure: an error summary headed "There is a problem" appears at the top of main, receives keyboard focus, lists each error as a link to its field, and the `<title>` starts "Error: ". [GOV.UK/NHS error summary]
5. Each inline error is red, prefixed with hidden "Error:", placed after the label and hint, with a red border on the field/group, and uses the same wording as the summary. [GOV.UK/NHS error message]
6. Error wording says how to fix it, reusing the question's words: "Enter the date your symptoms started" (empty) or "Date your symptoms started must be a real date" (invalid); no "Please", "Sorry", "invalid", codes, or generic "Something went wrong". [GOV.UK error message]
7. Non-validation failures (offline, server error, not permitted) get their own page or panel that says what happened, what the user can do now, and whether their data is safe; they are not shown as field errors. [GOV.UK error message "when not to use"; NHS error message]
8. Success is confirmed on its own confirmation page or persistent panel (not only a 2-second toast) stating what happened and what happens next; important confirmations require an explicit dismissal. [NHS check answers; Apple explicit dismissal]
9. Destructive actions (delete episode, delete account) require a confirmation step whose button is a warning button that is not red-only, and the result is confirmed. [NHS/GOV.UK buttons; NN/g #5]
10. Disabled controls are avoided; where a control is unavailable the UI explains why in text next to it. [NHS/GOV.UK buttons]
11. Time-outs: any inactivity limit is at least 20 hours or the user is warned and can extend; unsaved entries are not lost silently. [NHS give users time]

### First-time experience

1. The first screen states in one sentence what the UTI Passport is, who can see it, and the one action to start; this can be read in under 10 seconds at 360px without scrolling past the primary button. [NN/g #8; NHS how we write]
2. Sign-up asks only for what is needed to start (no clinical history before the user has seen value); each question says why it is asked. [GOV.UK question pages]
3. Account creation and sign-in have no cognitive-function test: password managers and paste work, or a magic link/code is offered; no CAPTCHA puzzles. [WCAG 3.3.8]
4. Any onboarding carousel or tour can be skipped with a visible "Skip" and never blocks the primary task; the product does not need explanation to be usable. [NN/g #6; #3]
5. The first episode-logging flow uses one question per page, with "I'm not sure" options, so an unwell user can complete it with no prior knowledge of the app. [GOV.UK/NHS question pages]
6. Health-data use (what is stored, where, who can see it, how to delete it) is explained in plain English before the first health question, on the page or one tap away, and the consent action is a specific button, not a pre-ticked box. [NHS how we write; NHS checkboxes "do not pre-select"]
7. Help and contact routes are visible on the first screens in the same position they appear elsewhere. [WCAG 3.2.6]
8. The empty home screen after sign-up guides to the first action and does not show zero-filled charts or placeholder data that could be read as real. [NN/g #1]
9. Defaults are sensible and visible (today's date pre-selected where appropriate, country/time zone inferred) and can be changed. [NN/g mobile input checklist "good defaults"]
10. Returning after the first session, the user lands on their passport, not on onboarding again. [NN/g #7]

### Accessibility

1. Text contrast is at least 4.5:1 (3:1 for text 24px+ or 19px+ bold) in both light and dark appearances if dark mode exists; check body, hint text, placeholder-style text, disabled-looking text and text on coloured buttons. [WCAG 1.4.3; NHS colour; Apple]
2. Non-text contrast is at least 3:1 for input borders, checkbox/radio outlines, focus rings, icons that carry meaning and chart elements. [WCAG 1.4.11; NHS colour]
3. Nothing is conveyed by colour or position alone (e.g. red/green status dots have a text label or icon; instructions never say "the button on the right"). [NHS do not rely on colour; Apple]
4. All interactive targets are at least 24 by 24 CSS px (fail if smaller), and primary controls at least 44 by 44 CSS px. [WCAG 2.5.8/2.5.5; Apple]
5. Keyboard: every function works by keyboard; focus order follows reading order; focus is always visible with a custom indicator (browser default alone is not enough); focus is never fully hidden behind sticky UI or banners. [WCAG 2.1.1, 2.4.3, 2.4.7, 2.4.11; NHS focus state]
6. Reflow: no two-dimensional scrolling at 320px width; text spacing overrides (line height 1.5, paragraph 2x, letter 0.12, word 0.16) cause no clipping; 200% zoom loses nothing. [WCAG 1.4.10, 1.4.12, 1.4.4]
7. Every form control has a programmatic label (visible label with matching `for`/`id`, or legend for groups); clicking a label focuses its field; hints and errors are associated with the field (`aria-describedby`). [WCAG 3.3.2; NHS labels]
8. Errors are identified in text next to the field and in a focused summary, with a correction suggestion; "Error:" is announced. [WCAG 3.3.1, 3.3.3; NHS/GOV.UK]
9. Status changes (saved, loading, counts, conditionally revealed questions) are announced via live regions without stealing focus. [WCAG 4.1.3; NHS radios known issue]
10. Images have alt text or `alt=""` when decorative; icon-only buttons have an accessible name that states the outcome ("Delete episode", not "Delete button"). [Material describe UI elements; Android content descriptions]
11. Motion respects `prefers-reduced-motion`: no auto-playing, looping or parallax animation; transitions fall back to fades; nothing flashes. [Apple motion]
12. Authentication and repeated data entry meet WCAG 2.2: paste allowed, autofill supported, no puzzle, previously entered data pre-filled; help mechanisms in a consistent order on every page. [WCAG 3.3.7, 3.3.8, 3.2.6]

### Trust and tone (calm, respectful, never alarming or patronising, clear about health data use)

1. Tone is factual and neutral: no exclamation marks, no metaphors, no "Oops!", "Yay!", emoji or jokes anywhere in UI copy including empty states and errors. [NHS how we write; GOV.UK error message]
2. No blaming or moralising language: never "you forgot", "you failed", "invalid", "illegal"; the app describes what to do next. [GOV.UK error message]
3. People-first language: "you have a UTI", "people who get UTIs"; never "sufferer", "suffering from", "victim", "afflicted". [NHS A to Z; NHS inclusive content]
4. Reassurance is specific, not vague: figures like "most people's symptoms improve within 3 days of starting antibiotics" rather than "don't worry"; no unverifiable clinical claims. [NHS how we write]
5. Warnings are rare and proportionate: at most 2 warning callouts per page, each with a short clear heading, used only for time-critical or health-significant information; routine information uses body text or inset text, never red. [NHS warning callout; NHS inset text]
6. When symptoms warrant urgent care the app uses clear, calm care-card style wording ("Ask for an urgent GP appointment or get help from NHS 111 if ...") with exact actions, not alarm words ("DANGER", "emergency!!"). [NHS inset text/care cards; NHS A to Z]
7. The app never implies diagnosis or replaces clinical judgement in its copy; it describes itself as a record the user keeps and shows to a GP. [NHS how we write "factual, neutral and unambiguous"]
8. Health-data use is stated in plain English where data is collected: what is stored, where (on the device / on servers), who can see it, how to export or delete it, and how long it is kept; this is one tap away from every data-entry screen. [NHS how we write; GOV.UK question pages "make clear why you're asking"]
9. Sharing with a GP is an explicit, user-initiated action with a confirmation and a clear statement of what will be shown; nothing is shared by default. [NN/g #5; NHS check answers]
10. Visual tone is calm: limited palette, error red reserved for errors, no red used decoratively, no countdowns or urgency badges. [NHS colour "error colour for error states"]
11. The app addresses the user as "you" and never as "the patient"; it does not infantilise ("Great job!", "Well done for logging!"). [NHS A to Z; NHS how we write]
12. Copy does not assume gender, age or lifestyle (UTIs affect men, women, children and older adults); terms are those the users would use, tested with them. [NHS inclusive content]

### Consistency

1. The same action has the same label, icon, colour and position on every screen (e.g. "Save episode" is never also "Submit" or "Done"). [NN/g #4]
2. One primary button style, one secondary style, one warning style, used with the same meaning everywhere; never more than one primary button per screen. [NHS/GOV.UK buttons]
3. Form components (labels above, hint under label, error under hint, red border, "Error:" prefix) are identical on every form. [NHS components]
4. Dates, times and numbers use one format throughout (e.g. "6 August 2026", "5:30pm", "3 days", "1 in 4") in forms, lists, the passport view and exports. [NHS numbers]
5. Terminology is fixed: one word for each concept (episode vs infection vs event; GP vs doctor; pee vs urine) used identically in nav, headings, buttons and help. [NN/g #4; NHS A to Z]
6. Spacing, type scale and component sizes come from a single scale (NHS/Material 4px or 8px steps) and match across screens; headings of the same level look the same everywhere. [Apple consistent spacing; Material alignment]
7. Help, contact and privacy links appear in the same order and location on every page for a given breakpoint. [WCAG 3.2.6]
8. Focus, hover and active states look the same for the same kind of control everywhere. [NHS focus state]
9. Icons carry one meaning each; the same icon is never used for two actions and no action uses two different icons. [NN/g #4]
10. Mobile and desktop expose the same features with the same names; nothing is renamed or relocated between 390px and 1280px beyond layout reflow. [Apple "keep functionality the same"]
11. Platform conventions are respected: standard HTML controls (native select, checkbox, radio, date fields) rather than custom look-alikes unless there is a tested reason; back behaves like back. [NN/g #4; GOV.UK question pages]
