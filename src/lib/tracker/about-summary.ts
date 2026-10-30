import type { TrackerProfile } from "./data";
import { MEDICAL_HISTORY, firstUtiText, formatNhsNumber } from "./passport";
import { preventionShortName, type PreventionLike } from "./prevention";
import { antibioticName } from "./search";

/*
 * One line per About you step, read without the questions. Each answer is
 * written as a statement that carries its own meaning ("On the pill", not
 * "Pill"); answers that say nothing about the person ("Prefer not to say")
 * and anything unanswered are left out, so an empty step gives an empty
 * array and the page falls back to describing what goes there.
 */
const MENOPAUSE: Record<string, string> = { not_yet: "Before menopause", around: "Around menopause", after: "After menopause" };
const CONTRACEPTION: Record<string, string> = {
  none: "No contraception",
  pill: "On the pill",
  coil_hormonal: "Hormonal coil",
  coil_copper: "Copper coil",
  implant: "Contraceptive implant",
  injection: "Contraceptive injection",
  patch_ring: "Patch or ring",
  condoms: "Condoms",
  other: "Other contraception",
};
const PREGNANT: Record<string, string> = { no: "Not pregnant", yes: "Pregnant or trying" };

export function aboutStepSummaries(profile: TrackerProfile, activePreventions: PreventionLike[]): string[][] {
  const medical = (profile.medical_history ?? []).map((k) => (k === "other" ? profile.medical_history_other?.trim() || "Other condition" : MEDICAL_HISTORY.find((o) => o.key === k)?.label ?? k));
  const allergies = (profile.allergies ?? []).map((a) => antibioticName(a.antibiotic_id, a.other_name));
  const address = [profile.city, profile.postcode].filter(Boolean).join(", ");
  const first = firstUtiText(profile);
  const nhs = formatNhsNumber(profile.nhs_number);
  return [
    [
      MENOPAUSE[profile.menopause_stage ?? ""],
      CONTRACEPTION[profile.contraception ?? ""],
      PREGNANT[profile.pregnant_or_trying ?? ""],
      activePreventions.length ? `Taking ${activePreventions.map(preventionShortName).join(", ")}` : null,
    ],
    [
      first ? `First UTI ${first.charAt(0).toLowerCase()}${first.slice(1)}` : null,
      profile.lifetime_utis !== null && profile.lifetime_utis !== undefined ? `${profile.lifetime_utis} UTI${profile.lifetime_utis === 1 ? "" : "s"} in all` : null,
      medical.length ? medical.join(", ") : null,
      allergies.length ? `Allergic to ${allergies.join(", ")}` : null,
    ],
    [profile.phone || null, profile.local_hospital || null, address || null, nhs ? `NHS ${nhs}` : null],
  ].map((row) => row.filter((v): v is string => !!v));
}
