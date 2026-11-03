import { describe, expect, it } from "vitest";
import { normalizeCompany } from "./entreprises";
import { namesMatch, normalizeName } from "./overpass";

describe("normalizeCompany", () => {
  it("convertit un résultat de l'API", () => {
    const c = normalizeCompany({
      siren: "123456789",
      nom_complet: "BOULANGERIE DUPONT",
      activite_principale: "10.71C",
      section_activite_principale: "C",
      nature_juridique: "5710",
      siege: { siret: "12345678900011", latitude: "43.61", longitude: "3.87", adresse: "1 RUE X", libelle_commune: "MONTPELLIER" },
      dirigeants: [{ nom: "DUPONT", prenoms: "Jean", qualite: "Président" }],
    });
    expect(c).not.toBeNull();
    expect(c!.category).toBe("industrie");
    expect(c!.lat).toBeCloseTo(43.61);
    expect(c!.isSoleTrader).toBe(false);
    expect(c!.directors[0]).toBe("Jean DUPONT (Président)");
  });
  it("ignore une entreprise sans coordonnées", () => {
    expect(normalizeCompany({ siren: "1", siege: {} })).toBeNull();
  });
  it("détecte un entrepreneur individuel", () => {
    const c = normalizeCompany({ siren: "1", nature_juridique: "1000", siege: { latitude: 1, longitude: 2 } });
    expect(c!.isSoleTrader).toBe(true);
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
