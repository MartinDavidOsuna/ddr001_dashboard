// Isolated UI certification: all API and tile requests are intercepted; no real records are changed.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright-core";
const origin = "http://127.0.0.1:4176",
  artifacts = ".artifacts/global-map-ui";
mkdirSync(artifacts, { recursive: true });
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "4176",
    "--strictPort",
  ],
  {
    windowsHide: true,
    stdio: "pipe",
    env: { ...process.env, VITE_API_BASE_URL: "/api/v1" },
  },
);
let logs = "";
server.stdout.on("data", (b) => (logs += b));
server.stderr.on("data", (b) => (logs += b));
const assert = (v, m) => {
  if (!v) throw Error(m);
};
const root = "/api/v1/admin/dashboard";
const hydrants = Array.from({ length: 60 }, (_, i) => ({
  hydrantId: `h${i}`,
  accountNumber: `RV-${100 + i}`,
  latitude: 22 + (i === 3 ? 0.00008 : i > 2 ? (i % 8) * 0.002 : 0),
  longitude: -102 + (i > 2 ? Math.floor(i / 8) * 0.002 : 0),
  rvStatus: i % 2 ? "pending" : "completed",
  reviewed: i % 2 === 0,
  inspectionCount: i % 2 ? 0 : 2,
  latestInspectionId: i % 2 ? null : "inspection1",
  latestInspectionStatus: "validated",
  technicianName: "Técnico TEST",
  crewName: "Empresa TEST",
  lastInspectionAt: "2026-09-01T12:00:00Z",
  installationYear: 2020,
  flowLps: 5,
}));
const construction = [
  {
    surveyId: "c1",
    displayIdentifier: "BASE-200",
    accountNumber: "200",
    status: "in_progress",
    currentStep: 3,
    latitude: 22,
    longitude: -102,
    accuracy: 2,
    crewName: "Empresa TEST",
    contractorName: "Contratista TEST",
    createdAt: "2026-09-01T12:00:00Z",
    updatedAt: "2026-09-02T12:00:00Z",
  },
];
const diagnostics = [
  {
    caseId: "d1",
    meterId: "METER-BLE",
    latitude: 22,
    longitude: -102,
    gpsAccuracyM: 3,
    gpsCapturedAt: "2026-09-01T12:00:00Z",
    sampleId: "s1",
    flowPointCode: "Q2",
    measurementSource: "BLE",
    measurementSources: ["BLE"],
    hasBle: true,
    sampleCount: 2,
    flowPointCount: 1,
    overallVerdict: "APROBADO",
    status: "CLOSED",
    technicianName: "Técnico TEST",
    testBenchId: "BANK-1",
    reviewStatus: "PENDING",
    integrityStatus: "OK",
    createdAt: "2026-09-01T12:00:00Z",
    isSimulation: false,
    hasSimulation: false,
  },
  {
    caseId: "d2",
    meterId: "METER-SIM",
    latitude: 22.006,
    longitude: -102.006,
    gpsAccuracyM: 4,
    gpsCapturedAt: "2026-09-02T12:00:00Z",
    sampleId: "s2",
    flowPointCode: "Q1",
    measurementSource: "SIMULATION",
    measurementSources: ["SIMULATION"],
    hasBle: false,
    sampleCount: 1,
    flowPointCount: 1,
    overallVerdict: "RECHAZADO",
    status: "CLOSED",
    technicianName: "Técnico TEST",
    testBenchId: "BANK-2",
    reviewStatus: "FLAGGED",
    integrityStatus: "OK",
    createdAt: "2026-09-02T12:00:00Z",
    isSimulation: true,
    hasSimulation: true,
  },
];
const tile =
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e9efe8"/><path d="M0 55h256M0 150h256M70 0v256M190 0v256" stroke="#fff" stroke-width="7"/><path d="M0 240L256 30" stroke="#c2dce6" stroke-width="11"/></svg>';
let browser, lastPage, lastRequests, lastErrors;
const results = [];
try {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {
      /* Wait for isolated Vite. */
    }
    if (i === 79) throw Error(logs);
    await delay(200);
  }
  browser = await chromium.launch({
    channel: process.platform === "win32" ? "msedge" : undefined,
    headless: true,
  });
  for (const [role, width] of [
    ["admin", 1440],
    ["admin", 768],
    ["admin", 390],
    ["viewer", 1440],
    ["supervisor", 1440],
  ]) {
    const context = await browser.newContext({
        viewport: { width, height: 1000 },
      }),
      page = await context.newPage(),
      requests = [],
      errors = [];
    lastPage = page;
    lastRequests = requests;
    lastErrors = errors;
    let mode = "normal";
    page.on("pageerror", (e) => errors.push(e.message));
    await context.route("**/*", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        p = url.pathname,
        q = url.searchParams;
      if (url.hostname.endsWith("tile.openstreetmap.org"))
        return route.fulfill({ contentType: "image/svg+xml", body: tile });
      if (url.origin !== origin) return route.abort();
      if (!p.startsWith("/api/")) return route.continue();
      const json = (data, status = 200) =>
        route.fulfill({ status, json: data });
      if (p.endsWith("/auth/login") || p.endsWith("/auth/refresh"))
        return json({
          accessToken: "map-test-token",
          refreshToken: "map-refresh",
        });
      if (p.endsWith("/auth/me"))
        return json({ kind: "admin", role, userId: "test", tokenId: "test" });
      assert(
        req.headers().authorization === "Bearer map-test-token",
        "Missing bearer",
      );
      requests.push({ path: p, query: Object.fromEntries(q) });
      const layer =
        p === root + "/map/hydrants"
          ? "hydrants"
          : p === root + "/construction/map"
            ? "construction"
            : p === root + "/functional-diagnostics/map"
              ? "diagnostics"
              : null;
      if (layer) {
        if (mode === "error" || (mode === "partial" && layer === "diagnostics"))
          return json({ title: "Unavailable" }, 503);
        if (layer === "construction" && role === "viewer")
          return json({ title: "Forbidden" }, 403);
        let rows =
          layer === "hydrants"
            ? hydrants
            : layer === "construction"
              ? construction
              : diagnostics;
        if (mode === "stress" && layer === "hydrants")
          rows = Array.from({ length: 1800 }, (_, i) => ({
            ...hydrants[0],
            hydrantId: `stress-${i}`,
            accountNumber: `STRESS-${i}`,
            latitude: 22 + (i % 60) * 0.001,
            longitude: -102 + Math.floor(i / 60) * 0.001,
          }));
        if (layer === "diagnostics")
          rows = rows.filter(
            (r) =>
              q.get("simulation") === "include" ||
              (q.get("simulation") === "only"
                ? r.isSimulation
                : !r.isSimulation),
          );
        if (layer === "hydrants" && q.get("hasInspections") === "true")
          rows = rows.filter((r) => r.inspectionCount > 0);
        if (q.has("measurementSource"))
          rows = rows.filter((r) =>
            r.measurementSources?.includes(q.get("measurementSource")),
          );
        if (q.has("stage"))
          rows = rows.filter((r) => String(r.currentStep) === q.get("stage"));
        if (q.has("rvStatus"))
          rows = rows.filter((r) => r.rvStatus === q.get("rvStatus"));
        if (q.has("status"))
          rows = rows.filter((r) => r.status === q.get("status"));
        const search = q.get("search") || q.get("query");
        if (search)
          rows = rows.filter((r) =>
            Object.values(r).some((v) =>
              String(v).toLowerCase().includes(search.toLowerCase()),
            ),
          );
        if (q.has("north"))
          rows = rows.filter(
            (r) =>
              r.latitude <= Number(q.get("north")) &&
              r.latitude >= Number(q.get("south")) &&
              r.longitude <= Number(q.get("east")) &&
              r.longitude >= Number(q.get("west")),
          );
        if (mode === "empty") rows = [];
        const data = {
          items: rows,
          limit: 2000,
          truncated: mode === "truncated",
        };
        return json(layer === "diagnostics" ? { data } : data);
      }
      if (p === root + "/hydrants/h0")
        return json({
          ...hydrants[0],
          sourceType: "catalog",
          isActive: true,
          updatedAt: "2026-09-01T00:00:00Z",
          completeEvidenceCount: 1,
          mandatoryPhotosCompleted: 7,
          mandatoryPhotosRequired: 7,
          totalPhotos: 7,
          additionalPhotos: 0,
          submittedCount: 0,
          validatedCount: 2,
          rejectedCount: 0,
          cancelledCount: 0,
        });
      if (p === root + "/hydrants/h0/inspections")
        return json({ items: [], page: 1, pageSize: 25, total: 0 });
      throw Error("Unexpected API request: " + p);
    });
    await page.goto(origin + "/mapa?view=hydrants");
    await page.getByLabel("Correo electrónico").fill("map@example.invalid");
    await page.getByLabel("Contraseña", { exact: true }).fill("test-only");
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await page.locator(".global-pin,.global-cluster").first().waitFor();
    const openResults = async () => {
      if (
        width <= 800 &&
        (await page
          .locator(".map-results-toggle")
          .getAttribute("aria-expanded")) !== "true"
      )
        await page.locator(".map-results-toggle").click();
    };
    const view = async (name) => {
      await page
        .getByRole("navigation", { name: "Vista del mapa" })
        .getByRole("button", { name, exact: true })
        .click();
      await page.waitForLoadState("networkidle");
    };
    const openFilters = async () => {
      const b = page.getByRole("button", { name: /^Filtros/ });
      if ((await b.getAttribute("aria-expanded")) !== "true") await b.click();
    };
    await view("Revisiones");
    assert(
      new URL(page.url()).searchParams.get("view") === "reviews",
      "reviews URL",
    );
    assert(
      requests.filter((r) => r.path === root + "/map/hydrants").at(-1).query
        .hasInspections === "true",
      "server-side reviewed subset",
    );
    await page.locator(".map-legend summary").click();
    assert(
      (await page.locator(".map-legend").innerText()).includes("Validada"),
      "review status legend",
    );
    assert(
      !(await page.locator(".map-legend").innerText()).includes(
        "Levantamientos",
      ),
      "legend is contextual",
    );
    await page.locator(".map-legend summary").click();
    assert(
      !(await page.locator(".map-legend").evaluate((el) => el.open)),
      "legend retracts",
    );
    await view("Hidrantes");
    assert(
      !requests.filter((r) => r.path === root + "/map/hydrants").at(-1).query
        .hasInspections,
      "universe restores unreviewed hydrants",
    );
    await openResults();
    await page.locator(".map-result").filter({ hasText: "RV-100" }).click();
    await page.locator(".global-pin.selected").waitFor();
    await page.getByRole("region", { name: "Elemento seleccionado" }).waitFor();
    const accounts = page.getByLabel("Hidrante del punto agrupado", {
      exact: true,
    });
    assert(
      (await accounts.locator("option").count()) === 3,
      "coincident hydrants share a single point",
    );
    assert(
      (await page
        .locator(".global-pin.selected .map-pin-count")
        .innerText()) === "3",
      "group count badge",
    );
    await accounts.selectOption("hydrants:h1");
    assert(
      (await page
        .getByRole("link", { name: "Ver hidrante", exact: true })
        .getAttribute("href")) === "/hidrantes/h1",
      "each grouped record remains reachable",
    );
    await accounts.selectOption("hydrants:h0");
    const beforeUncluster = requests.length;
    await page.locator(".leaflet-control-zoom-in").click();
    await page.waitForTimeout(400);
    assert(
      (await page.locator(".global-cluster").count()) === 0,
      "no clusters above initial zoom",
    );
    assert(
      (await page.locator(".map-pin-count").count()) === 0,
      "no merged hydrants above initial zoom",
    );
    assert(
      (await page.locator(".global-pin").count()) === 60,
      "every hydrant is an individual marker after zoom",
    );
    assert(
      requests.length === beforeUncluster,
      "unclustering uses cached data",
    );
    await page.locator(".leaflet-control-zoom-out").click();
    await page.waitForTimeout(400);
    assert(
      (await page.locator(".map-pin-count").count()) > 0,
      "initial zoom restores geographic grouping",
    );

    await page.getByRole("link", { name: "Ver hidrante", exact: true }).click();
    await page.waitForURL("**/hidrantes/h0");
    await page.getByRole("heading", { name: /Hidrante.*RV-100/ }).waitFor();
    await page.goBack();
    await page.locator(".global-pin,.global-cluster").first().waitFor();
    await view("Levantamientos");
    if (role === "viewer") {
      assert(
        (await page.locator("[role=alert]").innerText()).includes("Tu rol"),
        "viewer restriction",
      );
    } else {
      await openFilters();
      await page.getByLabel("Etapa", { exact: true }).selectOption("3");
      await page
        .getByRole("button", { name: "Aplicar filtros", exact: true })
        .click();
      await page.waitForLoadState("networkidle");
      await page.locator(".global-pin.construction").click();
      await page
        .getByRole("link", { name: "Ver levantamiento", exact: true })
        .waitFor();
      assert(
        (await page.locator(".map-selection").innerText()).includes("BASE-200"),
        "construction card",
      );
    }
    await view("Diagnósticos");
    assert(
      requests
        .filter((r) => r.path.endsWith("functional-diagnostics/map"))
        .every((r) => r.query.simulation === "exclude"),
      "simulation default",
    );
    await openFilters();
    await page
      .getByLabel("Fuente de medición", { exact: true })
      .selectOption("BLE");
    await page
      .getByRole("button", { name: "Aplicar filtros", exact: true })
      .click();
    await page.waitForLoadState("networkidle");
    await page.locator(".global-pin.diagnostics").click();
    await page
      .getByRole("link", { name: "Ver diagnóstico", exact: true })
      .waitFor();
    assert(
      (await page.locator(".map-selection").innerText()).includes(
        "Bluetooth / ESP32",
      ),
      "BLE card",
    );
    await page
      .getByRole("button", { name: "Cerrar detalle", exact: true })
      .click();
    await openFilters();
    await page
      .getByLabel("Fuente de medición", { exact: true })
      .selectOption("");
    await page
      .getByLabel("Datos funcionales", { exact: true })
      .selectOption("only");
    await page
      .getByRole("button", { name: "Aplicar filtros", exact: true })
      .click();
    await page.waitForLoadState("networkidle");
    await page.locator(".global-pin.diagnostics").click();
    assert(
      (await page.locator(".map-selection").innerText()).includes("SIMULACIÓN"),
      "simulation label",
    );
    await page
      .getByRole("button", { name: "Cerrar detalle", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Limpiar filtros", exact: true })
      .click();
    await page.waitForLoadState("networkidle");
    await view("Todos");
    await page.locator(".global-cluster").first().waitFor();
    await page
      .locator(".map-layers")
      .getByLabel("Diagnósticos", { exact: true })
      .uncheck();
    await page.waitForLoadState("networkidle");
    assert(
      new URL(page.url()).searchParams
        .get("layers")
        ?.includes("diagnostics") === false,
      "layer URL",
    );
    await page
      .locator(".map-layers")
      .getByLabel("Diagnósticos", { exact: true })
      .check();
    await page.waitForLoadState("networkidle");
    await page.locator(".global-cluster").first().click();
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: "Ver conjunto", exact: true })
      .click();
    await page.waitForLoadState("networkidle");
    // Selecting a result must expose its marker even when multiple domains share coordinates.
    await openResults();
    // The debounced fit may finish after networkidle; wait for the full result page.
    await page
      .getByRole("button", { name: "Mostrar 50 m\u00e1s", exact: true })
      .click();
    await page.locator(".map-result").filter({ hasText: "METER-BLE" }).click();
    await page.locator(".global-pin.selected").waitFor();
    assert(
      (await page.locator(".global-pin").count()) >= 2,
      "coincident records remain individual markers",
    );
    await page
      .getByRole("button", { name: "Cerrar detalle", exact: true })
      .click();
    await page.waitForLoadState("networkidle");
    // Closing a card can finish a pending spiderfy collapse; inspect after it settles.
    await page.waitForTimeout(400);
    const groupedHydrant = page.locator(
      '.global-pin.hydrants[title^="Hidrante: RV-100"]',
    );
    if (!(await groupedHydrant.count()))
      await page.locator(".global-cluster").first().click();
    await groupedHydrant.click();
    await page
      .getByRole("link", { name: "Ver hidrante", exact: true })
      .waitFor();
    assert(
      (await page.locator(".map-result.active").count()) === 1,
      "marker selection sync",
    );
    await page.screenshot({
      path: `${artifacts}/${role}-${width}.png`,
      fullPage: true,
    });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "horizontal overflow",
    );
    await page
      .getByRole("button", { name: "Cerrar detalle", exact: true })
      .click();
    const beforeZoom = requests.length;
    await page.locator(".leaflet-control-zoom-out").click();
    await page.locator(".leaflet-control-zoom-out").click();
    await page.locator(".leaflet-control-zoom-in").click();
    await page
      .getByRole("button", { name: "Ver conjunto", exact: true })
      .click();
    await page.waitForTimeout(700); // exceeds the viewport debounce to detect forbidden requests
    assert(
      requests.length === beforeZoom,
      "zoom/pan/recenter must reuse cached points",
    );
    mode = "partial";
    await page.getByRole("button", { name: "Actualizar", exact: true }).click();
    await page.waitForLoadState("networkidle");
    await page
      .locator(".map-error")
      .filter({ hasText: "Diagn\u00f3sticos sin actualizar" })
      .waitFor();
    assert(
      (await page.locator(".map-error").allTextContents())
        .join()
        .includes("Diagnósticos sin actualizar"),
      "partial error",
    );
    assert(
      (await page.locator(".global-cluster,.global-pin").count()) > 0,
      "successful layer survives",
    );
    mode = "empty";
    await view("Hidrantes");
    await page
      .locator(".map-notice")
      .filter({ hasText: "No hay elementos" })
      .waitFor();
    assert(
      (await page.locator(".map-notice").innerText()).includes(
        "No hay elementos",
      ),
      "empty state",
    );
    mode = "error";
    await page.getByRole("button", { name: "Actualizar", exact: true }).click();
    await page.waitForLoadState("networkidle");
    await page
      .locator(".map-notice")
      .filter({ hasText: "No se pudieron cargar" })
      .waitFor();
    assert(
      (await page.locator(".map-notice").innerText()).includes(
        "No se pudieron cargar",
      ),
      "total error",
    );
    mode = "truncated";
    await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    await page.waitForLoadState("networkidle");
    await page.locator(".map-notice").filter({ hasText: "2.000" }).waitFor();
    assert(
      (await page.locator(".map-notice").innerText()).includes("2.000"),
      "truncation warning",
    );
    mode = "normal";
    await page.getByLabel("Buscar en el mapa").fill("RV-105");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await page.waitForLoadState("networkidle");
    assert(
      new URL(page.url()).searchParams.get("search") === "RV-105",
      "search URL",
    );
    assert(
      requests.some((r) => r.query.search === "RV-105"),
      "server search",
    );
    if (role === "admin" && width === 1440) {
      mode = "stress";
      const started = Date.now();
      await page
        .getByRole("button", { name: "Limpiar filtros", exact: true })
        .click();
      await page.waitForLoadState("networkidle");
      await page
        .locator(".map-status")
        .filter({ hasText: "1800 cargados" })
        .waitFor();
      assert(
        (await page.locator(".map-status").innerText()).includes(
          "1800 cargados",
        ),
        "stress dataset",
      );
      assert(
        (await page.locator(".global-pin").count()) <= 1800,
        "all markers stay within the loaded dataset limit",
      );
      assert(Date.now() - started < 10000, "stress render budget");
    }
    assert(errors.length === 0, errors.join("\n"));
    assert(requests.length < 90, `Request storm: ${requests.length}`);
    results.push({ role, width, requests: requests.length, pass: true });
    console.log(`PASS ${role} ${width}: ${requests.length} requests`);
    await context.close();
  }
  writeFileSync(`${artifacts}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} catch (error) {
  console.error(lastErrors);
  if (lastPage && !lastPage.isClosed()) {
    await lastPage.screenshot({
      path: `${artifacts}/failure.png`,
      fullPage: true,
    });
    writeFileSync(`${artifacts}/failure.html`, await lastPage.content());
    writeFileSync(
      `${artifacts}/failure-requests.json`,
      JSON.stringify(lastRequests, null, 2),
    );
    console.error(
      (
        await lastPage
          .locator(".map-status,.map-selection,.map-error")
          .allTextContents()
      ).join("\n"),
    );
  }
  throw error;
} finally {
  await browser?.close();
  server.kill();
}
