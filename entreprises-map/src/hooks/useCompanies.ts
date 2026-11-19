import { useCallback, useEffect, useRef, useState } from "react";
import type { Company, LatLng } from "../types";
import { fetchCompaniesPage, PER_PAGE, type Page } from "../api/entreprises";
import { planBatches } from "../lib/paging";

/** Pages chargées à chaque lot : 40 × 25 = 1 000 entreprises. Tout ce qui tient dans un lot est chargé d'un coup. */
export const PAGES_PER_LOAD = 40;
export const COMPANIES_PER_LOAD = PAGES_PER_LOAD * PER_PAGE;
/** L'API ne renvoie que les 10 000 premiers résultats d'une recherche (400 pages de 25). */
export const API_MAX_PAGES = 400;

const CONCURRENCY = 4; // pages demandées en parallèle
const BATCH_GAP_MS = 650; // ≈ 6 requêtes/s : sous la limite de l'API (7/s)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useCompanies(center: LatLng | null, radiusKm: number) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pagesLoaded, setPagesLoaded] = useState(0);
  const [apiLimited, setApiLimited] = useState(false);
  const [dropped, setDropped] = useState(0);
  const [progress, setProgress] = useState(0);

  const pageRef = useRef(0);
  const totalPagesRef = useRef(0);
  const runRef = useRef(0); // invalide les chargements obsolètes
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (reset: boolean) => {
      if (!center) return;
      if (reset) {
        abortRef.current?.abort();
        runRef.current += 1;
        pageRef.current = 0;
        totalPagesRef.current = 0;
        setCompanies([]);
        setTotalResults(0);
        setTotalPages(0);
        setPagesLoaded(0);
        setApiLimited(false);
        setDropped(0);
        setProgress(0);
      } else if (busyRef.current) {
        return;
      }
      const run = runRef.current;
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      busyRef.current = true;
      setLoading(true);
      setError(null);

      const absorb = (pages: Page[]) => {
        setCompanies((prev) => {
          const seen = new Set(prev.map((c) => c.id));
          const added = pages.flatMap((p) => p.companies).filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
          return prev.concat(added);
        });
        setDropped((d) => d + pages.reduce((sum, p) => sum + p.dropped, 0));
      };

      try {
        const startPage = pageRef.current; // pages déjà chargées avant ce lot
        if (startPage === 0) {
          // La 1re page donne le total : on sait alors combien de pages il reste à aller chercher.
          const first = await fetchCompaniesPage(center, radiusKm, 1, ctrl.signal);
          if (run !== runRef.current) return;
          pageRef.current = 1;
          totalPagesRef.current = Math.min(first.totalPages, API_MAX_PAGES);
          setApiLimited(first.totalPages > API_MAX_PAGES);
          setTotalResults(first.totalResults);
          setTotalPages(totalPagesRef.current);
          setPagesLoaded(1);
          absorb([first]);
        }
        const target = Math.min(totalPagesRef.current, startPage + PAGES_PER_LOAD);
        const span = Math.max(1, target - startPage);
        setProgress((pageRef.current - startPage) / span);

        for (const nums of planBatches(pageRef.current, target, CONCURRENCY)) {
          const pages = await Promise.all(nums.map((n) => fetchCompaniesPage(center, radiusKm, n, ctrl.signal)));
          if (run !== runRef.current) return;
          pageRef.current = nums[nums.length - 1];
          setPagesLoaded(pageRef.current);
          setProgress((pageRef.current - startPage) / span);
          absorb(pages); // les points apparaissent au fil de l'eau
          if (pageRef.current < target) await sleep(BATCH_GAP_MS);
        }
      } catch (e) {
        if (run === runRef.current && !ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        if (run === runRef.current) {
          busyRef.current = false;
          setLoading(false);
        }
      }
    },
    [center, radiusKm],
  );

  useEffect(() => {
    if (center) void load(true);
    return () => abortRef.current?.abort();
  }, [center, radiusKm, load]);

  const loadedResults = Math.min(pagesLoaded * PER_PAGE, totalResults);
  /** Combien d'entreprises on peut encore charger (en tenant compte du plafond de l'API). */
  const remaining = Math.max(0, Math.min(totalPages * PER_PAGE, totalResults) - loadedResults);

  return {
    companies,
    loading,
    error,
    hasMore: pagesLoaded < totalPages,
    totalResults,
    loadedResults,
    remaining,
    apiLimited,
    dropped,
    progress,
    loadMore: () => load(false),
  };
}
