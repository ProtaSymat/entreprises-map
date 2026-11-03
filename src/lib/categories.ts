import type { CategoryKey } from "../types";

export interface Category {
  label: string;
  color: string;
  sections: string[]; // sections NAF (lettres)
}

export const CATEGORIES: Record<CategoryKey, Category> = {
  commerce:  { label: "Commerce",               color: "#f59e0b", sections: ["G"] },
  resto:     { label: "Restauration / Hôtels",  color: "#ef4444", sections: ["I"] },
  btp:       { label: "BTP / Construction",     color: "#a16207", sections: ["F"] },
  industrie: { label: "Industrie / Énergie",    color: "#6b7280", sections: ["B", "C", "D", "E"] },
  transport: { label: "Transport / Logistique", color: "#0ea5e9", sections: ["H"] },
  it:        { label: "Info / Communication",   color: "#8b5cf6", sections: ["J"] },
  finance:   { label: "Finance / Assurance",    color: "#10b981", sections: ["K"] },
  immo:      { label: "Immobilier",             color: "#14b8a6", sections: ["L"] },
  pro:       { label: "Conseil / Services pro", color: "#3b82f6", sections: ["M", "N"] },
  sante:     { label: "Santé / Social",         color: "#ec4899", sections: ["Q"] },
  edu:       { label: "Enseignement / Public",  color: "#84cc16", sections: ["O", "P"] },
  loisirs:   { label: "Arts / Loisirs / Autres", color: "#f97316", sections: ["R", "S", "T", "U"] },
  agri:      { label: "Agriculture",            color: "#22c55e", sections: ["A"] },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

const sectionToCategory: Record<string, CategoryKey> = {};
for (const key of CATEGORY_KEYS) {
  for (const s of CATEGORIES[key].sections) sectionToCategory[s] = key;
}

export function categoryForSection(section: string): CategoryKey {
  return sectionToCategory[section] ?? "loisirs";
}
