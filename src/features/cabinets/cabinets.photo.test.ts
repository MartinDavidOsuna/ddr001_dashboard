import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cabinetsApi } from "./cabinets.api";
import { assertContract } from "./cabinets.contract";
import type { CabinetAdminPhoto } from "./cabinets.generated";
import CabinetPhoto from "./CabinetPhoto.vue";
import fixture from "../../../tests/fixtures/cabinets.json";
vi.mock("./cabinets.api", () => ({ cabinetsApi: { photo: vi.fn() } }));
let intersect: IntersectionObserverCallback;
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersect = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.mocked(cabinetsApi.photo).mockResolvedValue(new Blob());
});
const props = () => ({
  photo: assertContract<CabinetAdminPhoto>("CabinetAdminPhoto", fixture.photo),
  relations: [
    {
      subject: "registration",
      name: "Registro",
      href: "#registration",
      confirmed: true,
    },
  ],
});
describe("Lazy administrative photographs", () => {
  it("ignores an obsolete thumbnail after rapid photo changes", async () => {
    let oldResolve!: (blob: Blob) => void;
    vi.mocked(cabinetsApi.photo).mockReturnValueOnce(
      new Promise((resolve) => (oldResolve = resolve)),
    );
    vi.mocked(URL.createObjectURL).mockImplementation(
      (blob) => `blob:${(blob as Blob).type}`,
    );
    const w = mount(CabinetPhoto, { props: props() });
    intersect(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    vi.mocked(cabinetsApi.photo).mockResolvedValueOnce(
      new Blob(["new"], { type: "new" }),
    );
    const photo = {
      ...props().photo,
      photoId: "00000000-0000-4000-8000-000000000002",
    };
    await w.setProps({ photo });
    await flushPromises();
    oldResolve(new Blob(["old"], { type: "old" }));
    await flushPromises();
    expect(w.get(".cabinet-photo-button img").attributes("src")).toBe(
      "blob:new",
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:old");
    w.unmount();
  });
  it("localizes a missing thumbnail without hiding the original-photo action", async () => {
    vi.mocked(cabinetsApi.photo).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
    });
    const w = mount(CabinetPhoto, { props: props() });
    intersect(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    await flushPromises();
    expect(w.text()).toContain("no existe");
    expect(w.find(".cabinet-photo-button").exists()).toBe(true);
    await w.get(".cabinet-photo-button").trigger("click");
    await flushPromises();
    expect(w.find("dialog img").exists()).toBe(true);
    w.unmount();
  });
  it("localizes image decode errors and revokes the failed object URL", async () => {
    const w = mount(CabinetPhoto, { props: props() });
    intersect(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    await flushPromises();
    await w.get(".cabinet-photo-button img").trigger("error");
    expect(w.text()).toContain("No fue posible mostrar esta fotografía");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
    expect(w.find(".cabinet-photo-button img").exists()).toBe(false);
    w.unmount();
  });
  it("does not load thumbnails offscreen or originals before lightbox; supports escape and releases images", async () => {
    const w = mount(CabinetPhoto, { props: props() });
    expect(cabinetsApi.photo).not.toHaveBeenCalled();
    intersect(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    await flushPromises();
    expect(cabinetsApi.photo).toHaveBeenCalledTimes(1);
    expect(cabinetsApi.photo).toHaveBeenCalledWith(
      fixture.photo.thumbnailUrl,
      expect.any(AbortSignal),
    );
    await w.get(".cabinet-photo-button").trigger("click");
    await flushPromises();
    expect(cabinetsApi.photo).toHaveBeenLastCalledWith(
      fixture.photo.contentUrl,
      expect.any(AbortSignal),
    );
    await w.get("dialog").trigger("cancel");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
    w.unmount();
  });
  it.each([404, 409, 503])(
    "localizes original HTTP %s without clearing the thumbnail or dossier",
    async (status) => {
      const w = mount(CabinetPhoto, { props: props() });
      intersect(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
      await flushPromises();
      vi.mocked(cabinetsApi.photo).mockRejectedValueOnce({
        isAxiosError: true,
        response: { status },
      });
      await w.get(".cabinet-photo-button").trigger("click");
      await flushPromises();
      expect(w.find(".cabinet-photo-button img").exists()).toBe(true);
      expect(w.find('dialog [role="alert"]').exists()).toBe(true);
      expect(w.text()).toContain("Relación histórica confirmada");
      await w.get('dialog [role="alert"] button').trigger("click");
      await flushPromises();
      expect(w.find("dialog img").exists()).toBe(true);
      w.unmount();
    },
  );
  it("keeps integrity distinct from confirmed historical relationships", () => {
    const data = props();
    data.photo.integrity.status = "missing_original";
    data.photo.integrity.storageVerified = false;
    const w = mount(CabinetPhoto, { props: data });
    expect(w.text()).toContain("Original faltante");
    expect(w.text()).toContain("Relación histórica confirmada");
    expect(w.text()).toContain("Verificación en vivo");
    w.unmount();
  });
});
