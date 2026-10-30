/** Requires isolated HAPI6 loopback server and synthetic fixture files; never production. */
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
const origin = "http://127.0.0.1:5176",
  api = "http://127.0.0.1:3002/api/v1";
const tokens = JSON.parse(
  await readFile("/tmp/hapi6-browser-auth.json", "utf8"),
);
const fixture = JSON.parse(
  await readFile("/tmp/hapi6-video-public-fixture.json", "utf8"),
);
const photos = JSON.parse(
  await readFile("/tmp/hapi6-historical-public-fixtures.json", "utf8"),
);
const galleryTest = photos[0].testId;
const server = spawn(
  "npm",
  [
    "run",
    "dev",
    "--",
    "--host",
    "127.0.0.1",
    "--port",
    "5176",
    "--base=/ddr001/",
  ],
  { env: { ...process.env, VITE_API_BASE_URL: api }, stdio: "ignore" },
);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
const result = [];
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin + "/ddr001/")).ok) break;
    } catch {
      /* Local Vite is still starting. */
    }
    if (i === 99) throw Error("Vite unavailable");
    await delay(200);
  }
  browser = await chromium.launch({ headless: true });
  for (const [role, width] of [
    ["admin", 1440],
    ["supervisor", 768],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
    });
    await context.addInitScript(() =>
      sessionStorage.setItem(
        "ddr001.admin.refresh",
        "ephemeral-test-bootstrap",
      ),
    );
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (
        url.protocol === "http:" &&
        ![origin, new URL(api).origin].includes(url.origin)
      )
        return route.abort();
      // Only bootstrap auth is substituted; all administration/media/me use real API and SQL.
      if (url.pathname === "/api/v1/admin/auth/refresh")
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            accessToken: tokens[role],
            refreshToken: "ephemeral-test-bootstrap",
          }),
        });
      return route.continue();
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      origin +
        "/ddr001/levantamientos/nuevos-hidrantes/hidrostaticas/intentos/" +
        galleryTest,
    );
    await page.getByRole("heading", { name: "Video de WhatsApp" }).waitFor();
    await page.locator(".hydro-photo button").first().click();
    await page.locator("dialog[open]").waitFor();
    await page.waitForFunction(() => {
      const img = document.querySelector("dialog[open] img");
      return img?.complete && img.naturalWidth > 0;
    });
    await page.screenshot({ path: `/tmp/hapi6-real-gallery-${width}.png` });
    await page.keyboard.press("Escape");
    await page.goto(
      origin +
        "/ddr001/levantamientos/nuevos-hidrantes/hidrostaticas/intentos/" +
        fixture.testId,
    );
    await page
      .getByText("Estado administrativo: Vinculado por administrador.", {
        exact: false,
      })
      .waitFor();
    await page
      .getByText("Declaración del operador: Declarado enviado", {
        exact: false,
      })
      .waitFor();
    if (role === "admin") {
      await page
        .locator("input[type=file]")
        .setInputFiles("/tmp/hapi6-video-one.mp4");
      await page
        .locator("textarea")
        .fill("HAPI6 synthetic browser replacement");
      await page.locator("input[type=checkbox]").check();
      await page
        .getByRole("button", { name: "Sustituir video", exact: true })
        .click();
      await page.waitForResponse(
        (r) => r.url().endsWith("/video-link") && r.status() === 201,
      );
      await page.waitForFunction(
        () =>
          !document
            .querySelector("form button")
            ?.textContent?.includes("cargando"),
      );
    } else assert.equal(await page.locator("input[type=file]").count(), 0);
    await page
      .getByRole("button", { name: "Reproducir / autorizar descarga" })
      .click();
    await page.locator("video").waitFor();
    await page.waitForFunction(
      () => document.querySelector("video")?.readyState >= 1,
      {},
      { timeout: 20000 },
    );
    const playback = await page.locator("video").evaluate(async (v) => {
      v.muted = true;
      await v.play();
      return { duration: v.duration, width: v.videoWidth };
    });
    assert(playback.duration >= 4.9 && playback.duration <= 5.1);
    assert(playback.width > 0);
    await page.locator("video").evaluate((v) => {
      v.currentTime = 3;
    });
    await page.waitForFunction(
      () => document.querySelector("video")?.currentTime >= 3,
    );
    await page
      .getByText("Ver historial administrativo", { exact: true })
      .click();
    await page
      .getByText("HAPI6 synthetic browser replacement", { exact: false })
      .first()
      .waitFor();
    await page.screenshot({
      path: `/tmp/hapi6-real-video-${width}.png`,
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    await page
      .getByRole("link", { name: "Ver todos los intentos del gabinete" })
      .click();
    await page
      .getByRole("link", { name: "Ver intento", exact: true })
      .first()
      .waitFor();
    result.push({
      role,
      width,
      realPhoto: true,
      realVideo: true,
      rangeSeek: true,
      history: true,
      cabinetNavigation: true,
    });
    await context.close();
  }
  await writeFile("/tmp/hapi6-browser-results.json", JSON.stringify(result));
  console.log(JSON.stringify(result));
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
