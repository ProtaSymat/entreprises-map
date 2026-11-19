import { useEffect, useRef } from "react";
import L from "leaflet";
import { fmt } from "../lib/format";

interface Props {
  visible: boolean;
  loaded: number;
  total: number;
  /** Entreprises qu'un clic supplémentaire permet de charger. */
  remaining: number;
  batch: number;
  hasMore: boolean;
  apiLimited: boolean;
  canShrink: boolean;
  onMore: () => void;
  onShrink: () => void;
  onClose: () => void;
}

/** Fenêtre en bas à droite de la carte : explique que la zone contient trop d'entreprises pour tout charger d'un coup. */
export function LoadToast(p: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Les clics et la molette sur la fenêtre ne doivent pas déplacer ni zoomer la carte.
  useEffect(() => {
    if (!ref.current) return;
    L.DomEvent.disableClickPropagation(ref.current);
    L.DomEvent.disableScrollPropagation(ref.current);
  }, [p.visible]);

  if (!p.visible) return null;
  const pct = p.total > 0 ? Math.min(100, Math.round((p.loaded / p.total) * 100)) : 0;

  return (
    <div className="toast" ref={ref} role="status">
      <button type="button" className="toast-x" aria-label="Fermer" onClick={p.onClose}>×</button>
      <div className="toast-title">{p.hasMore ? "Beaucoup d'entreprises dans cette zone" : "Zone trop dense pour l'API"}</div>
      <p>
        <b>{fmt(p.loaded)}</b> entreprises chargées sur <b>{fmt(p.total)}</b>.{" "}
        {p.hasMore
          ? `Pour garder la carte fluide, elles se chargent par lots de ${fmt(p.batch)}.`
          : "L'API ne renvoie pas plus de 10 000 résultats par recherche."}
      </p>
      <div className="toast-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
      {p.apiLimited && p.hasMore && <p className="toast-warn">Au-delà de 10 000, l'API s'arrête : réduis le rayon pour tout voir.</p>}
      {!p.hasMore && <p className="toast-warn">Réduis le rayon pour voir toutes les entreprises de la zone.</p>}
      <div className="toast-actions">
        {p.hasMore && (
          <button type="button" className="primary" onClick={p.onMore}>
            Charger {fmt(Math.min(p.batch, p.remaining))} de plus
          </button>
        )}
        {p.canShrink && <button type="button" onClick={p.onShrink}>Réduire le rayon</button>}
      </div>
    </div>
  );
}
