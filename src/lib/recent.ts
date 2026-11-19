import type { Place } from "../api/places";

const KEY = "entreprises-map:recent";
const MAX = 5;

export function loadRecent(): Place[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? (list as Place[]).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function saveRecent(place: Place): Place[] {
  const list = [place, ...loadRecent().filter((p) => p.id !== place.id)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* stockage indisponible : l'historique n'est qu'un confort */
  }
  return list;
}

export function clearRecent(): Place[] {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* idem */
  }
  return [];
}
