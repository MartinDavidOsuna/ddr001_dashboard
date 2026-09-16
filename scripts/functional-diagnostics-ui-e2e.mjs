// Mock-only browser certification. All API traffic is intercepted; no SQL or production access.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright-core";
const fixture = JSON.parse(
  readFileSync(
    new URL("../tests/fixtures/functional-diagnostics.json", import.meta.url),
    "utf8",
  ),
);
const origin = "http://127.0.0.1:4175",
  base = "/ddr001",
  artifacts = ".artifacts/functional-diagnostics-ui";
mkdirSync(artifacts, { recursive: true });
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "4175",
    "--strictPort",
    "--base",
    base + "/",
  ],
  {
    windowsHide: true,
    env: { ...process.env, VITE_API_BASE_URL: "/api/v1" },
    stdio: "pipe",
  },
);
let serverLogs = "";
server.stdout.on("data", (b) => (serverLogs += b));
server.stderr.on("data", (b) => (serverLogs += b));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const pageResult = (items, nextCursor = null) => ({
  items,
  page: { limit: 25, nextCursor, sort: "createdAtDesc" },
});
const root = "/api/v1/admin/dashboard/functional-diagnostics";
const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
let browser;
const results = [];
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (server.exitCode !== null) throw new Error(serverLogs);
    try {
      if ((await fetch(origin + base + "/")).ok) {
        ready = true;
        break;
      }
    } catch {
      // Vite may still be starting; retry until the bounded deadline.
    }
    await delay(250);
  }
  assert(ready, "Isolated Vite did not start");
  browser = await chromium.launch({
    channel: process.env.E2E_BROWSER_CHANNEL || "msedge",
    headless: true,
  });
  for (const role of ["viewer", "supervisor", "admin"])
    for (const width of [1440, 768, 390]) {
      const context = await browser.newContext({
          viewport: { width, height: 1000 },
        }),
        page = await context.newPage(),
        requests = [],
        errors = [],
        unexpected = [];
      let access = { ...fixture.access },
        review = { ...fixture.review },
        conflict = true;
      page.on("pageerror", (e) => errors.push(e.message));
      await context.route("**/*", async (route) => {
        const req = route.request(),
          url = new URL(req.url()),
          path = url.pathname;
        if (url.origin !== origin) return route.abort();
        if (!path.startsWith("/api/")) return route.continue();
        requests.push({
          path,
          method: req.method(),
          query: Object.fromEntries(url.searchParams),
          body: req.postData(),
        });
        const json = (data, status = 200) =>
          route.fulfill({ status, json: data });
        if (
          path === "/api/v1/admin/auth/login" ||
          path === "/api/v1/admin/auth/refresh"
        )
          return json({
            accessToken: "isolated-test-token",
            refreshToken: "isolated-test-refresh",
          });
        if (path === "/api/v1/admin/auth/me")
          return json({
            kind: "admin",
            userId: "test-admin",
            role,
            tokenId: "test",
          });
        if (path === "/api/v1/admin/auth/logout") return json({});
        assert(
          req.headers().authorization === "Bearer isolated-test-token",
          "Missing bearer",
        );
        if (path === root + "/summary")
          return json({
            data: {
              ...fixture.summary,
              filters: { simulation: url.searchParams.get("simulation") },
            },
          });
        if (path === root + "/cases") {
          const sim = url.searchParams.get("simulation") === "only",
            query = url.searchParams.get("query");
          if (query === "missing") return json({ data: pageResult([]) });
          if (query === "offline")
            return json(
              {
                title: "Not found",
                detail:
                  "Route GET /api/v1/admin/dashboard/functional-diagnostics/cases was not found.",
              },
              404,
            );
          return json({
            data: pageResult(
              [
                {
                  ...fixture.caseItem,
                  meterId: sim
                    ? "SIMULATED-METER"
                    : url.searchParams.has("cursor")
                      ? "SECOND-METER"
                      : fixture.caseItem.meterId,
                  measurementSources: sim ? ["SIMULATION"] : ["BLE"],
                },
              ],
              url.searchParams.has("cursor") ? null : "cursor-page-2",
            ),
          });
        }
        if (path === root + "/metrics") return json({ data: fixture.metrics });
        if (path === root + "/trends")
          return json({
            data: { ...fixture.trends, metric: url.searchParams.get("metric") },
          });
        if (path === root + "/users")
          return json({ data: pageResult([fixture.user]) });
        if (path.endsWith("/access-history"))
          return json({
            data: pageResult([
              {
                auditEventId: "event",
                actor: "Admin fixture",
                action: "functional_access_enabled",
                occurredAt: "2026-09-02T12:00:00Z",
                before: null,
                after: { accessEnabled: true },
              },
            ]),
          });
        if (path.endsWith("/access")) {
          if (req.method() === "GET") return json({ data: access });
          assert(role === "admin", "Non-admin access mutation");
          if (conflict) {
            conflict = false;
            access = { ...access, rowVersion: "0x0000000000000002" };
            return json(
              {
                code: "ACCESS_VERSION_CONFLICT",
                detail: "Concurrent access change",
              },
              409,
            );
          }
          const body = req.postDataJSON();
          assert(
            body.expectedRowVersion === access.rowVersion,
            "Stale version sent",
          );
          access = {
            ...access,
            accessEnabled: body.accessEnabled,
            rowVersion: "0x0000000000000003",
          };
          return json({ data: access });
        }
        if (path.endsWith("/reviews")) {
          if (req.method() === "POST") {
            assert(role !== "viewer", "Viewer review mutation");
            review = { ...review, ...req.postDataJSON() };
            return json({ data: review }, 201);
          }
          return json({ data: pageResult([review]) });
        }
        if (path === root + "/reports")
          return json({ data: pageResult([fixture.report]) });
        if (path.endsWith("/report")) return json({ data: fixture.report });
        if (path.includes("/evidence/")) {
          if (path.endsWith("/content"))
            assert(role !== "viewer", "Viewer fetched original");
          return route.fulfill({ contentType: "image/png", body: pixel });
        }
        if (path === root + "/cases/" + fixture.caseItem.caseId)
          return json({ data: fixture.detail });
        unexpected.push(path);
        return json({ detail: "Unhandled mock" }, 500);
      });
      await page.goto(origin + base + "/login?redirect=/diagnosticos");
      await page.locator("#email").fill("isolated@example.invalid");
      await page.locator("#password").fill("test-only");
      await page.getByRole("button", { name: "Ingresar", exact: true }).click();
      await page.waitForURL("**/ddr001/diagnosticos");
      await page
        .getByRole("heading", { name: "Diagnósticos registrados" })
        .waitFor();
      await page
        .getByRole("link", { name: fixture.caseItem.meterId, exact: true })
        .waitFor();
      assert(
        requests
          .filter(
            (r) => r.path === root + "/cases" || r.path === root + "/summary",
          )
          .every((r) => r.query.simulation === "exclude"),
        "Simulation not excluded by default",
      );
      await page
        .getByRole("button", { name: "Siguiente", exact: true })
        .click();
      await page.getByRole("link", { name: "SECOND-METER" }).waitFor();
      assert(requests.at(-1).query.cursor === "cursor-page-2", "Cursor lost");
      await page.getByLabel("Datos", { exact: true }).selectOption("only");
      await page.getByRole("link", { name: "SIMULATED-METER" }).waitFor();
      assert(
        requests.filter((r) => r.path === root + "/cases").at(-1).query
          .cursor === undefined,
        "Filter did not reset cursor",
      );
      await page.getByLabel("Datos", { exact: true }).selectOption("exclude");
      await page
        .getByRole("link", { name: fixture.caseItem.meterId, exact: true })
        .waitFor();
      await page.getByRole("button", { name: "Métricas", exact: true }).click();
      await page
        .getByRole("heading", { name: "Fuentes de medición", exact: true })
        .waitFor();
      await page.getByRole("button", { name: "Técnicos", exact: true }).click();
      await page
        .getByRole("button", { name: "Ver acceso", exact: true })
        .click();
      await page.getByText("policyVersion", { exact: false }).count();
      if (role === "admin") {
        await page.getByLabel("Motivo del cambio").waitFor();
        const form = page
          .getByLabel("Motivo del cambio")
          .locator("..")
          .locator("..");
        await form.getByRole("combobox").selectOption("false");
        await page.getByLabel("Motivo del cambio").fill("E2E change");
        await page.getByRole("button", { name: "Guardar acceso" }).click();
        await page
          .getByText("El acceso cambió en otra sesión.", { exact: false })
          .waitFor();
        assert(
          (await page.getByLabel("Motivo del cambio").inputValue()) === "",
          "Stale reason retained",
        );
        await form.getByRole("combobox").selectOption("false");
        await page
          .getByLabel("Motivo del cambio")
          .fill("Confirmed current state");
        await page.getByRole("button", { name: "Guardar acceso" }).click();
        await page.getByText("Acceso actualizado.", { exact: true }).waitFor();
      } else
        assert(
          (await page
            .getByRole("button", { name: "Guardar acceso" })
            .count()) === 0,
          "Access edit leaked",
        );
      await page.getByRole("button", { name: "Reportes", exact: true }).click();
      await page
        .getByRole("heading", { name: "Reportes registrados" })
        .waitFor();
      await page
        .getByRole("button", { name: "Diagnósticos", exact: true })
        .click();
      await page
        .getByRole("link", { name: fixture.caseItem.meterId, exact: true })
        .click();
      await page.waitForURL("**/ddr001/diagnosticos/*");
      await page
        .getByRole("heading", {
          name: "Medidor " + fixture.caseItem.meterId,
          exact: true,
        })
        .waitFor();
      for (const q of ["Q1", "Q2", "Q3", "Q4"])
        await page.getByRole("heading", { name: q, exact: true }).waitFor();
      await page.getByRole("heading", { name: "Bluetooth / ESP32" }).waitFor();
      await page.getByText("ESP32 Contract", { exact: true }).first().waitFor();
      assert(
        (await page.getByText("SIMULACIÓN", { exact: false }).count()) > 0,
        "Simulation badge missing",
      );
      await page
        .getByRole("heading", { name: "Puntos de medición", exact: true })
        .first()
        .scrollIntoViewIfNeeded();
      for (const name of [
        "Inicio",
        "Intermedio",
        "Final",
        "Diagnóstico manual",
      ])
        assert(
          (await page.getByText(name, { exact: true }).count()) > 0,
          "Missing measurement point " + name,
        );
      await page.locator(".diag-evidence").first().scrollIntoViewIfNeeded();
      await page.locator(".diag-evidence img").first().waitFor();
      assert(
        requests.filter((r) => r.path.endsWith("/content")).length === 0,
        "Original eagerly fetched",
      );
      if (role !== "viewer") {
        await page
          .getByRole("button", { name: "Ver original", exact: true })
          .first()
          .click();
        await page.locator("dialog[open] img").waitFor();
        await page.keyboard.press("Escape");
        assert(
          (await page.locator("dialog[open]").count()) === 0,
          "Escape did not close lightbox",
        );
        await page
          .getByLabel("Comentario", { exact: true })
          .fill("Isolated browser review");
        await page.getByRole("button", { name: "Registrar revisión" }).click();
        await page.getByText("Revisión registrada.", { exact: true }).waitFor();
      } else {
        assert(
          (await page.getByRole("button", { name: "Ver original" }).count()) ===
            0,
          "Viewer original action",
        );
        assert(
          (await page
            .getByRole("button", { name: "Registrar revisión" })
            .count()) === 0,
          "Viewer review action",
        );
      }
      assert(
        !(await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )),
        "Global overflow",
      );
      await page.screenshot({
        path: `${artifacts}/${role}-${width}-detail.png`,
        fullPage: true,
      });
      assert(!errors.length, "Page errors: " + errors.join(";"));
      assert(!unexpected.length, "Unexpected API: " + unexpected.join(";"));
      results.push({
        role,
        width,
        status: "PASS",
        base: "/ddr001/",
        mode: "mock-only",
      });
      console.log(JSON.stringify(results.at(-1)));
      await context.close();
    }
  writeFileSync(artifacts + "/results.json", JSON.stringify(results, null, 2));
} finally {
  await browser?.close();
  server.kill();
  writeFileSync(artifacts + "/server.log", serverLogs);
}
