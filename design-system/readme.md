# Utee Design System

Utee™ is a UK women's health brand: a UTI supplement range + UTI testing service, co-created with TV presenter Cherry Healey and advised by urologist Professor Bob Yang. Products include Utee Probiotics+ (daily vaginal probiotics + cranberry extract) and Utee D-Mannose+ (high-strength D-Mannose + sodium bicarbonate sachets), plus NACs and an at-home testing pathway. Positioning: "Our competitors sell products. We provide a pathway." Mission: make Utee the first brand women think of for urinary health. Parent studio/agency: extracted (@extracted.co.uk).

## Sources
- `uploads/Utee_OnePager_Stage_1_v2.pdf` — brand guidelines overview one-pager ("Our brand, made simple", full guidelines on request) + investor one-pager content. This is the sole design source.
- Font binaries supplied: Poppins Regular/SemiBold/Bold, Cooper Light + Light Italic (copied to `fonts/`).
- No Figma, no codebase, no website access was provided.

## CONTENT FUNDAMENTALS
- Voice: warm, direct, women-to-women; first-person plural ("Our brand, made simple", "We provide a pathway"). Speaks to "you" with empathy, grounded in clinical credibility.
- Personal storytelling is core: co-creator quotes in first person ("I've battled recurrent UTIs all my life…").
- Sentence case for headings and body ("Our brand, made simple."); ALL-CAPS with wide letterspacing for eyebrows/labels ("OUR COLOUR", "LIFESTYLE SHOTS") and CTAs ("SHOP NOW", "EXPLORE", "TRY UTEE").
- British English spelling (colour, personalised).
- Claims are concrete and evidence-flavoured: dosages ("D-Mannose 2,500mg"), stats ("Over 50% of women will experience a UTI"), named experts. No hedging, no fluff.
- No emoji. Trademark ™ used on first brand mention in formal contexts.
- Vibe: destigmatising, optimistic, "created by women, for women"; serious subject handled with softness and confidence.

## VISUAL FOUNDATIONS
- Colour: Midnight `#1d003a` + White form the monotone base. Core colours Pink `#fe98cb` and Maroon `#91193b` (used at 100%, or 25/50% tints for backgrounds/highlights). A Pink→Maroon gradient is the accent for backgrounds, call-outs, stickers. Five accent colours identify product ranges — Mint, Peach, Sky, Sun, Lavender — applied sparingly (tabs, category indicators, small highlights), never dominant. NOTE: the PDF's printed hex labels are broken (all accents repeat `#ffbe98`); accent/core values here were pixel-sampled from the PDF render — confirm against full guidelines.
- Type: Cooper Light for headings; Poppins Regular for body with Poppins SemiBold for emphasis; Cooper Black for CTA/pull-out/sticker text (font file NOT supplied — currently synthesized bold Cooper Light; see Caveats).
- Backgrounds: large flat or gently-gradiented fields of pink/maroon; white cards float on them. Full-bleed photography inside rounded holders, never as page background.
- Shape language: everything is rounded. Pill buttons, pill eyebrow tabs, large-radius cards (~24px+), "round holding devices" (squircle-ish gradient tiles), circle image holders (with curved text on path), curve image holders (dome/arch top), and a "curve grid system" (arched dome section tops).
- Borders: thin 1px hairlines in translucent white on coloured grounds; cards mostly borderless white with soft shadow.
- Shadows: soft, large-blur drop shadows tinted maroon/midnight; stickers/callouts get a subtle glossy inner highlight.
- Imagery: four categories — lifestyle shots (warm, sunlit, candid women), model shots (bright domestic settings, product in frame), cut-out shots (subject cut out on pink circle), studio shots (packaging on pink seamless with glassware). Colour vibe: warm, pink-cast, optimistic. No B&W, no grain.
- Iconography: thin-stroke white line icons (see ICONOGRAPHY).
- Buttons: white pill, ALL-CAPS letterspaced midnight label. Hover: assume slight darken/scale-down press (not specified in source — flagged).
- Layout: generous padding, eyebrow pill labels marking sections, hairline section dividers, curved section transitions.
- Animation: not specified in source. Default to gentle fades/eases if needed; nothing bouncy.

## ICONOGRAPHY
- Custom thin-stroke line icon set, white on maroon/gradient grounds: "slightly thinner in weight and more clinical than the core extracted icon set — clean, minimal, highly functional."
- Captured set: shield-check, medical cross circle, chat bubbles, capsules/pills, sliders/controls, clipboard-plus → `assets/icons-strip.png` (raster crop from PDF; no vector source available).
- For additional icons use a thin-stroke CDN set matching the weight: Lucide at `stroke-width:1.25` is the closest match (SUBSTITUTION — flag to user).
- No icon font, no emoji, no unicode-as-icon usage in source.

## Logo
- The logo is the "Utee" wordmark set in Cooper (serif). Positive: white on pink→maroon gradient (`assets/logo-positive.png`). Negative: maroon on white (`assets/logo-negative.png`). Raster crops only — request vector logo files.
- ™ superscript appears in some lockups.

## Index
- `styles.css` → imports `tokens/fonts.css`, `tokens/colors.css`, `tokens/typography.css`, `tokens/layout.css`
- `fonts/` — Poppins (400/600/700), Cooper Light (+Italic)
- `assets/` — logo-positive.png, logo-negative.png, icons-strip.png, imagery-lifestyle.png, imagery-studio-packshot.png, graphic-quote-card.png (all raster crops from the PDF)
- `guidelines/` — @dsCard specimen cards (colors, type, spacing, brand)
- `components/core/` — Button, EyebrowTab, Card, Sticker, QuoteCard, RangeTag, CircleImageHolder, CurveImageHolder, RoundHoldingDevice (see Intentional additions)
- `ui_kits/web/` — sample brand web screen (no real product UI was provided; this is an interpretation from the one-pager's graphic assets — see Caveats)
- `SKILL.md` — agent skill entry point

## Intentional additions
No component inventory exists in the source beyond the "Graphic Assets" board (buttons, quotes, holding devices, image holders, curve grid). Components built map 1:1 to that board; EyebrowTab and RangeTag are added because they appear repeatedly on the board itself (section labels, product-range indicators).

## Caveats
- Accent/core hex values pixel-sampled (PDF labels broken); verify with brand team.
- Cooper Black missing — CTA font is synthesized-bold Cooper Light until the real file is supplied.
- Logo exists only as raster crops; request SVG/vector.
- No product website/app source given — UI kit is an inferred brand-site expression, not a recreation.
