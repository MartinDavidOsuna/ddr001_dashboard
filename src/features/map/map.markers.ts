import L from "leaflet";
import { statusStyle } from "./map.colors";
import { domainInfo, type MapItem } from "./map.types";
// Static SVG only. Titles and domain data are passed as text, never interpolated into HTML.
const paths = {
  hydrants: "M12 3c-3 5-7 8-7 12a7 7 0 0 0 14 0c0-4-4-7-7-12Z",
  construction: "M3 18h18M5 18v-5a7 7 0 0 1 14 0v5M9 5v7M15 5v7",
  diagnostics: "M2 12h5l3-8 4 16 3-8h5",
};
export function markerIcon(item: MapItem, selected = false) {
  return L.divIcon({
    className: `global-pin ${item.domain}${selected ? " selected" : ""}`,
    iconSize: [15.1111, 15.1111],
    iconAnchor: [7.55555, 7.55555],
    html: `<span style="--pin-color:${statusStyle(item).color}"><svg viewBox="0 0 24 24" width="9.3333" height="9.3333" aria-hidden="true"><path d="${paths[item.domain]}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>${item.members ? `<b class="map-pin-count">${item.members.length}</b>` : ""}</span>`,
  });
}
export function markerTitle(item: MapItem) {
  return `${domainInfo[item.domain].singular}: ${item.title} · ${item.status}${item.members ? ` · ${item.members.length} hidrantes agrupados` : ""}${item.simulation ? " · SIMULACIÓN" : ""}`;
}
