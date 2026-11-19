import { describe, expect, it } from "vitest";
import { normalizeCompanies, withinRadius } from "./entreprises";
import { namesMatch, normalizeName } from "./overpass";
import { distanceKm } from "../lib/geo";

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
