import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { Company, LatLng } from "../types";
import { CATEGORIES } from "../lib/categories";
import { CompanyDetails } from "./CompanyDetails";

function Controller({ center, radiusKm, selected }: { center: LatLng | null; radiusKm: number; selected: Company | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.fitBounds(L.latLng(center.lat, center.lng).toBounds(radiusKm * 2000));
  }, [center, radiusKm, map]);
  useEffect(() => {
    if (selected) map.setView([selected.lat, selected.lng], Math.max(map.getZoom(), 17));
  }, [selected, map]);
  return null;
}

interface Props {
  center: LatLng | null;
  radiusKm: number;
  companies: Company[];
  selected: Company | null;
  onSelect: (c: Company | null) => void;
}

export function MapView({ center, radiusKm, companies, selected, onSelect }: Props) {
  return (
    <MapContainer center={[46.6, 2.5]} zoom={6} className="map">
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" maxZoom={19} />
      <Controller center={center} radiusKm={radiusKm} selected={selected} />
      {center && (
        <Circle center={[center.lat, center.lng]} radius={radiusKm * 1000} pathOptions={{ color: "#2563eb", weight: 1, fillOpacity: 0.05 }} interactive={false} />
      )}
      {companies.map((c) => (
        <CircleMarker
          key={c.id}
          center={[c.lat, c.lng]}
          radius={c.id === selected?.id ? 11 : 8}
          pathOptions={{ color: "#fff", weight: 2, fillColor: CATEGORIES[c.category].color, fillOpacity: 0.95 }}
          eventHandlers={{ click: () => onSelect(c) }}
        >
          {c.id === selected?.id && (
            <Popup eventHandlers={{ remove: () => onSelect(null) }} minWidth={240}>
              <CompanyDetails company={c} />
            </Popup>
          )}
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
