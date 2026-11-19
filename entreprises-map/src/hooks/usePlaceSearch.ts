import { useEffect, useState } from "react";
import { searchPlaces, type Place } from "../api/places";

interface State {
  results: Place[];
  loading: boolean;
  error: boolean;
  /** Dernière requête pour laquelle on a reçu une réponse. */
  settledFor: string;
}

const DEBOUNCE_MS = 250;

export function usePlaceSearch(query: string): State {
  const [state, setState] = useState<State>({ results: [], loading: false, error: false, settledFor: "" });

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setState({ results: [], loading: false, error: false, settledFor: q });
      return;
    }
    // On garde les anciens résultats à l'écran pendant la frappe : pas de clignotement.
    setState((s) => ({ ...s, loading: true, error: false }));
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(q, ctrl.signal)
        .then((results) => setState({ results, loading: false, error: false, settledFor: q }))
        .catch(() => {
          if (!ctrl.signal.aborted) setState({ results: [], loading: false, error: true, settledFor: q });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  return state;
}
