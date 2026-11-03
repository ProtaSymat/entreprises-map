import { useState } from "react";
import type { CategoryKey, Company } from "../types";
import { CATEGORIES, CATEGORY_KEYS } from "../lib/categories";

interface Props {
  radiusKm: number;
  onRadius: (v: number) => void;
  onLocate: () => void;
  onSearch: (q: string) => void;
  hideSoleTraders: boolean;
  onHideSoleTraders: (v: boolean) => void;
  allCompanies: Company[];
  visible: Company[];
  active: Set<CategoryKey>;
  onToggle: (k: CategoryKey) => void;
  onSelect: (c: Company) => void;
  status: string;
  hasMore: boolean;
  loading: boolean;
  onMore: () => void;
}

export function Sidebar(p: Props) {
  const [q, setQ] = useState("");
  const counts: Partial<Record<CategoryKey, number>> = {};
  p.allCompanies.forEach((c) => (counts[c.category] = (counts[c.category] ?? 0) + 1));

  return (
    <aside>
      <div className="top">
        <form className="row" onSubmit={(e) => { e.preventDefault(); p.onSearch(q); }}>
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Adresse ou ville (ex : Montpellier)" />
          <button type="submit">Chercher</button>
        </form>
        <div className="row">
          <button className="primary grow" onClick={p.onLocate}>Ma position</button>
          <button onClick={p.onMore} disabled={!p.hasMore || p.loading}>Charger plus</button>
        </div>
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
        Sources : API Recherche d'entreprises (data.gouv.fr), Géoplateforme IGN, OpenStreetMap. Respecte le RGPD/CNIL pour tout démarchage.
      </div>
    </aside>
  );
}
