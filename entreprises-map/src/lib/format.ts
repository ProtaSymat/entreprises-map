const nf = new Intl.NumberFormat("fr-FR");

/** Nombre avec séparateur de milliers français (1 250 → « 1 250 »). */
export const fmt = (n: number) => nf.format(n);
