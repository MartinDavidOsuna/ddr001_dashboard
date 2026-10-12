import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCabinetResource } from "./cabinets.resource";
import { useCabinetBlob } from "./cabinets.blob";
import { cabinetsApi } from "./cabinets.api";
vi.mock("./cabinets.api", () => ({ cabinetsApi: { photo: vi.fn() } }));
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { resolve, promise };
};
afterEach(() => vi.unstubAllGlobals());
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => `blob:${Math.random()}`),
    revokeObjectURL: vi.fn(),
  });
});
describe("Out-of-order resources and blob lifetime", () => {
  it("clears old list data, aborts requests and ignores stale results after filters and unmount", async () => {
    let resource!: ReturnType<typeof useCabinetResource<string>>;
    const w = mount({
      setup() {
        resource = useCabinetResource<string>();
        return {};
      },
      template: "<div />",
    });
    const a = deferred<string>(),
      b = deferred<string>();
    let oldSignal!: AbortSignal;
    const first = resource.load((signal) => {
      oldSignal = signal;
      return a.promise;
    });
    const second = resource.load(() => b.promise);
    expect(oldSignal.aborted).toBe(true);
    expect(resource.data.value).toBeNull();
    b.resolve("new");
    await second;
    a.resolve("old");
    await first;
    expect(resource.data.value).toBe("new");
    const c = deferred<string>();
    const pending = resource.load(() => c.promise);
    w.unmount();
    c.resolve("gone");
    await pending;
    expect(resource.data.value).toBeNull();
  });
  it("ignores older errors and cleans the current error on retries", async () => {
    let resource!: ReturnType<typeof useCabinetResource<string>>;
    const w = mount({
      setup() {
        resource = useCabinetResource<string>();
        return {};
      },
      template: "<div />",
    });
    await resource.load(() =>
      Promise.reject({ isAxiosError: true, response: { status: 503 } }),
    );
    expect(resource.error.value).toContain("no está disponible o actualizado");
    await resource.load(() => Promise.resolve("ready"));
    expect(resource.error.value).toBe("");
    w.unmount();
  });
  it("revokes stale originals, replaced images, closed dialogs and unmounted requests", async () => {
    let image!: ReturnType<typeof useCabinetBlob>;
    const w = mount({
      setup() {
        image = useCabinetBlob();
        return {};
      },
      template: "<div />",
    });
    const a = deferred<Blob>(),
      b = deferred<Blob>();
    vi.mocked(cabinetsApi.photo)
      .mockReturnValueOnce(a.promise)
      .mockReturnValueOnce(b.promise);
    const first = image.load("/a");
    const second = image.load("/b");
    b.resolve(new Blob());
    await second;
    const current = image.src.value;
    a.resolve(new Blob());
    await first;
    expect(image.src.value).toBe(current);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    image.clear();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(current);
    expect(image.src.value).toBe("");
    const c = deferred<Blob>();
    vi.mocked(cabinetsApi.photo).mockReturnValueOnce(c.promise);
    const pending = image.load("/c");
    w.unmount();
    c.resolve(new Blob());
    await pending;
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
    await flushPromises();
  });
});
