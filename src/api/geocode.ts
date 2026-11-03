import type { LatLng } from "../types";

interface GeoResponse {
  features?: { geometry: { coordinates: [number, number] } }[];
}

/** Géocodage via la Géoplateforme IGN (gratuit, sans clé). */
export async function geocode(query: string): Promise<LatLng | null> {
  const res = await fetch(`https://data.geopf.fr/geocodage/search?limit=1&q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Géocodage : ${res.status}`);
  const json = (await res.json()) as GeoResponse;
  const f = json.features?.[0];
  if (!f) return null;
  return { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
}
