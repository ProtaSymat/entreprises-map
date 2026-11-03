import type { Company, LatLng } from "../types";
import { categoryForSection } from "../lib/categories";

const ENDPOINT = "https://recherche-entreprises.api.gouv.fr/near_point";
export const PER_PAGE = 25;

interface RawDirigeant { nom?: string; prenoms?: string; qualite?: string }
interface RawSiege {
  siret?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  adresse?: string;
  libelle_commune?: string;
  nom_commercial?: string;
}
export interface RawResult {
  siren: string;
  nom_complet?: string;
  nom_raison_sociale?: string;
  activite_principale?: string;
  section_activite_principale?: string;
  nature_juridique?: string;
  siege?: RawSiege;
  dirigeants?: RawDirigeant[];
}
interface ApiResponse {
  results: RawResult[];
  total_pages?: number;
  total_results?: number;
}

export function normalizeCompany(r: RawResult): Company | null {
  const s = r.siege ?? {};
  const lat = parseFloat(String(s.latitude));
  const lng = parseFloat(String(s.longitude));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  const section = r.section_activite_principale ?? "";
  return {
    id: s.siret ?? r.siren,
    siren: r.siren,
    name: r.nom_complet ?? r.nom_raison_sociale ?? "(sans nom)",
    tradeName: s.nom_commercial ?? "",
    naf: r.activite_principale ?? "",
    section,
    category: categoryForSection(section),
    address: s.adresse ?? "",
    city: s.libelle_commune ?? "",
    isSoleTrader: r.nature_juridique === "1000",
    lat,
    lng,
    directors: (r.dirigeants ?? [])
      .filter((d) => d.nom)
      .slice(0, 3)
      .map((d) => `${d.prenoms ? d.prenoms + " " : ""}${d.nom}${d.qualite ? " (" + d.qualite + ")" : ""}`),
  };
}

export interface Page {
  companies: Company[];
  totalPages: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchCompaniesPage(center: LatLng, radiusKm: number, page: number, retries = 3): Promise<Page> {
  const params = new URLSearchParams({
    lat: String(center.lat),
    long: String(center.lng),
    radius: String(radiusKm),
    per_page: String(PER_PAGE),
    page: String(page),
    etat_administratif: "A",
  });
  const res = await fetch(`${ENDPOINT}?${params}`);
  if (res.status === 429 && retries > 0) {
    await sleep(1500);
    return fetchCompaniesPage(center, radiusKm, page, retries - 1);
  }
  if (!res.ok) throw new Error(`API Recherche d'entreprises : ${res.status}`);
  const json = (await res.json()) as ApiResponse;
  return {
    companies: json.results.map(normalizeCompany).filter((c): c is Company => c !== null),
    totalPages: json.total_pages ?? 1,
  };
}
