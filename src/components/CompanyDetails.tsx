import { useState } from "react";
import type { Company, ContactInfo } from "../types";
import { CATEGORIES } from "../lib/categories";
import { lookupContact } from "../api/overpass";

export function CompanyDetails({ company }: { company: Company }) {
  const [contact, setContact] = useState<ContactInfo | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    setBusy(true);
    setError(null);
    try {
      setContact(await lookupContact(company));
    } catch {
      setError("OpenStreetMap indisponible, réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  const web = `https://duckduckgo.com/?q=${encodeURIComponent(company.name + " " + company.city)}`;
  const official = `https://annuaire-entreprises.data.gouv.fr/entreprise/${company.siren}`;

  return (
    <div className="pop">
      <h3>{company.name}</h3>
      <div className="meta">
        {CATEGORIES[company.category].label} · NAF {company.naf}
        <br />
        {company.address}
      </div>
      {company.directors.length > 0 && !company.isSoleTrader && (
        <div className="meta">Dirigeants : {company.directors.join(", ")}</div>
      )}
      {contact === null && <div className="meta">Aucune fiche OSM correspondante.</div>}
      {contact && (
        <div className="meta">
          {contact.phone && <div>Tél : <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a></div>}
          {contact.email && <div>Email : <a href={`mailto:${contact.email}`}>{contact.email}</a></div>}
          {contact.website && (
            <div>
              Site : <a target="_blank" rel="noopener noreferrer" href={/^https?:/.test(contact.website) ? contact.website : `https://${contact.website}`}>{contact.website}</a>
            </div>
          )}
          {contact.openingHours && <div>Horaires : {contact.openingHours}</div>}
          {!contact.phone && !contact.email && !contact.website && !contact.openingHours && <div>Fiche OSM trouvée, sans coordonnées.</div>}
        </div>
      )}
      {error && <div className="meta">{error}</div>}
      <div className="btns">
        <button onClick={search} disabled={busy}>{busy ? "Recherche…" : "Chercher tél./site (OSM)"}</button>
        <a href={web} target="_blank" rel="noopener noreferrer"><button>Chercher sur le web</button></a>
        <a href={official} target="_blank" rel="noopener noreferrer"><button>Fiche officielle</button></a>
      </div>
    </div>
  );
}
