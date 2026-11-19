import { useCallback, useEffect, useMemo, useState } from "react";
import type { CategoryKey, Company, LatLng } from "./types";
import type { Place } from "./api/places";
import { CATEGORY_KEYS } from "./lib/categories";
import { DEFAULT_DETAILS, type DetailKey, type DetailsState } from "./lib/mapDetails";
import { fmt } from "./lib/format";
import { COMPANIES_PER_LOAD, useCompanies } from "./hooks/useCompanies";
import { useDebounced } from "./hooks/useDebounced";
import { MapView } from "./components/MapView";
import { Sidebar } from "./components/Sidebar";
import { LoadToast } from "./components/LoadToast";

const MIN_RADIUS_KM = 0.2;

export default function App() {
  const [center, setCenter] = useState<LatLng | null>(null);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(1);
  const [hideSoleTraders, setHideSoleTraders] = useState(true);
  const [active, setActive] = useState<Set<CategoryKey>>(new Set(CATEGORY_KEYS));
  const [selected, setSelected] = useState<Company | null>(null);
  const [details, setDetails] = useState<DetailsState>(DEFAULT_DETAILS);
  const [message, setMessage] = useState("Clique sur « Ma position » ou cherche une ville.");
  const [toastDismissed, setToastDismissed] = useState(false);

  // Le curseur bouge en continu : on ne relance le chargement (jusqu'à 40 requêtes) qu'une fois le rayon stabilisé.
  const effectiveRadius = useDebounced(radiusKm, 500);
  const { companies, loading, error, hasMore, totalResults, loadedResults, remaining, apiLimited, dropped, progress, loadMore } =
    useCompanies(center, effectiveRadius);

  // Nouvelle recherche ou nouveau rayon : la fenêtre « charger plus » peut de nouveau s'afficher.
  useEffect(() => setToastDismissed(false), [center, effectiveRadius]);

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

  const onDeselect = useCallback((c: Company) => setSelected((prev) => (prev?.id === c.id ? null : prev)), []);
  const shrinkRadius = () => setRadiusKm((r) => Math.max(MIN_RADIUS_KM, Math.round((r / 2) * 10) / 10));

  // Les entrepreneurs individuels sont masqués par défaut : on les compte à part, car ils expliquent souvent
  // l'écart entre ce qu'on voit et ce que l'API a trouvé.
  const soleHidden = hideSoleTraders ? companies.filter((c) => c.isSoleTrader && active.has(c.category)).length : 0;
  const filteredOut = companies.length - visible.length - soleHidden;
  const status = error
    ? `Erreur : ${error}`
    : loading
      ? `Chargement… ${Math.round(progress * 100)} %`
      : center
        ? [
            `${fmt(visible.length)} entreprise(s) affichée(s)`,
            soleHidden ? `${fmt(soleHidden)} entrepreneur(s) individuel(s) masqué(s)` : null,
            filteredOut ? `${fmt(filteredOut)} masquée(s) par les filtres` : null,
            totalResults ? `${fmt(loadedResults)}/${fmt(totalResults)} chargées` : null,
            dropped ? `${fmt(dropped)} hors zone écartée(s)` : null,
          ]
            .filter(Boolean)
            .join(" · ")
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
      />
      <MapView
        center={center}
        placeLabel={placeLabel}
        radiusKm={effectiveRadius}
        companies={visible}
        loading={loading}
        progress={progress}
        selected={selected}
        details={details}
        onSelect={setSelected}
        onDeselect={onDeselect}
        overlay={
          <LoadToast
            visible={!!center && !loading && !toastDismissed && (hasMore || apiLimited)}
            loaded={loadedResults}
            total={totalResults}
            remaining={remaining}
            batch={COMPANIES_PER_LOAD}
            hasMore={hasMore}
            apiLimited={apiLimited}
            canShrink={radiusKm > MIN_RADIUS_KM}
            onMore={loadMore}
            onShrink={shrinkRadius}
            onClose={() => setToastDismissed(true)}
          />
        }
      />
    </div>
  );
}
