import data from "./antibiotics.json";

export type Antibiotic = {
  id: string;
  name: string;
  brands: string[];
  aliases: string[];
  group: string | null;
  route: string | null;
  free_text?: boolean;
  pinned?: string;
  dmd_code?: string | null;
};

export const ANTIBIOTICS: Antibiotic[] = data.items as Antibiotic[];
export const ANTIBIOTIC_GROUPS = [...data.groups].sort((a, b) => a.order - b.order);

const byId = new Map(ANTIBIOTICS.map((a) => [a.id, a]));

export function antibioticById(id: string): Antibiotic | undefined {
  return byId.get(id);
}

/** Clean display name for a stored id (plus free text for "other"). */
export function antibioticName(id: string, otherName?: string | null): string {
  if (id === "other") return otherName?.trim() || "Other antibiotic";
  return byId.get(id)?.name ?? id;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Small-typo tolerance: bounded Levenshtein distance. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev.splice(0, prev.length, ...cur);
    cur = [];
  }
  return prev[b.length];
}

export type SearchHit = { item: Antibiotic; label: string; score: number };

/**
 * Instant search over generic names, brands and aliases. Prefix matches rank
 * first, then substring, then close typos. When a brand or alias matched,
 * the label reads "Brand (generic)".
 */
export function searchAntibiotics(query: string, limit = 8): SearchHit[] {
  const q = norm(query);
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const item of ANTIBIOTICS) {
    if (item.pinned) continue;
    const candidates: { term: string; brand?: string }[] = [
      { term: item.name },
      ...item.brands.map((b) => ({ term: b, brand: b })),
      ...item.aliases.map((a) => ({ term: a })),
    ];
    let best: { score: number; brand?: string } | null = null;
    for (const c of candidates) {
      const t = norm(c.term);
      let score = -1;
      if (t.startsWith(q)) score = 100 - (t.length - q.length) * 0.1;
      else if (t.includes(q)) score = 60;
      else if (q.length >= 4) {
        const tol = q.length >= 8 ? 2 : 1;
        const head = t.slice(0, Math.max(q.length, 1));
        const d = Math.min(editDistance(q, t, tol), editDistance(q, head, tol));
        if (d <= tol) score = 40 - d * 5;
      }
      if (score > (best?.score ?? -1)) best = { score, brand: c.brand };
    }
    if (best && best.score >= 0) {
      const label = best.brand && norm(best.brand) !== norm(item.name) ? `${best.brand} (${item.name.toLowerCase()})` : item.name;
      hits.push({ item, label, score: best.score });
    }
  }
  hits.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  return hits.slice(0, limit);
}

export const PINNED_ANTIBIOTICS = ANTIBIOTICS.filter((a) => a.pinned === "bottom");

export function antibioticsInGroup(groupId: string): Antibiotic[] {
  return ANTIBIOTICS.filter((a) => a.group === groupId);
}
