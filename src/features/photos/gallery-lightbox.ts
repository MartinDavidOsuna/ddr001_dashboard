export const galleryZoom = {
  min: 1,
  max: 3,
  step: 0.25,
} as const;

export function increaseGalleryZoom(value: number) {
  return Math.min(galleryZoom.max, value + galleryZoom.step);
}

export function decreaseGalleryZoom(value: number) {
  return Math.max(galleryZoom.min, value - galleryZoom.step);
}
