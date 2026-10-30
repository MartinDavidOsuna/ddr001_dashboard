import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({
  role: "admin",
  get: vi.fn(),
  post: vi.fn(),
}));
vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({ user: { role: state.role } }),
}));
vi.mock("@/api/client", () => ({
  api: {
    get: state.get,
    post: state.post,
    getUri: ({ url }: { url: string }) => url,
  },
  problemMessage: (_e: unknown, f: string) => f,
}));
import Video from "./HydrostaticVideo.vue";
const link = {
  id: "one",
  sha256: "abc",
  bytes: "1000",
  actorId: "admin",
  associatedAt: "2026-10-30T20:00:00Z",
  previousId: null,
  reason: "initial",
};
beforeEach(() => {
  vi.clearAllMocks();
  state.role = "admin";
  state.get.mockImplementation((p: string) =>
    Promise.resolve({
      data: p.endsWith("/history")
        ? { items: [] }
        : {
            declaration: "DECLARED_SENT",
            declaredAt: null,
            link: null,
            maxBytes: 104857600,
          },
    }),
  );
  state.post.mockResolvedValue({ data: { expiresIn: 600 } });
});
it("declared sent never implies linked or a player", async () => {
  const w = mount(Video, { props: { testId: "test" } });
  await flushPromises();
  expect(w.text()).toContain("Declarado enviado");
  expect(w.text()).toContain("Video no recibido");
  expect(w.find("video").exists()).toBe(false);
  expect(w.find("input[type=file]").exists()).toBe(true);
  w.unmount();
});
it("supervisor has no upload controls but may authorize streaming", async () => {
  state.role = "supervisor";
  state.get.mockImplementation((p: string) =>
    Promise.resolve({
      data: p.endsWith("/history")
        ? { items: [] }
        : { declaration: "PENDING", link },
    }),
  );
  const w = mount(Video, { props: { testId: "test" } });
  await flushPromises();
  expect(w.find("input[type=file]").exists()).toBe(false);
  expect(w.find("video").exists()).toBe(false);
  await w.find("button").trigger("click");
  await flushPromises();
  expect(state.post).toHaveBeenCalledWith(
    expect.stringContaining("playback-session"),
    {},
    { withCredentials: true },
  );
  expect(w.find("video").attributes("preload")).toBe("metadata");
  expect(w.find("video").attributes("src")).not.toContain("blob:");
  w.unmount();
});
it("replacement requires reason and confirmation and retains history", async () => {
  state.get.mockImplementation((p: string) =>
    Promise.resolve({
      data: p.endsWith("/history")
        ? {
            items: [
              {
                id: "9007199254740993",
                action: "REPLACE",
                reason: "motivo",
                actorId: "admin",
                occurredAt: null,
              },
            ],
          }
        : { declaration: "DECLARED_SENT", link },
    }),
  );
  const w = mount(Video, { props: { testId: "test" } });
  await flushPromises();
  expect(w.find("textarea").attributes("required")).toBeDefined();
  expect(w.find("input[type=checkbox]").attributes("required")).toBeDefined();
  expect(w.text()).toContain("motivo");
  expect(w.text()).toContain("se conservarán");
  w.unmount();
});
it("authorization failure does not expose a player", async () => {
  state.get.mockRejectedValue(Error("403"));
  const w = mount(Video, { props: { testId: "test" } });
  await flushPromises();
  expect(w.find("[role=alert]").exists()).toBe(true);
  expect(w.find("video").exists()).toBe(false);
  w.unmount();
});
