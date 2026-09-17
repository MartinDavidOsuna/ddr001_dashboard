<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import L from "leaflet";
import { CLUSTER_RADIUS_PX, groupNearbyHydrants } from "./map.grouping";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { markerIcon, markerTitle } from "./map.markers";
import type { Bounds, MapItem } from "./map.types";
const props = defineProps<{
  items: MapItem[];
  selected?: string;
  fitKey: number;
  ready: boolean;
}>();
const emit = defineEmits<{ select: [key: string]; bounds: [bounds: Bounds]; grouping: [enabled: boolean] }>();
const el = ref<HTMLElement>();
let map: L.Map | undefined,
  cluster: L.MarkerClusterGroup | undefined,
  individual: L.LayerGroup | undefined,
  observer: ResizeObserver | undefined;
let fitted = -1,
  timer: ReturnType<typeof setTimeout> | undefined;
let rendered = "";
let initialZoom: number | undefined;
let fitting = false;
let displayedItems: MapItem[] = [];
const markers = new Map<string, L.Marker>();
const weights = new WeakMap<L.Marker, number>();
function bounds() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!map || fitted !== props.fitKey) return;
    const b = map.getBounds();
    const width = b.getEast() - b.getWest();
    const wrap = (v: number) => ((((v + 180) % 360) + 360) % 360) - 180;
    emit("bounds", {
      north: Math.min(90, b.getNorth()),
      south: Math.max(-90, b.getSouth()),
      west: width >= 360 ? -180 : wrap(b.getWest()),
      east: width >= 360 ? 180 : wrap(b.getEast()),
    });
  }, 350);
}
function draw(restoreSelection = true) {
  if (!map || !cluster || !individual) return;
  if (props.ready && props.items.length && fitted !== props.fitKey) {
    fitted = props.fitKey;
    fitting = true;
    map.fitBounds(
      L.latLngBounds(props.items.map(i => [i.latitude, i.longitude] as [number, number])),
      { padding: [45, 45], maxZoom: 16, animate: false },
    );
    initialZoom = map.getZoom();
    fitting = false;
    bounds();
  }
  const grouped = map.getZoom() <= (initialZoom ?? 6);
  emit("grouping", grouped);
  const signature = JSON.stringify([grouped, props.items]);
  if (signature !== rendered) {
    rendered = signature;
    cluster.clearLayers();
    individual.clearLayers();
    markers.clear();
    displayedItems = grouped ? groupNearbyHydrants(props.items) : props.items;
    const layers: L.Marker[] = [];
    for (const item of displayedItems) {
      const selected = item.key === props.selected || !!item.members?.some(m => m.key === props.selected);
      const marker = L.marker([item.latitude, item.longitude], {
        icon: markerIcon(item, selected),
        title: markerTitle(item), alt: markerTitle(item), keyboard: true,
        zIndexOffset: selected ? 1000 : 0,
      });
      weights.set(marker, item.members?.length || 1);
      marker.on("click", () => emit("select", item.key));
      markers.set(item.key, marker);
      for (const member of item.members || []) markers.set(member.key, marker);
      layers.push(marker);
    }
    if (grouped) cluster.addLayers(layers);
    else for (const marker of layers) individual.addLayer(marker);
  }
  if (restoreSelection && props.selected) select(props.selected);
}
function zoomChanged() {
  if (!fitting) draw(false);
}
function select(key: string | undefined) {
  for (const item of displayedItems)
    markers
      .get(item.key)
      ?.setIcon(
        markerIcon(
          item,
          item.key === key || !!item.members?.some((m) => m.key === key),
        ),
      );
  let marker = key ? markers.get(key) : undefined;
  if (marker && cluster && map) {
    const focus = () => {
      if (!map || !marker) return;
      const point = map.latLngToContainerPoint(marker.getLatLng());
      if (window.innerWidth <= 800 && point.y > map.getSize().y * 0.4)
        map.panBy([0, point.y - map.getSize().y * 0.3], { animate: false });
      marker.getElement()?.focus({ preventScroll: true });
    };
    const parent = cluster.hasLayer(marker) ? cluster.getVisibleParent(marker) : marker;
    if (
      !map.getBounds().contains(marker.getLatLng()) ||
      (parent instanceof L.MarkerCluster && map.getZoom() < 18)
    )
      map.setView(marker.getLatLng(), Math.max(map.getZoom(), 18), {
        animate: false,
      });
    // Zooming past the initial level rebuilds individual markers; use the new instance.
    marker = markers.get(key!);
    if (!marker) return;
    marker.setZIndexOffset(1000);
    const visible = cluster.hasLayer(marker) ? cluster.getVisibleParent(marker) : marker;
    if (visible instanceof L.MarkerCluster) visible.spiderfy();
    // Synchronous expansion avoids pending plugin callbacks surviving a layer rebuild/unmount.
    focus();
  }
}
onMounted(() => {
  map = L.map(el.value!, {
    maxZoom: 19,
    zoomAnimation: false,
    markerZoomAnimation: false,
  }).setView([22, -102], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  cluster = L.markerClusterGroup({
    maxClusterRadius: CLUSTER_RADIUS_PX,
    showCoverageOnHover: false,
    animate: false,
    removeOutsideVisibleBounds: true,
    spiderfyOnMaxZoom: true,
    iconCreateFunction(c) {
      const count = c
        .getAllChildMarkers()
        .reduce((sum, marker) => sum + (weights.get(marker) || 1), 0);
      return L.divIcon({
        className: "global-cluster",
        iconSize: [44, 44],
        html: `<span aria-label="Grupo de ${count} elementos">${count}</span>`,
      });
    },
  }).addTo(map);
  individual = L.layerGroup().addTo(map);
  map.on("moveend", bounds);
  map.on("zoomend", zoomChanged);
  observer = new ResizeObserver(() => map?.invalidateSize({ pan: false }));
  observer.observe(el.value!);
  draw();
});
watch(() => props.items, () => draw());
watch(() => props.ready, () => draw());
watch(
  () => props.fitKey,
  () => {
    clearTimeout(timer);
    draw();
  },
);
watch(() => props.selected, select);
onBeforeUnmount(() => {
  clearTimeout(timer);
  observer?.disconnect();
  cluster?.clearLayers();
  individual?.clearLayers();
  map?.off("moveend", bounds);
  map?.off("zoomend", zoomChanged);
  map?.remove();
  markers.clear();
  map = undefined;
});
</script>
<template>
  <div
    ref="el"
    class="global-map-canvas"
    aria-label="Mapa operativo. También puedes seleccionar elementos en Resultados."
  />
</template>
