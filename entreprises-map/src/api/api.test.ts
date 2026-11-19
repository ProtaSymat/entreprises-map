import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCompaniesPage, normalizeCompanies, withinRadius } from "./entreprises";
import { namesMatch, normalizeName } from "./overpass";
import { distanceKm } from "../lib/geo";
import { planBatches } from "../lib/paging";

const SIEGE_PARIS = { siret: "35600000000048", latitude: "48.86", longitude: "2.35", adresse: "SIEGE PARIS", libelle_commune: "PARIS" };

describe("normalizeCompanies", () => {
  it("convertit un résultat de l'API (siège seul)", () => {
    const [c] = normalizeCompanies({
      siren: "123456789",
      nom_complet: "BOULANGERIE DUPONT",
      activite_principale: "10.71C",
      section_activite_principale: "C",
      nature_juridique: "5710",
      siege: { siret: "12345678900011", latitude: "43.61", longitude: "3.87", adresse: "1 RUE X", libelle_commune: "MONTPELLIER" },
      dirigeants: [{ nom: "DUPONT", prenoms: "Jean", qualite: "Président" }],
    });
    expect(c.category).toBe("industrie");
    expect(c.lat).toBeCloseTo(43.61);
    expect(c.isHeadOffice).toBe(true);
    expect(c.isSoleTrader).toBe(false);
    expect(c.directors[0]).toBe("Jean DUPONT (Président)");
  });

  it("place l'entreprise à son établissement local, pas à son siège (bug La Poste à Paris)", () => {
    const list = normalizeCompanies({
      siren: "356000000",
      nom_complet: "LA POSTE",
      siege: SIEGE_PARIS,
      matching_etablissements: [
        { siret: "35600000012345", latitude: "48.9", longitude: "1.2", adresse: "BUREAU DE POSTE", libelle_commune: "TILLIERES-SUR-AVRE", est_siege: false },
      ],
    });
    expect(list).toHaveLength(1);
    expect(list[0].city).toBe("TILLIERES-SUR-AVRE");
    expect(list[0].lat).toBeCloseTo(48.9);
    expect(list[0].isHeadOffice).toBe(false);
    expect(list[0].headOfficeCity).toBe("PARIS");
  });

  it("crée un point par établissement trouvé dans la zone", () => {
    const list = normalizeCompanies({
      siren: "1",
      siege: SIEGE_PARIS,
      matching_etablissements: [
        { siret: "a", latitude: 1, longitude: 2 },
        { siret: "b", latitude: 1.001, longitude: 2.001 },
      ],
    });
    expect(list.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("retombe sur le siège si matching_etablissements est vide ou sans coordonnées", () => {
    expect(normalizeCompanies({ siren: "1", siege: SIEGE_PARIS, matching_etablissements: [] })[0].city).toBe("PARIS");
    expect(normalizeCompanies({ siren: "1", siege: SIEGE_PARIS, matching_etablissements: [{ siret: "x" }] })[0].city).toBe("PARIS");
  });

  it("ignore une entreprise sans aucune coordonnée", () => {
    expect(normalizeCompanies({ siren: "1", siege: {} })).toEqual([]);
    expect(normalizeCompanies({ siren: "1" })).toEqual([]);
  });

  it("détecte un entrepreneur individuel", () => {
    const [c] = normalizeCompanies({ siren: "1", nature_juridique: "1000", siege: { latitude: 1, longitude: 2 } });
    expect(c.isSoleTrader).toBe(true);
  });
});

describe("filtre de distance", () => {
  const tillieres = { lat: 48.7666, lng: 1.0833 };
  const paris = { lat: 48.8566, lng: 2.3522 };
  it("calcule une distance réaliste (Tillières → Paris ≈ 94 km)", () => {
    expect(distanceKm(tillieres, paris)).toBeGreaterThan(90);
    expect(distanceKm(tillieres, paris)).toBeLessThan(98);
  });
  it("écarte un point hors du rayon et garde un point dedans", () => {
    expect(withinRadius(tillieres, 3.9, paris)).toBe(false);
    expect(withinRadius(tillieres, 3.9, { lat: 48.768, lng: 1.085 })).toBe(true);
  });
});

describe("rapprochement de noms OSM", () => {
  it("normalise accents, ponctuation et formes juridiques", () => {
    expect(normalizeName("Café de l'Étoile SARL")).toBe("cafe de l etoile");
  });
  it("rapproche un nom commercial d'une raison sociale", () => {
    expect(namesMatch("SARL Boulangerie Dupont", "Boulangerie Dupont")).toBe(true);
    expect(namesMatch("Pharmacie Centrale", "Boulangerie Dupont")).toBe(false);
    expect(namesMatch("", "Boulangerie Dupont")).toBe(false);
  });
});

describe("fetchCompaniesPage", () => {
  const center = { lat: 48.7666, lng: 1.0833 };
  afterEach(() => vi.unstubAllGlobals());

  const stubApi = (body: unknown, status = 200) => {
    const fn = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
    vi.stubGlobal("fetch", fn);
    return fn;
  };

  it("renvoie les totaux de l'API et compte les points écartés hors zone", async () => {
    stubApi({
      total_results: 2300,
      total_pages: 92,
      results: [
        // établissement local : gardé
        { siren: "1", siege: SIEGE_PARIS, matching_etablissements: [{ siret: "a", latitude: "48.768", longitude: "1.085" }] },
        // seul le siège (Paris) est connu : hors du rayon, donc écarté et compté
        { siren: "2", siege: SIEGE_PARIS },
      ],
    });
    const page = await fetchCompaniesPage(center, 3.9, 1);
    expect(page.totalResults).toBe(2300);
    expect(page.totalPages).toBe(92);
    expect(page.companies.map((c) => c.id)).toEqual(["a"]);
    expect(page.dropped).toBe(1);
  });

  it("transmet le signal d'annulation et les paramètres de zone", async () => {
    const fn = stubApi({ results: [] });
    const ctrl = new AbortController();
    await fetchCompaniesPage(center, 2, 7, ctrl.signal);
    const [url, init] = fn.mock.calls[0];
    expect(String(url)).toContain("page=7");
    expect(String(url)).toContain("radius=2");
    expect((init as RequestInit).signal).toBe(ctrl.signal);
  });

  it("dédoublonne les établissements d'une même page", async () => {
    stubApi({ results: [
      { siren: "1", siege: SIEGE_PARIS, matching_etablissements: [{ siret: "a", latitude: 48.77, longitude: 1.09 }] },
      { siren: "1", siege: SIEGE_PARIS, matching_etablissements: [{ siret: "a", latitude: 48.77, longitude: 1.09 }] },
    ] });
    expect((await fetchCompaniesPage(center, 3, 1)).companies).toHaveLength(1);
  });

  it("lève une erreur lisible si l'API répond mal", async () => {
    stubApi({}, 500);
    await expect(fetchCompaniesPage(center, 3, 1)).rejects.toThrow("500");
  });
});

describe("planBatches", () => {
  it("découpe les pages en lots parallèles", () => {
    expect(planBatches(0, 10, 4)).toEqual([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10]]);
  });
  it("reprend après les pages déjà chargées", () => {
    expect(planBatches(40, 44, 4)).toEqual([[41, 42, 43, 44]]);
  });
  it("ne renvoie rien s'il n'y a plus de page à charger", () => {
    expect(planBatches(5, 5, 4)).toEqual([]);
    expect(planBatches(8, 5, 4)).toEqual([]);
  });
});
