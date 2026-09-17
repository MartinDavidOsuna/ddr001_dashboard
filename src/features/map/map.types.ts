export const domains = ["hydrants", "construction", "diagnostics"] as const;
export type Domain = (typeof domains)[number];
export type MapView = Domain | "reviews" | "all";
export type Bounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};
export interface MapItem {
  key: string;
  id: string;
  domain: Domain;
  title: string;
  status: string;
  statusCode: string;
  latestInspectionStatus?: string;
  members?: MapItem[];
  latitude: number;
  longitude: number;
  href: string;
  simulation: boolean;
  details: Array<[string, string]>;
  latestInspectionHref?: string;
}
export interface MapPage {
  items: MapItem[];
  limit: number;
  truncated: boolean;
}
export interface LayerState extends MapPage {
  loading: boolean;
  error: string;
}
export type Filters = Record<string, string>;
export const domainInfo = {
  hydrants: {
    name: "Hidrantes",
    singular: "Hidrante",
    symbol: "●",
    icon: "droplet",
  },
  construction: {
    name: "Levantamientos",
    singular: "Levantamiento",
    symbol: "◆",
    icon: "hardhat",
  },
  diagnostics: {
    name: "Diagnósticos",
    singular: "Diagnóstico",
    symbol: "▲",
    icon: "activity",
  },
} as const;
