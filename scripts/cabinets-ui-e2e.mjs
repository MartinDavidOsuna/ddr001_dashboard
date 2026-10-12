// Mock UI and real TEST reads are deliberately reported as different modes.
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright-core";
const real = process.argv.includes("--real");
const fixture = JSON.parse(
  readFileSync("tests/fixtures/cabinets.json", "utf8"),
);
const origin = "http://127.0.0.1:4177",
  root = "/api/v1/admin/dashboard/construction/cabinets";
const base = "/ddr001",
  appUrl = origin + base;
const artifacts = `.artifacts/cabinets-${real ? "real" : "mock"}-ui`;
const identity = real
  ? JSON.parse(readFileSync(".artifacts/cabinets-real/identity.json", "utf8"))
  : null;
const session = real
  ? JSON.parse(readFileSync(".artifacts/cabinets-real/session.json", "utf8"))
  : null;
const selected = real
  ? JSON.parse(readFileSync(".artifacts/cabinets-real/selected.json", "utf8"))
  : null;
if (
  real &&
  (identity.databaseName !== "DDR001_Hidrantes_TEST" ||
    !identity.engineVersion.startsWith("12.") ||
    identity.apiHead !== "fbae6771c8457d623f652427ada9ac853f381f1f" ||
    identity.apiOrigin !== "http://127.0.0.1:3016")
)
  throw Error("Certified local TEST identity required");
mkdirSync(artifacts, { recursive: true });
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "4177",
    "--strictPort",
    "--base",
    base + "/",
  ],
  {
    windowsHide: true,
    stdio: "pipe",
    env: {
      ...process.env,
      VITE_API_BASE_URL: "/api/v1",
      VITE_CONSTRUCTION_DATA_MODE: real ? "api" : "mock",
    },
  },
);
let logs = "",
  browser;
server.stdout.on("data", (b) => (logs += b));
server.stderr.on("data", (b) => (logs += b));
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const json = (route, data, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  });
const assert = (value, message) => {
  if (!value) throw Error(message);
};
const results = [];
async function noOverflow(page, name) {
  await page
    .waitForFunction(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 2,
      { timeout: 3000 },
    )
    .catch(() => {});
  const sizes = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);
  if (sizes[0] > sizes[1] + 2) {
    writeFileSync(
      `${artifacts}/overflow.json`,
      JSON.stringify(
        await page.evaluate(() =>
          [...document.querySelectorAll("body *")]
            .filter((e) => e.getBoundingClientRect().right > innerWidth + 2)
            .map((e) => ({
              tag: e.tagName,
              class: e.className,
              width: e.getBoundingClientRect().width,
              right: e.getBoundingClientRect().right,
            })),
        ),
        null,
        2,
      ),
    );
    await page.screenshot({
      path: `${artifacts}/overflow.png`,
      fullPage: true,
    });
  }
  assert(sizes[0] <= sizes[1] + 2, `${name}: horizontal overflow ${sizes}`);
}
async function menu(page) {
  const open = page.getByRole("button", { name: "Abrir menú", exact: true });
  if (await open.isVisible()) await open.click();
  await page
    .getByRole("button", { name: "Levantamientos", exact: true })
    .click();
}
try {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch { /* Wait for the isolated Vite server. */ }
    if (i === 79) throw Error(logs);
    await delay(200);
  }
  browser = await chromium.launch({
    headless: true,
    ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  });
  for (const width of [1440, 1024, 768, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 1000 },
    });
    const requests = [],
      unexpected = [],
      errors = [];
    await context.route("**/*", async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        path = url.pathname;
      if (url.hostname.endsWith("tile.openstreetmap.org"))
        return route.fulfill({ contentType: "image/png", body: png });
      if (url.origin !== origin) {
        unexpected.push(url.origin);
        return route.abort();
      }
      if (real && path === "/api/v1/admin/auth/refresh")
        return json(route, session);
      if (real && path.startsWith("/api/v1/")) {
        requests.push(`${request.method()} ${path}${url.search}`);
        if (request.method() !== "GET")
          throw Error("Only real administrative GETs permitted");
        const headers = { ...request.headers() };
        delete headers.origin;
        delete headers.host;
        return route.fulfill({
          response: await route.fetch({
            url: identity.apiOrigin + path + url.search,
            headers,
          }),
        });
      }
      if (path.startsWith("/api/v1/")) {
        requests.push(`${request.method()} ${path}${url.search}`);
        if (
          ["/api/v1/admin/auth/login", "/api/v1/admin/auth/refresh"].includes(
            path,
          )
        )
          return json(route, {
            accessToken: "mock-access",
            refreshToken: "mock-refresh",
          });
        if (path === "/api/v1/admin/auth/me")
          return json(route, {
            kind: "admin",
            userId: "mock-admin",
            role: "admin",
            tokenId: "mock-token",
          });
        if (path === root + "/summary") return json(route, fixture.summary);
        if (path === root + "/metrics") return json(route, fixture.metrics);
        if (path === root + "/map") return json(route, fixture.map);
        if (path === root)
          return json(route, {
            ...fixture.list,
            page: Number(url.searchParams.get("page") || 1),
            pageSize: Number(url.searchParams.get("pageSize") || 25),
          });
        if (path.includes("/photos/"))
          return route.fulfill({ contentType: "image/png", body: png });
        if (path === root + "/" + fixture.row.cabinetId)
          return json(route, fixture.dossier);
        unexpected.push(path);
        return json(
          route,
          { status: 500, title: "Unexpected mocked request" },
          500,
        );
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    if (real) {
      await page.goto(appUrl + "/favicon.svg");
      await page.evaluate(
        (token) => sessionStorage.setItem("ddr001.admin.refresh", token),
        session.refreshToken,
      );
      await page.goto(appUrl + "/levantamientos/nuevos-hidrantes");
    } else {
      await page.goto(
        appUrl + "/login?redirect=/levantamientos/nuevos-hidrantes",
      );
      await page
        .getByLabel("Correo electrónico")
        .fill("admin.mock@example.invalid");
      await page
        .getByLabel("Contraseña", { exact: true })
        .fill("Mock-Only!2026");
      await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    }
    await page.locator(".cabinets h1").waitFor();
    await page.locator(".cabinet-table tbody tr").first().waitFor();
    await menu(page);
    await noOverflow(page, `${width} submenu`);
    assert(
      await page.getByRole("link", { name: "Bases", exact: true }).isVisible(),
      "Bases submenu",
    );
    assert(
      await page
        .getByRole("link", { name: "Nuevos Hidrantes", exact: true })
        .isVisible(),
      "Cabinets submenu",
    );
    await page
      .getByRole("link", { name: "Nuevos Hidrantes", exact: true })
      .click();
    if (width >= 1024) {
      await page.getByRole("button", { name: "Contraer menú" }).click();
      await page
        .getByRole("button", { name: "Levantamientos", exact: true })
        .focus();
      await page.keyboard.press("ArrowDown");
      assert(
        await page
          .getByRole("link", { name: "Bases", exact: true })
          .isVisible(),
        "Collapsed submenu keyboard",
      );
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Expandir menú" }).click();
    }
    await noOverflow(page, `${width} list`);
    for (const chart of await page.locator(".cabinets .chart").all()) {
      await chart.scrollIntoViewIfNeeded();
      await chart.locator("canvas").first().waitFor();
    }
    await page.locator(".cabinets h1").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${artifacts}/${width}-list.png`,
      fullPage: true,
    });
    const uid = real ? selected.formattedUid : fixture.row.formattedUid;
    await page.screenshot({ path: `${artifacts}/${width}-overview.png` });
    const filters = page.getByRole("form", {
      name: "Filtros de Nuevos Hidrantes",
    });
    await filters.getByLabel("Búsqueda general").fill(uid);
    await filters.getByRole("button", { name: "Aplicar filtros" }).click();
    await page.waitForURL((u) => u.searchParams.get("search") === uid);
    await page.locator(".cabinet-table tbody tr").first().waitFor();
    if (!real) {
      await filters.getByLabel("Modelo").selectOption("A3");
      await filters.getByLabel("Variante").selectOption("true");
      await filters.getByLabel("Estado").selectOption("installed");
      await filters.getByLabel("Desde", { exact: true }).fill("2026-10-01");
      await filters.getByLabel("Hasta", { exact: true }).fill("2026-10-12");
      await filters.getByRole("button", { name: "Aplicar filtros" }).click();
      await page.waitForURL((u) => u.searchParams.get("automated") === "true");
      await page.locator(".cabinet-table tbody tr").first().waitFor();
      await page
        .getByRole("button", { name: "Siguiente", exact: true })
        .click();
      await page.waitForURL((u) => u.searchParams.get("page") === "2");
      await page.locator(".cabinet-table tbody tr").first().waitFor();
      assert(
        requests.some(
          (x) =>
            x.includes("to=2026-10-13T07") || x.includes("to=2026-10-13T07%3A"),
        ),
        "Exclusive date upper bound",
      );
    }
    await page.getByRole("link", { name: uid, exact: true }).first().click();
    await page.locator("#pieces").waitFor();
    await noOverflow(page, `${width} dossier`);
    for (const name of [
      "Piezas",
      "Instalación",
      "Revisión final",
      "Fotografías",
      "Historial",
    ])
      await page
        .locator(".cabinet-tabs")
        .getByRole("link", { name, exact: true })
        .click();
    if (!real) {
      assert(
        (await page.locator("#pieces").innerText()).includes("000ABC007"),
        "Leading-zero serial",
      );
      assert(
        (await page.locator("#installation").innerText()).includes(
          "Pregunta histórica TEST",
        ),
        "Frozen checklist",
      );
      assert(
        (await page.locator("#final-review").innerText()).includes(
          "Aprobación invalidada",
        ),
        "Invalidated approval",
      );
      assert(
        (await page
          .getByRole("link", { name: "Ver expediente de base" })
          .getAttribute("href")) ===
          `${base}/levantamientos/bases/${fixture.row.cabinetId}`,
        "Canonical base link",
      );
    }
    if (!real || selected.hasPhotos) {
      await page
        .locator(".cabinet-photo-button")
        .first()
        .scrollIntoViewIfNeeded();
      await page.locator(".cabinet-photo-button").first().click();
      await page.locator("dialog[open]").waitFor();
      await page.locator('dialog img, dialog [role="alert"]').first().waitFor();
      await page.screenshot({ path: `${artifacts}/${width}-lightbox.png` });
      await page.keyboard.press("Escape");
      assert(
        (await page.locator("dialog[open]").count()) === 0,
        "Escape closes photograph",
      );
    }
    await page.screenshot({
      path: `${artifacts}/${width}-dossier.png`,
      fullPage: true,
    });
    await page.locator(".back-link").click();
    await page.locator(".cabinet-table tbody tr").first().waitFor();
    assert(
      new URL(page.url()).searchParams.get("search") === uid,
      "Return preserves filters",
    );
    await page.goto(appUrl + "/mapa?view=cabinets");
    await page.locator(".leaflet-container").waitFor();
    const resultsToggle = page.locator(".map-results-toggle");
    if (await resultsToggle.isVisible()) await resultsToggle.click();
    if (!real) {
      await page.locator(".map-result").first().click();
      await page
        .getByRole("link", { name: "Ver nuevo hidrante", exact: true })
        .waitFor();
      await page
        .getByRole("link", { name: "Ver nuevo hidrante", exact: true })
        .click();
      await page.locator("#pieces").waitFor();
      await page.goBack();
      await page.locator(".leaflet-container").waitFor();
    }
    await noOverflow(page, `${width} map`);
    await page.screenshot({
      path: `${artifacts}/${width}-map.png`,
      fullPage: true,
    });
    assert(!unexpected.length, `Unexpected requests ${unexpected}`);
    assert(!errors.length, `Browser errors ${errors}`);
    results.push({
      width,
      height: width === 390 ? 844 : 1000,
      requests: requests.length,
      result: "PASS",
    });
    await context.close();
  }
  if (!real) {
    for (const role of ["supervisor", "viewer"]) {
      const context = await browser.newContext();
      const requests = [];
      await context.route("**/api/v1/**", (route) => {
        const path = new URL(route.request().url()).pathname;
        requests.push(path);
        if (path.endsWith("/auth/refresh"))
          return json(route, {
            accessToken: "mock-access",
            refreshToken: "mock-refresh",
          });
        if (path.endsWith("/auth/me"))
          return json(route, {
            kind: "admin",
            userId: "mock",
            role,
            tokenId: "mock",
          });
        if (path === root) return json(route, fixture.list);
        if (path === root + "/summary") return json(route, fixture.summary);
        if (path === root + "/metrics") return json(route, fixture.metrics);
        return json(route, { status: 500 }, 500);
      });
      const page = await context.newPage();
      await page.goto(appUrl + "/favicon.svg");
      await page.evaluate(() =>
        sessionStorage.setItem("ddr001.admin.refresh", "mock-refresh"),
      );
      await page.goto(appUrl + "/levantamientos/nuevos-hidrantes");
      if (role === "viewer") {
        await page
          .getByRole("heading", {
            name: "Nuevos Hidrantes · acceso restringido",
          })
          .waitFor();
        assert(
          !requests.some((p) => p.startsWith(root)),
          "Viewer API calls forbidden",
        );
        await menu(page);
        assert(
          await page
            .getByRole("link", { name: "Bases", exact: true })
            .isVisible(),
          "Viewer Bases visible",
        );
        assert(
          (await page
            .getByRole("link", { name: "Nuevos Hidrantes", exact: true })
            .count()) === 0,
          "Viewer cabinets hidden",
        );
      } else await page.locator(".cabinet-table tbody tr").first().waitFor();
      results.push({ role, result: "PASS" });
      await context.close();
    }
  }
  writeFileSync(
    `${artifacts}/results.json`,
    JSON.stringify(
      {
        mode: real ? "REAL_TEST_READS_AUTH_BOOTSTRAP" : "MOCK_UI_LOGIN",
        browser: "Chromium/Microsoft Edge",
        base: base + "/",
        apiHead: identity?.apiHead,
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      mode: real ? "REAL_TEST_READS_AUTH_BOOTSTRAP" : "MOCK_UI_LOGIN",
      results,
    }),
  );
} finally {
  await browser?.close();
  server.kill();
}
