import { describe, expect, it } from "vitest";
import {
  decreaseGalleryZoom,
  galleryZoom,
  increaseGalleryZoom,
} from "./gallery-lightbox";

describe("gallery lightbox zoom", () => {
  it("zooms in and back out through an intermediate value", () => {
    const enlarged = increaseGalleryZoom(galleryZoom.min);
    expect(enlarged).toBe(1.25);
    expect(decreaseGalleryZoom(enlarged)).toBe(galleryZoom.min);
  });

  it("does not exceed maximum zoom", () => {
    expect(increaseGalleryZoom(galleryZoom.max)).toBe(galleryZoom.max);
  });

  it("does not go below minimum zoom", () => {
    expect(decreaseGalleryZoom(galleryZoom.min)).toBe(galleryZoom.min);
  });
});
