/*
 * General information shown next to a person's own patterns. Each tip is
 * plain public guidance in our own words, pointing to a fuller source. None
 * of it is advice for the person reading it, and the card says so.
 */
export type Tip = { key: string; title: string; body: string; source?: { name: string; url: string } };

const LIVE_UTI_FREE = { name: "Live UTI Free", url: "https://liveutifree.com/how-to-prevent-uti/" };

/** Tips that fit a trigger someone logs often. */
export const TIPS_BY_TRIGGER: Record<string, Tip[]> = {
  sex: [
    { key: "pee_after_sex", title: "Peeing soon after sex", body: "Many people find emptying their bladder within about fifteen minutes of sex helps flush bacteria out before they settle.", source: LIVE_UTI_FREE },
    { key: "lubrication", title: "Lubrication and spermicide", body: "Dryness and friction can irritate the area. Spermicides and diaphragms are linked with more UTIs for some people. A water-based lubricant, and a chat about contraception, are things people look into.", source: LIVE_UTI_FREE },
  ],
  dehydration: [
    { key: "fluids", title: "Fluids through the day", body: "Spreading drinks across the day keeps urine dilute and the bladder flushing regularly, rather than one big glass at night.", source: LIVE_UTI_FREE },
  ],
  holding_pee: [
    { key: "go_when_needed", title: "Going when you need to", body: "Holding on gives bacteria longer to settle. Going when the urge comes, and taking time to empty fully, is what people aim for.", source: LIVE_UTI_FREE },
  ],
  period_cycle: [
    { key: "cycle", title: "Around your period", body: "Some people notice UTIs at the same point in their cycle. Noting the products you use and how much you drink at that time can show a pattern worth raising with a GP.", source: LIVE_UTI_FREE },
  ],
  new_contraception: [
    { key: "contraception", title: "Contraception and UTIs", body: "Spermicide, diaphragms and some hormonal methods are linked with UTIs for some people. It is worth mentioning to whoever prescribes yours.", source: LIVE_UTI_FREE },
  ],
  menopause: [
    { key: "menopause", title: "After menopause", body: "Lower oestrogen changes the lining of the vagina and urethra, which can make UTIs more likely. Vaginal oestrogen is something many people discuss with their GP.", source: LIVE_UTI_FREE },
  ],
  swimming_hot_bath: [
    { key: "wet_swimwear", title: "Pools, hot tubs and baths", body: "Changing out of wet swimwear promptly and skipping bubble bath and bath oils are common steps people take.", source: LIVE_UTI_FREE },
  ],
  constipation: [
    { key: "bowels", title: "Keeping bowels regular", body: "A full bowel can press on the bladder and stop it emptying fully. Fibre, fluids and moving about are what people try first.", source: LIVE_UTI_FREE },
  ],
  recent_antibiotics: [
    { key: "after_antibiotics", title: "After a course of antibiotics", body: "Antibiotics for something else can upset the balance of bacteria in the gut and vagina. Some people look into probiotics; the evidence is mixed.", source: LIVE_UTI_FREE },
  ],
};

/** Shown when there is not yet a pattern, or to fill the card. */
export const GENERAL_TIPS: Tip[] = [
  { key: "products", title: "Plain water around the vulva", body: "Perfumed washes, sprays, wipes and douches can irritate and upset the natural balance. Water is enough.", source: LIVE_UTI_FREE },
  { key: "clothing", title: "Breathable underwear", body: "Cotton underwear and looser clothes keep the area dry, which bacteria like less.", source: LIVE_UTI_FREE },
  { key: "wiping", title: "Front to back", body: "Wiping front to back keeps bowel bacteria away from the urethra.", source: LIVE_UTI_FREE },
  { key: "culture", title: "Ask for a culture", body: "If UTIs keep coming back, a urine culture identifies the actual bacteria, where a dipstick alone cannot. Worth asking for.", source: LIVE_UTI_FREE },
  { key: "keep_logging", title: "Keep logging", body: "Patterns across several UTIs are what a GP can act on. The more you log, the clearer they get." },
];

/** Tips that fit the triggers logged most, topped up with general ones. */
export function tipsFor(triggerKeys: string[], max = 3): Tip[] {
  const out: Tip[] = [];
  for (const k of triggerKeys) for (const t of TIPS_BY_TRIGGER[k] ?? []) if (out.length < max && !out.some((x) => x.key === t.key)) out.push(t);
  for (const t of GENERAL_TIPS) if (out.length < max && !out.some((x) => x.key === t.key)) out.push(t);
  return out;
}
