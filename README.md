# entreprises-map

Carte interactive des entreprises autour de toi : ronds colorés par secteur, filtres, fiche avec contacts. 100 % gratuit, sans clé d'API.

## Stack

- Vite + React 18 + TypeScript
- Leaflet / react-leaflet (tuiles OpenStreetMap)
- Vitest pour les tests

## Sources de données (gratuites)

| Besoin | Source |
| --- | --- |
| Entreprises (SIRENE) | API Recherche d'entreprises, `recherche-entreprises.api.gouv.fr` (`/near_point`) |
| Géocodage d'adresse | Géoplateforme IGN, `data.geopf.fr/geocodage` |
| Téléphone / site / horaires | OpenStreetMap via l'API Overpass (couverture partielle) |

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de production
npm test           # tests unitaires
```

## Structure

```
src/
  api/          appels réseau (entreprises, geocode, overpass)
  components/   MapView, Sidebar, CompanyDetails
  hooks/        useCompanies (pagination, annulation)
  lib/          catégories NAF -> secteurs + couleurs
  types.ts      types partagés
```

## Notes

- Les entrepreneurs individuels sont masqués par défaut (RGPD) : pour du démarchage, respecte les règles CNIL (B2B, lien avec l'activité, opposition simple).
- La limite de l'API est d'environ 7 requêtes/s : le hook espace les appels.
- Idées suivantes : export CSV, suivi des contacts (localStorage), clusters, tuiles libres (OpenFreeMap).
