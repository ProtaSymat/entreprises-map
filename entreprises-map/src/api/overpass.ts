import type { Company, ContactInfo } from "../types";

const OVERPASS = "https://overpass-api.de/api/interpreter";

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(sas|sarl|sasu|eurl|sa|sci|societe|ets|etablissements)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function namesMatch(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return false;
  return x.includes(y) || y.includes(x);
}

interface OsmElement { tags?: Record<string, string> }

/** Cherche une fiche OSM proche portant le même nom, pour récupérer tél / site / horaires. */
export async function lookupContact(company: Company): Promise<ContactInfo | null> {
  const query = `[out:json][timeout:20];nwr(around:80,${company.lat},${company.lng})["name"];out center tags;`;
  const res = await fetch(OVERPASS, { method: "POST", body: "data=" + encodeURIComponent(query) });
  if (!res.ok) throw new Error(`Overpass : ${res.status}`);
  const json = (await res.json()) as { elements: OsmElement[] };
  const hit = json.elements.find((e) => {
    const name = e.tags?.name;
    return !!name && (namesMatch(company.name, name) || namesMatch(company.tradeName, name));
  });
  if (!hit?.tags) return null;
  const t = hit.tags;
  return {
    phone: t.phone ?? t["contact:phone"],
    email: t.email ?? t["contact:email"],
    website: t.website ?? t["contact:website"],
    openingHours: t.opening_hours,
  };
}
