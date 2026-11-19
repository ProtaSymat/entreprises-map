import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { highlightSegments, normalizeText, type Place } from "../api/places";
import { usePlaceSearch } from "../hooks/usePlaceSearch";
import { clearRecent, loadRecent, saveRecent } from "../lib/recent";

function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlightSegments(text, query).map((s, i) =>
        s.match ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>,
      )}
    </>
  );
}

const svgProps = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const SearchIcon = () => (
  <svg {...svgProps} aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
const CityIcon = () => (
  <svg {...svgProps} aria-hidden="true"><path d="M3 21V9l6-3v15" /><path d="M9 21V4l6 3v14" /><path d="M15 21V11l6 2v8" /><path d="M2 21h20" /></svg>
);
const PinIcon = () => (
  <svg {...svgProps} aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
);

interface Props {
  onSelect: (place: Place) => void;
}

export function SearchBox({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [nudge, setNudge] = useState(false);
  const [pending, setPending] = useState(false);
  const [recent, setRecent] = useState<Place[]>(() => loadRecent());
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const { results, loading, error, settledFor } = usePlaceSearch(query);

  const trimmed = query.trim();
  const showRecent = trimmed.length < 2;
  const items: Place[] = showRecent ? recent : results;

  // Plusieurs villes portent exactement le nom tapé : on ne devine pas, on demande.
  const q = normalizeText(trimmed);
  const ambiguous = !showRecent && results.some((p) => p.kind === "commune" && p.homonyms > 1 && normalizeText(p.name) === q);

  useEffect(() => {
    setActive(-1);
    setNudge(false);
  }, [query]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function choose(p: Place) {
    setRecent(saveRecent(p));
    setQuery(p.label);
    setOpen(false);
    setNudge(false);
    setActive(-1);
    setPending(false);
    inputRef.current?.blur();
    onSelect(p);
  }

  function submit() {
    if (active >= 0 && items[active]) return choose(items[active]);
    if (showRecent) return;
    if (loading) { setPending(true); return; } // on attend la réponse, puis on valide
    if (items.length === 0) return;
    if (ambiguous) { setNudge(true); setActive(0); setOpen(true); return; }
    choose(items[0]);
  }

  useEffect(() => {
    if (pending && !loading) {
      setPending(false);
      submit();
    }
  });

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (items.length ? (i + 1) % items.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (items.length ? (i <= 0 ? items.length - 1 : i - 1) : -1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  const noResult = !showRecent && !loading && !error && settledFor === trimmed && results.length === 0;

  let prevKind: Place["kind"] | null = null;

  return (
    <div className="sb" ref={rootRef}>
      <div className={"sb-field" + (open ? " open" : "")}>
        <SearchIcon />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Ville, code postal ou adresse…"
          autoComplete="off"
          spellCheck={false}
        />
        {loading && <span className="sb-spin" aria-label="Recherche en cours" />}
        {!loading && query && (
          <button type="button" className="sb-clear" aria-label="Effacer" onClick={() => { setQuery(""); setOpen(true); inputRef.current?.focus(); }}>
            ×
          </button>
        )}
      </div>

      {open && (
        <div className="sb-pop">
          {ambiguous && (
            <div className={"sb-note" + (nudge ? " nudge" : "")} key={String(nudge)}>
              Plusieurs villes s'appellent « {trimmed} ». Choisis la bonne grâce au département.
            </div>
          )}
          {error && <div className="sb-note error">Service de recherche indisponible, réessaie dans un instant.</div>}
          {noResult && <div className="sb-empty">Aucun lieu trouvé pour « {trimmed} ».</div>}
          {showRecent && recent.length === 0 && (
            <div className="sb-empty">Tape le nom d'une ville, un code postal ou une adresse.</div>
          )}

          <ul className="sb-list" id={listId} role="listbox">
            {items.map((p, i) => {
              const header =
                showRecent
                  ? i === 0 ? "Récents" : null
                  : p.kind !== prevKind ? (p.kind === "commune" ? "Villes" : "Adresses") : null;
              prevKind = p.kind;
              return (
                <li key={p.id} role="presentation">
                  {header && (
                    <div className="sb-group">
                      <span>{header}</span>
                      {showRecent && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setRecent(clearRecent())}>Effacer</button>}
                    </div>
                  )}
                  <div
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className={"sb-item" + (i === active ? " active" : "")}
                    style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(p)}
                  >
                    <span className={"sb-ico " + p.kind}>{p.kind === "commune" ? <CityIcon /> : <PinIcon />}</span>
                    <span className="sb-txt">
                      <span className="sb-name">
                        <span className="sb-nm"><Highlight text={p.name} query={showRecent ? "" : trimmed} /></span>
                        {p.homonyms > 1 && p.deptCode && <em className="sb-badge">{p.deptCode}</em>}
                      </span>
                      <span className="sb-ctx">
                        {p.context}
                        {p.detail ? ` · ${p.detail}` : ""}
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          {items.length > 0 && (
            <div className="sb-foot">
              <span><kbd>↑</kbd><kbd>↓</kbd> naviguer</span>
              <span><kbd>↵</kbd> choisir</span>
              <span><kbd>échap</kbd> fermer</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
