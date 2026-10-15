export const maxZoom = 5;
export const clampZoom = (zoom: number) => Math.max(1, Math.min(maxZoom, zoom));
export function fitImage(width: number, height: number, viewportWidth: number, viewportHeight: number) {
  if (!width || !height) return { width: 0, height: 0 };
  const ratio = Math.min(1, Math.max(0, viewportWidth - 16) / width, Math.max(0, viewportHeight - 16) / height);
  return { width: width * ratio, height: height * ratio };
}
export function clampPan(x: number, y: number, zoom: number, width: number, height: number, vw: number, vh: number) {
  const limitX = Math.max(0, (width * zoom - vw) / 2);
  const limitY = Math.max(0, (height * zoom - vh) / 2);
  return { x: Math.max(-limitX, Math.min(limitX, x)), y: Math.max(-limitY, Math.min(limitY, y)) };
}
