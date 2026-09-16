import { defineComponent, h } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { expect, it, vi } from "vitest";
import { useCursor } from "./diagnostics.cursor";
import type { Page } from "./diagnostics.types";
it("ignores stale responses and resets cursor history when filters change", async () => {
  let firstResolve: (page: Page<string>) => void = () => {};
  const fetcher = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          firstResolve = r;
        }),
    )
    .mockResolvedValueOnce({
      items: ["new"],
      page: { nextCursor: "opaque", limit: 1, sort: "s" },
    })
    .mockResolvedValue({
      items: ["next"],
      page: { nextCursor: null, limit: 1, sort: "s" },
    });
  let cursor: ReturnType<typeof useCursor<string>>;
  const w = mount(
    defineComponent({
      setup() {
        cursor = useCursor<string>(fetcher);
        return () => h("div");
      },
    }),
  );
  void cursor!.load();
  await cursor!.reset();
  firstResolve({
    items: ["old"],
    page: { nextCursor: null, limit: 1, sort: "s" },
  });
  await flushPromises();
  expect(cursor!.data.value?.items).toEqual(["new"]);
  await cursor!.next();
  expect(fetcher).toHaveBeenLastCalledWith("opaque", expect.any(AbortSignal));
  await cursor!.reset();
  expect(cursor!.history.value).toEqual([undefined]);
  w.unmount();
});
