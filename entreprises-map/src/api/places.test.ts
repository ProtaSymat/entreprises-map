import { describe, expect, it } from "vitest";
import { communeToPlace, featureToPlace, fold, highlightSegments, markHomonyms, normalizeText } from "./places";

const commune = (nom: string, code: string, dep: string, depNom: string, pop = 1000) => ({
  nom,
  code,
  codesPostaux: ["00000"],
  departement: { code: dep, nom: depNom },
  region: { nom: "Région" },
  centre: { coordinates: [3.87, 43.61] as [number, number] },
  population: pop,
});

describe("normalisation", () => {
  it("garde la même longueur pour pouvoir surligner", () => {
    const s = "Saint-Étienne-du-Rouvray";
    expect(fold(s)).toHaveLength(s.length);
    expect(fold(s)).toBe("saint etienne du rouvray");
  });
  it("normalise accents, tirets et espaces", () => {
    expect(normalizeText("  Saint-Denis  ")).toBe("saint denis");
    expect(normalizeText("L'Île-Rousse")).toBe("l ile rousse");
  });
});

describe("highlightSegments", () => {
  it("surligne sans tenir compte des accents ni de la casse", () => {
    expect(highlightSegments("Montpellier", "mont")).toEqual([
      { text: "Mont", match: true },
      { text: "pellier", match: false },
    ]);
    expect(highlightSegments("Étampes", "etam")[0]).toEqual({ text: "Étam", match: true });
  });
  it("renvoie le texte entier si rien ne correspond", () => {
    expect(highlightSegments("Nîmes", "lyon")).toEqual([{ text: "Nîmes", match: false }]);
    expect(highlightSegments("Nîmes", "")).toEqual([{ text: "Nîmes", match: false }]);
  });
});

describe("communeToPlace", () => {
  it("construit le libellé avec le département", () => {
    const p = communeToPlace(commune("Saint-Denis", "93066", "93", "Seine-Saint-Denis", 112000))!;
    expect(p.label).toBe("Saint-Denis (93)");
    expect(p.context).toBe("Seine-Saint-Denis (93) · Région");
    expect(p.detail).toContain("hab.");
    expect(p.position).toEqual({ lat: 43.61, lng: 3.87 });
  });
  it("ignore une commune sans coordonnées", () => {
    expect(communeToPlace({ nom: "X", code: "1" })).toBeNull();
  });
});

describe("homonymes", () => {
  it("compte les villes portant le même nom", () => {
    const places = markHomonyms([
      communeToPlace(commune("Saint-Denis", "93066", "93", "Seine-Saint-Denis"))!,
      communeToPlace(commune("Saint-Denis", "97411", "974", "La Réunion"))!,
      communeToPlace(commune("Saint-Denis", "11344", "11", "Aude"))!,
      communeToPlace(commune("Saint-Denis-en-Val", "45284", "45", "Loiret"))!,
    ]);
    expect(places.map((p) => p.homonyms)).toEqual([3, 3, 3, 1]);
  });
  it("ne compte pas les adresses", () => {
    const addr = featureToPlace({ geometry: { coordinates: [3, 43] }, properties: { id: "a", label: "1 rue X 34000 Montpellier", context: "34, Hérault, Occitanie" } });
    expect(markHomonyms([addr])[0].homonyms).toBe(1);
    expect(addr.context).toBe("34 · Hérault · Occitanie");
  });
});
