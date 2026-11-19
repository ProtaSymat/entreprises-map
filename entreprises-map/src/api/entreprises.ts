import type { Company, LatLng } from "../types";
import { categoryForSection } from "../lib/categories";
import { distanceKm } from "../lib/geo";

const ENDPOINT = "https://recherche-entreprises.api.gouv.fr/near_point";
export const PER_PAGE = 25;

interface RawDirigeant { nom?: string; prenoms?: string; qualite?: string }
interface RawEtablissement {
  siret?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  adresse?: string;
  libelle_commune?: string;
  nom_commercial?: string;
  liste_enseignes?: string[] | null;
  est_siege?: boolean;
}
export interface RawResult {
  siren: string;
  nom_complet?: string;
  nom_raison_sociale?: string;
  activite_principale?: string;
  section_activite_principale?: string;
  nature_juridique?: string;
  siege?: RawEtablissement;
  /** Établissements qui correspondent à la recherche (ici : ceux situés dans le rayon). */
  matching_etablissements?: RawEtablissement[] | null;
  dirigeants?: RawDirigeant[];
}
interface ApiResponse {
  results: RawResult[];
  total_pages?: number;
  total_results?: number;
}

const coordsOf = (e: RawEtablissement): LatLng | null => {
  const lat = parseFloat(String(e.latitude));
  const lng = parseFloat(String(e.longitude));
  return Number.isNaN(lat) || Number.isNaN(lng) ? null : { lat, lng };
};

/**
 * Transforme un résultat de l'API en entreprises à afficher : UNE par établissement trouvé dans la zone.
 *
 * L'API renvoie des entreprises (unités légales) dont au moins un établissement est dans le rayon, mais son champ
 * `siege` est l'adresse du siège social, parfois à l'autre bout de la France (ex : La Poste, siège à Paris, avec
 * un bureau dans ta zone). On place donc chaque point à l'adresse de l'établissement local, pas à celle du siège.
 * Si l'API ne fournit pas `matching_etablissements`, on retombe sur le siège.
 */
export function normalizeCompanies(r: RawResult): Company[] {
  const section = r.section_activite_principale ?? "";
  const withCoords = (r.matching_etablissements ?? []).filter((e) => coordsOf(e));
  const etabs = withCoords.length > 0 ? withCoords : r.siege ? [r.siege] : [];
  const directors = (r.dirigeants ?? [])
    .filter((d) => d.nom)
    .slice(0, 3)
    .map((d) => `${d.prenoms ? d.prenoms + " " : ""}${d.nom}${d.qualite ? " (" + d.qualite + ")" : ""}`);

  const out: Company[] = [];
  for (const e of etabs) {
    const pos = coordsOf(e);
    if (!pos) continue;
    const isHeadOffice = e.est_siege ?? (!!e.siret && e.siret === r.siege?.siret);
    out.push({
      id: e.siret ?? r.siren,
      siren: r.siren,
      name: r.nom_complet ?? r.nom_raison_sociale ?? "(sans nom)",
      tradeName: e.nom_commercial ?? e.liste_enseignes?.[0] ?? "",
      naf: r.activite_principale ?? "",
      section,
      category: categoryForSection(section),
      address: e.adresse ?? "",
      city: e.libelle_commune ?? "",
      isHeadOffice,
      headOfficeCity: r.siege?.libelle_commune ?? "",
      isSoleTrader: r.nature_juridique === "1000",
      lat: pos.lat,
      lng: pos.lng,
      directors,
    });
  }
  return out;
}

export interface Page {
  companies: Company[];
  totalPages: number;
  /** Nombre d'entreprises (unités légales) trouvées dans la zone d'après l'API. */
  totalResults: number;
  /** Points écartés par le filtre de distance (établissements hors du cercle). */
  dropped: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Marge pour les arrondis de l'API : on garde un point tant qu'il est à moins de rayon + 5 % + 20 m. */
export const withinRadius = (center: LatLng, radiusKm: number, p: LatLng) => distanceKm(center, p) <= radiusKm * 1.05 + 0.02;

export async function fetchCompaniesPage(center: LatLng, radiusKm: number, page: number, signal?: AbortSignal, retries = 3): Promise<Page> {
  const params = new URLSearchParams({
    lat: String(center.lat),
    long: String(center.lng),
    radius: String(radiusKm),
    per_page: String(PER_PAGE),
    page: String(page),
    etat_administratif: "A",
  });
  const res = await fetch(`${ENDPOINT}?${params}`, { signal });
  if (res.status === 429 && retries > 0) {
    await sleep(1500); // limite de débit atteinte : on patiente puis on réessaie
    return fetchCompaniesPage(center, radiusKm, page, signal, retries - 1);
  }
  if (!res.ok) throw new Error(`API Recherche d'entreprises : ${res.status}`);
  const json = (await res.json()) as ApiResponse;
  const all = json.results.flatMap(normalizeCompanies);
  // Filet de sécurité : jamais de point hors du cercle affiché, quoi que renvoie l'API.
  const inside = all.filter((c) => withinRadius(center, radiusKm, c));
  const seen = new Set<string>();
  const companies = inside.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  return {
    companies,
    totalPages: json.total_pages ?? 1,
    totalResults: json.total_results ?? json.results.length,
    dropped: all.length - inside.length,
  };
}
