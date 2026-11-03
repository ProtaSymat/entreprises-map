export type CategoryKey =
  | "commerce" | "resto" | "btp" | "industrie" | "transport" | "it"
  | "finance" | "immo" | "pro" | "sante" | "edu" | "loisirs" | "agri";

export interface Company {
  id: string;
  siren: string;
  name: string;
  tradeName: string;
  naf: string;
  section: string;
  category: CategoryKey;
  address: string;
  city: string;
  isSoleTrader: boolean;
  lat: number;
  lng: number;
  directors: string[];
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  website?: string;
  openingHours?: string;
}
