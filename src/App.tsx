import { useMemo, useState } from "react";
import type { CategoryKey, Company, LatLng } from "./types";
import { CATEGORY_KEYS } from "./lib/categories";
import { geocode } from "./api/geocode";
import { useCompanies } from "./hooks/useCompanies";
import { MapView } from "./components/MapView";
import { Sidebar } from "./components/Sidebar";

export default function App() {
  const [center, setCenter] = useState<LatLng | null>(null);
  const [radiusKm, setRadiusKm] = useState(1);
  const [hideSoleTraders, setHideSoleTraders] = useState(true);
  const [active, setActive] = useState<Set<CategoryKey>>(new Set(CATEGORY_KEYS));
  const [selected, setSelected] = useState<Company | null>(null);
  const [message, setMessage] = useState("Clique sur « Ma position » ou cherche une adresse.");

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

  function locate() {
    if (!navigator.geolocation) return setMessage("Géolocalisation non supportée.");
    setMessage("Localisation…");
    navigator.geolocation.getCurrentPosition(
      (p) => setCenter({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setMessage("Position refusée : tape une adresse ou une ville."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function search(q: string) {
    if (!q.trim()) return;
    try {
      const pos = await geocode(q.trim());
      if (pos) setCenter(pos); else setMessage("Adresse introuvable.");
    } catch {
      setMessage("Géocodage indisponible.");
    }
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
        radiusKm={radiusKm}
        onRadius={setRadiusKm}
        onLocate={locate}
        onSearch={search}
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
      <MapView center={center} radiusKm={radiusKm} companies={visible} selected={selected} onSelect={setSelected} />
    </div>
  );
}
