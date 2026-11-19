import type { CategoryKey, Company } from "../types";
import type { Place } from "../api/places";
import { CATEGORIES, CATEGORY_KEYS } from "../lib/categories";
import { DETAILS, DETAIL_KEYS, type DetailKey, type DetailsState } from "../lib/mapDetails";
import { SearchBox } from "./SearchBox";

interface Props {
  details: DetailsState;
  onDetail: (k: DetailKey, v: boolean) => void;
  radiusKm: number;
  onRadius: (v: number) => void;
  onLocate: () => void;
  onPlace: (p: Place) => void;
  hideSoleTraders: boolean;
  onHideSoleTraders: (v: boolean) => void;
  allCompanies: Company[];
  visible: Company[];
  active: Set<CategoryKey>;
  onToggle: (k: CategoryKey) => void;
  onSelect: (c: Company) => void;
  status: string;
}

export function Sidebar(p: Props) {
  const counts: Partial<Record<CategoryKey, number>> = {};
  p.allCompanies.forEach((c) => (counts[c.category] = (counts[c.category] ?? 0) + 1));

  return (
    <aside>
      <div className="top">
        <SearchBox onSelect={p.onPlace} />
        <button className="primary" onClick={p.onLocate}>Ma position</button>
        <label className="small">
          Rayon
          <input type="range" min={0.2} max={5} step={0.1} value={p.radiusKm} onChange={(e) => p.onRadius(parseFloat(e.target.value))} />
          <span>{p.radiusKm} km</span>
        </label>
        <label className="small">
          <input type="checkbox" checked={p.hideSoleTraders} onChange={(e) => p.onHideSoleTraders(e.target.checked)} />
          Masquer les entrepreneurs individuels
        </label>
      </div>

      <details className="details">
        <summary>Détails de la carte</summary>
        <div className="details-grid">
          {DETAIL_KEYS.map((k) => (
            <label key={k} className="small">
              <input type="checkbox" checked={p.details[k]} onChange={(e) => p.onDetail(k, e.target.checked)} />
              {DETAILS[k].label}
            </label>
          ))}
        </div>
      </details>

      <div className="chips">
        {CATEGORY_KEYS.filter((k) => counts[k] || p.allCompanies.length === 0).map((k) => (
          <span key={k} className={"chip" + (p.active.has(k) ? "" : " off")} onClick={() => p.onToggle(k)}>
            <i className="dot" style={{ background: CATEGORIES[k].color }} />
            {CATEGORIES[k].label}{counts[k] ? ` (${counts[k]})` : ""}
          </span>
        ))}
      </div>

      <div className="status">{p.status}</div>

      <div className="list">
        {p.visible.map((c) => (
          <div key={c.id} className="item" onClick={() => p.onSelect(c)}>
            <b><i className="dot" style={{ background: CATEGORIES[c.category].color }} /> {c.name}</b>
            <span>{CATEGORIES[c.category].label} · {c.city}</span>
          </div>
        ))}
      </div>

      <div className="note">
        Sources : API Recherche d'entreprises, API Géo (data.gouv.fr), Géoplateforme IGN, OpenStreetMap. Respecte le RGPD/CNIL pour tout démarchage.
      </div>
    </aside>
  );
}
