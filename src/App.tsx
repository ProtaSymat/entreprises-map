import { useMemo, useState } from "react";
import type { CategoryKey, Company, LatLng } from "./types";
import type { Place } from "./api/places";
import { CATEGORY_KEYS } from "./lib/categories";
import { DEFAULT_DETAILS, type DetailKey, type DetailsState } from "./lib/mapDetails";
import { useCompanies } from "./hooks/useCompanies";
import { MapView } from "./components/MapView";
import { Sidebar } from "./components/Sidebar";

export default function App() {
  const [center, setCenter] = useState<LatLng | null>(null);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(1);
  const [hideSoleTraders, setHideSoleTraders] = useState(true);
  const [active, setActive] = useState<Set<CategoryKey>>(new Set(CATEGORY_KEYS));
  const [selected, setSelected] = useState<Company | null>(null);
  const [details, setDetails] = useState<DetailsState>(DEFAULT_DETAILS);
  const [message, setMessage] = useState("Clique sur « Ma position » ou cherche une ville.");

  const { companies, loading, error, hasMore, loadMore } = useCompanies(center, radiusKm);

  const visible = useMemo(
    () => companies.filter((c) => active.has(c.category) && !(hideSoleTraders && c.isSoleTrader)),
    [companies, active, hideSoleTraders],
  );

  function toggle(k: CategoryKey) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }

  function goTo(pos: LatLng, label: string) {
    setSelected(null);
    setPlaceLabel(label);
    setCenter({ ...pos }); // nouvel objet : relance le vol même si on re-sélectionne le même lieu
  }

  function locate() {
    if (!navigator.geolocation) return setMessage("Géolocalisation non supportée.");
    setMessage("Localisation…");
    navigator.geolocation.getCurrentPosition(
      (p) => goTo({ lat: p.coords.latitude, lng: p.coords.longitude }, "Ma position"),
      () => setMessage("Position refusée : cherche une ville ou une adresse."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const hidden = companies.length - visible.length;
  const status = error
    ? `Erreur : ${error}`
    : loading
      ? "Chargement…"
      : center
        ? `${visible.length} entreprise(s) affichée(s)${hidden ? ` · ${hidden} masquée(s)` : ""}${hasMore ? " · d'autres disponibles" : ""}`
        : message;

  return (
    <div className="app">
      <Sidebar
        details={details}
        onDetail={(k: DetailKey, v: boolean) => setDetails((prev) => ({ ...prev, [k]: v }))}
        radiusKm={radiusKm}
        onRadius={setRadiusKm}
        onLocate={locate}
        onPlace={(p: Place) => goTo(p.position, p.label)}
        hideSoleTraders={hideSoleTraders}
        onHideSoleTraders={setHideSoleTraders}
        allCompanies={companies}
        visible={visible}
        active={active}
        onToggle={toggle}
        onSelect={setSelected}
        status={status}
        hasMore={hasMore}
        loading={loading}
        onMore={loadMore}
      />
      <MapView
        center={center}
        placeLabel={placeLabel}
        radiusKm={radiusKm}
        companies={visible}
        loading={loading}
        selected={selected}
        details={details}
        onSelect={setSelected}
        onDeselect={(c) => setSelected((prev) => (prev?.id === c.id ? null : prev))}
      />
    </div>
  );
}
