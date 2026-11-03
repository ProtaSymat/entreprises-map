import { useCallback, useEffect, useRef, useState } from "react";
import type { Company, LatLng } from "../types";
import { fetchCompaniesPage } from "../api/entreprises";

const PAGES_PER_LOAD = 4; // 4 x 25 = 100 entreprises par chargement

export function useCompanies(center: LatLng | null, radiusKm: number) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(0);
  const totalRef = useRef(1);
  const runRef = useRef(0); // invalide les chargements obsolètes

  const loadMore = useCallback(async (reset: boolean) => {
    if (!center) return;
    const run = reset ? ++runRef.current : runRef.current;
    if (reset) {
      pageRef.current = 0;
      totalRef.current = 1;
      setCompanies([]);
    }
    setLoading(true);
    setError(null);
    try {
      let fetched: Company[] = [];
      for (let i = 0; i < PAGES_PER_LOAD && pageRef.current < totalRef.current; i++) {
        const page = await fetchCompaniesPage(center, radiusKm, pageRef.current + 1);
        if (run !== runRef.current) return;
        totalRef.current = page.totalPages;
        pageRef.current += 1;
        fetched = fetched.concat(page.companies);
        await new Promise((r) => setTimeout(r, 200)); // reste sous la limite de débit
      }
      setCompanies((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return prev.concat(fetched.filter((c) => !seen.has(c.id)));
      });
      setHasMore(pageRef.current < totalRef.current);
    } catch (e) {
      if (run === runRef.current) setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      if (run === runRef.current) setLoading(false);
    }
  }, [center, radiusKm]);

  useEffect(() => {
    if (center) void loadMore(true);
  }, [center, radiusKm, loadMore]);

  return { companies, loading, error, hasMore, loadMore: () => loadMore(false) };
}
