import { memo, useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { Circle, CircleMarker, MapContainer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { Company, LatLng } from "../types";
import type { DetailsState } from "../lib/mapDetails";
import { CATEGORIES } from "../lib/categories";
import { fmt } from "../lib/format";
import { CompanyDetails } from "./CompanyDetails";
import { VectorBaseLayer } from "./VectorBaseLayer";

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/** Pilote la caméra : vol animé vers le lieu, zoom doux sur l'entreprise choisie, mode « scan » pendant le chargement. */
/** Au-delà de ce nombre de points, on coupe les animations d'apparition pour garder la carte fluide. */
const DENSE_THRESHOLD = 400;

function Controller({ center, radiusKm, selected, scanning, dense }: { center: LatLng | null; radiusKm: number; selected: Company | null; scanning: boolean; dense: boolean }) {
  const map = useMap();
  const prevCenter = useRef<LatLng | null>(null);

  useEffect(() => {
    if (!center) return;
    const sameSpot = prevCenter.current?.lat === center.lat && prevCenter.current?.lng === center.lng;
    prevCenter.current = center;
    const bounds = L.latLng(center.lat, center.lng).toBounds(radiusKm * 2000);
    // Nouveau lieu : grand vol cinématique. Simple changement de rayon : ajustement rapide.
    map.flyToBounds(bounds, { duration: sameSpot ? 0.6 : 2.4, easeLinearity: 0.2, paddingTopLeft: [30, 76], paddingBottomRight: [30, 30] });
  }, [center, radiusKm, map]);

  useEffect(() => {
    if (selected) map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 17), { duration: 1.1, easeLinearity: 0.25 });
  }, [selected, map]);

  useEffect(() => {
    map.getContainer().classList.toggle("is-scanning", scanning);
  }, [scanning, map]);

  useEffect(() => {
    map.getContainer().classList.toggle("many-dots", dense);
  }, [dense, map]);

  return null;
}

/** Repère du lieu : point bleu, ondes qui se propagent, étiquette avec le nom de la ville. */
function CenterMarker({ center, label }: { center: LatLng; label: string | null }) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "cm-wrap",
        iconSize: [0, 0],
        html:
          `<div class="cm"><i class="ring r1"></i><i class="ring r2"></i><i class="ring r3"></i><i class="core"></i>` +
          (label ? `<span class="tag">${escapeHtml(label)}</span>` : "") +
          `</div>`,
      }),
    [label],
  );
  // key : un nouveau lieu remonte le repère, donc rejoue l'animation d'apparition.
  return <Marker key={`${center.lat},${center.lng}`} position={[center.lat, center.lng]} icon={icon} interactive={false} keyboard={false} zIndexOffset={-100} />;
}

/**
 * Ouvre la fiche du marqueur dès que ce composant se monte (donc dès que l'entreprise est sélectionnée).
 * Il doit se monter avec la <Popup> : ainsi, le démontage/remontage de React StrictMode en développement
 * rejoue l'ouverture au lieu de laisser la fiche fermée.
 */
function PopupOpener({ marker }: { marker: RefObject<L.CircleMarker> }) {
  useEffect(() => {
    marker.current?.openPopup();
  }, [marker]);
  return null;
}

/** Rond coloré d'une entreprise. La fiche s'ouvre par code dès que l'entreprise est sélectionnée (clic carte ou liste). */
const CompanyDot = memo(function CompanyDot({ company: c, index, isSelected, onSelect, onDeselect }: {
  company: Company;
  index: number;
  isSelected: boolean;
  onSelect: (c: Company) => void;
  onDeselect: (c: Company) => void;
}) {
  const ref = useRef<L.CircleMarker>(null);
  // Objets mémorisés : sans cela, chaque rendu referait un setStyle sur des milliers de marqueurs.
  const center = useMemo<[number, number]>(() => [c.lat, c.lng], [c.lat, c.lng]);
  const pathOptions = useMemo(
    () => ({ color: "#fff", weight: 2, fillColor: CATEGORIES[c.category].color, fillOpacity: 0.95, className: `dot-pop dp${index % 12}` }),
    [c.category, index],
  );
  const eventHandlers = useMemo(() => ({ click: () => onSelect(c) }), [c, onSelect]);

  return (
    <CircleMarker
      ref={ref}
      center={center}
      radius={isSelected ? 11 : 8}
      pathOptions={pathOptions}
      eventHandlers={eventHandlers}
    >
      {isSelected && (
        // autoPan désactivé : il interromprait l'animation de vol vers l'entreprise.
        <Popup autoPan={false} eventHandlers={{ remove: () => onDeselect(c) }} minWidth={240}>
          <CompanyDetails company={c} />
        </Popup>
      )}
      {isSelected && <PopupOpener marker={ref} />}
    </CircleMarker>
  );
});

interface Props {
  center: LatLng | null;
  placeLabel: string | null;
  radiusKm: number;
  companies: Company[];
  loading: boolean;
  /** Avancement du lot en cours, de 0 à 1. */
  progress: number;
  selected: Company | null;
  details: DetailsState;
  onSelect: (c: Company) => void;
  /** Appelé quand la fiche d'une entreprise se ferme : ne désélectionne que si c'est toujours elle. */
  onDeselect: (c: Company) => void;
  /** Éléments posés par-dessus la carte (ex : la fenêtre « charger plus »). */
  overlay?: ReactNode;
}

export function MapView({ center, placeLabel, radiusKm, companies, loading, progress, selected, details, onSelect, onDeselect, overlay }: Props) {
  return (
    <MapContainer
      center={[46.6, 2.5]}
      zoom={6}
      minZoom={3}
      maxZoom={19}
      maxBounds={[[-85, -Infinity], [85, Infinity]]}
      maxBoundsViscosity={1}
      zoomSnap={0.25}
      className="map"
    >
      <VectorBaseLayer details={details} />
      <Controller center={center} radiusKm={radiusKm} selected={selected} scanning={loading} dense={companies.length > DENSE_THRESHOLD} />

      {center && (
        <>
          <Circle
            center={[center.lat, center.lng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: "#2563eb", weight: 2, fillColor: "#2563eb", fillOpacity: 0.06, className: "radius-ring" }}
            interactive={false}
          />
          <CenterMarker center={center} label={placeLabel} />
        </>
      )}

      {selected && (
        <CircleMarker
          key={`halo-${selected.id}`}
          center={[selected.lat, selected.lng]}
          radius={20}
          pathOptions={{ color: CATEGORIES[selected.category].color, weight: 2, fillColor: CATEGORIES[selected.category].color, fillOpacity: 0.2, className: "halo-pulse" }}
          interactive={false}
        />
      )}

      {companies.map((c, i) => (
        <CompanyDot key={c.id} company={c} index={i} isSelected={c.id === selected?.id} onSelect={onSelect} onDeselect={onDeselect} />
      ))}

      {center && (
        <div className="hud" key={placeLabel ?? "pos"}>
          <span className={"hud-dot" + (loading ? " busy" : "")} />
          <b>{placeLabel ?? "Zone de recherche"}</b>
          <span className="hud-sep">·</span>
          <span>
            {loading
              ? `Chargement… ${Math.round(progress * 100)} % · ${fmt(companies.length)}`
              : `${fmt(companies.length)} entreprise${companies.length > 1 ? "s" : ""}`}
          </span>
          {loading && <span className="hud-bar" aria-hidden="true"><i style={{ width: `${Math.round(progress * 100)}%` }} /></span>}
        </div>
      )}

      {overlay}

      <div className="attribution">
        <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>{" "}
        &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a>{" "}
        Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
      </div>
    </MapContainer>
  );
}
