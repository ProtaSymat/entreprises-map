import type { LatLng } from "../types";

export interface Place {
  id: string;
  kind: "commune" | "address";
  /** Nom court affiché en gras (ex : « Saint-Denis »). */
  name: string;
  /** Libellé complet, utilisé dans le champ et sur la carte (ex : « Saint-Denis (93) »). */
  label: string;
  /** Contexte géographique (ex : « Seine-Saint-Denis (93) · Île-de-France »). */
  context: string;
  /** Infos secondaires (code postal, population). */
  detail: string;
  /** Code du département, pour distinguer les homonymes. */
  deptCode?: string;
  position: LatLng;
  /** Nombre de villes portant exactement ce nom dans les résultats (1 = pas d'homonyme). */
  homonyms: number;
}

interface RawCommune {
  nom: string;
  code: string;
  codesPostaux?: string[];
  departement?: { code: string; nom: string };
  region?: { nom: string };
  centre?: { coordinates: [number, number] };
  population?: number;
}

interface RawFeature {
  geometry: { coordinates: [number, number] };
  properties: { id?: string; label?: string; name?: string; context?: string };
}

const nf = new Intl.NumberFormat("fr-FR");

/** Version « pliée » d'un texte (sans accents, minuscules, tirets en espaces), de même longueur que l'original. */
export function fold(s: string): string {
  return s
    .split("")
    .map((c) => (/[-’']/.test(c) ? " " : (c.normalize("NFD")[0] ?? c).toLowerCase()))
    .join("");
}

export function normalizeText(s: string): string {
  return fold(s).replace(/\s+/g, " ").trim();
}

export interface Segment {
  text: string;
  match: boolean;
}

/** Découpe un texte pour surligner la partie qui correspond à la recherche (insensible aux accents). */
export function highlightSegments(text: string, query: string): Segment[] {
  const q = fold(query.trim());
  if (!q) return [{ text, match: false }];
  const i = fold(text).indexOf(q);
  if (i < 0) return [{ text, match: false }];
  return [
    { text: text.slice(0, i), match: false },
    { text: text.slice(i, i + q.length), match: true },
    { text: text.slice(i + q.length), match: false },
  ].filter((s) => s.text.length > 0);
}

export function communeToPlace(c: RawCommune): Place | null {
  const coords = c.centre?.coordinates;
  if (!coords) return null;
  const dep = c.departement ? `${c.departement.nom} (${c.departement.code})` : "";
  const postcode = c.codesPostaux?.[0];
  return {
    id: `commune:${c.code}`,
    kind: "commune",
    name: c.nom,
    label: c.departement ? `${c.nom} (${c.departement.code})` : c.nom,
    context: [dep, c.region?.nom].filter(Boolean).join(" · "),
    detail: [postcode, c.population ? `${nf.format(c.population)} hab.` : ""].filter(Boolean).join(" · "),
    deptCode: c.departement?.code,
    position: { lat: coords[1], lng: coords[0] },
    homonyms: 1,
  };
}

export function featureToPlace(f: RawFeature): Place {
  const label = f.properties.label ?? f.properties.name ?? "Adresse";
  return {
    id: `address:${f.properties.id ?? label}`,
    kind: "address",
    name: label,
    label,
    context: (f.properties.context ?? "").replace(/^(\w+),\s*/, "$1 · ").replace(/,\s*/g, " · "),
    detail: "",
    position: { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] },
    homonyms: 1,
  };
}

/** Renseigne `homonyms` : combien de villes portent exactement le même nom dans la liste. */
export function markHomonyms(places: Place[]): Place[] {
  const counts = new Map<string, number>();
  for (const p of places) {
    if (p.kind !== "commune") continue;
    const k = normalizeText(p.name);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return places.map((p) => (p.kind === "commune" ? { ...p, homonyms: counts.get(normalizeText(p.name)) ?? 1 } : p));
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${res.status}`);
  return (await res.json()) as T;
}

/**
 * Recherche de lieux, 100 % gratuite et sans clé :
 *  - communes : geo.api.gouv.fr (avec département, région, population, pour départager les homonymes)
 *  - adresses : Géoplateforme IGN (uniquement si la saisie ressemble à une adresse)
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  const isPostcode = /^\d{5}$/.test(q);
  const looksLikeAddress = (/\d/.test(q) && !isPostcode) || q.split(/\s+/).length >= 3;

  const communesUrl =
    `https://geo.api.gouv.fr/communes?${isPostcode ? "codePostal" : "nom"}=${encodeURIComponent(q)}` +
    `&fields=nom,code,codesPostaux,departement,region,centre,population&boost=population&limit=8`;
  const addressesUrl = `https://data.geopf.fr/geocodage/search?index=address&limit=5&q=${encodeURIComponent(q)}`;

  const [communes, features] = await Promise.all([
    getJson<RawCommune[]>(communesUrl, signal),
    looksLikeAddress
      ? getJson<{ features?: RawFeature[] }>(addressesUrl, signal)
          .then((j) => j.features ?? [])
          .catch((e) => {
            if (signal?.aborted) throw e;
            return [] as RawFeature[]; // les adresses sont un bonus : on ne casse pas la recherche de villes
          })
      : Promise.resolve([] as RawFeature[]),
  ]);

  const places = [
    ...communes.map(communeToPlace).filter((p): p is Place => p !== null),
    ...features.map(featureToPlace),
  ];
  return markHomonyms(places);
}
