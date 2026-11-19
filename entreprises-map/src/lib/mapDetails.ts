export type DetailKey =
  | "houseNumbers" | "pois" | "boundaries" | "shields" | "transport"
  | "waterLabels" | "streetNames" | "placeNames";

export interface DetailRule {
  label: string;
  /** Une couche du style est concernée si son id correspond à ce motif. */
  pattern: RegExp;
  defaultVisible: boolean;
}

/**
 * Le style OpenFreeMap suit le schéma OpenMapTiles : on repère les couches par leur id.
 * Les motifs sont volontairement larges pour rester valides si le style évolue.
 */
export const DETAILS: Record<DetailKey, DetailRule> = {
  houseNumbers: { label: "Numéros de maison",         pattern: /house.?number/i,                         defaultVisible: false },
  pois:         { label: "Pictos (commerces, POI)",   pattern: /(^|[_-])poi([_-]|$)/i,                   defaultVisible: false },
  boundaries:   { label: "Frontières (dont maritimes)", pattern: /boundary|admin|border/i,               defaultVisible: false },
  shields:      { label: "Écussons de routes",        pattern: /shield|road.?ref/i,                      defaultVisible: false },
  transport:    { label: "Aéroports, ferries, rails", pattern: /aero|airport|ferry|rail|transit/i,       defaultVisible: false },
  waterLabels:  { label: "Noms de mers et d'eau",     pattern: /water.?name|waterway.?label|marine|ocean/i, defaultVisible: false },
  streetNames:  { label: "Noms de rues",              pattern: /(road|street|highway).*(label|name)|(label|name).*(road|street|highway)/i, defaultVisible: true },
  placeNames:   { label: "Noms de villes et quartiers", pattern: /^(place|country|state|city|town|village|suburb|neighbo)|label_(city|town|village|state|country|other)/i, defaultVisible: true },
};

export const DETAIL_KEYS = Object.keys(DETAILS) as DetailKey[];

export type DetailsState = Record<DetailKey, boolean>;

export const DEFAULT_DETAILS: DetailsState = Object.fromEntries(
  DETAIL_KEYS.map((k) => [k, DETAILS[k].defaultVisible]),
) as DetailsState;

/** Renvoie true si la couche doit être cachée pour l'état courant. */
export function shouldHide(layerId: string, state: DetailsState): boolean {
  return DETAIL_KEYS.some((k) => !state[k] && DETAILS[k].pattern.test(layerId));
}
