import { useEffect, useState } from "react";

/** Renvoie `value` avec un délai : évite de relancer un gros chargement à chaque cran d'un curseur. */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
