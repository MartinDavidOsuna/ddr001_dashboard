import { access, mkdir, writeFile } from "node:fs/promises";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const appUrl = process.env.E2E_APP_URL || "http://localhost:5173";
const refreshToken = process.env.E2E_REFRESH_TOKEN;
const timeoutMs = Number(process.env.E2E_TIMEOUT_MS || 30_000);
const expectedApiOrigin = "http://cifra.aquafim.com:3002";
const artifacts = new URL("../.artifacts/edge/", import.meta.url);
const edgeCandidates = [
  process.env.EDGE_EXECUTABLE,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const redact = (value = "") =>
  String(value)
    .replace(/Bearer\s+\S+/gi, "Bearer <redacted>")
    .replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, "<token-redacted>")
    .slice(0, 2_000);
const safeLocation = (value) => {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "URL no disponible";
  }
};
const safeHttpTarget = (value) => {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return "Destino HTTP no disponible";
  }
};

if (!refreshToken) {
  throw new Error(
    "Define E2E_REFRESH_TOKEN sólo en el proceso actual; no lo guardes en el repositorio.",
  );
}

let executablePath;
for (const candidate of edgeCandidates) {
  try {
    await access(candidate);
    executablePath = candidate;
    break;
  } catch {
    // Try the next standard Edge location.
  }
}
if (!executablePath) {
  throw new Error("Microsoft Edge no fue encontrado; usa EDGE_EXECUTABLE.");
}

await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "es-MX",
  timezoneId: "America/Mexico_City",
});

// The app rotates refresh tokens. Seed only an empty session so a later full
// navigation never overwrites the fresh token stored by the application.
await context.addInitScript((token) => {
  const key = "ddr001.admin.refresh";
  if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, token);
}, refreshToken);

const page = await context.newPage();
page.setDefaultNavigationTimeout(timeoutMs);
page.setDefaultTimeout(timeoutMs);
const consoleErrors = [];
const failedResponses = [];
const requestFailures = [];
page.on("console", (message) => {
  if (message.type() === "error") {
    const location = message.location();
    consoleErrors.push({
      text: redact(message.text()),
      target: location.url ? safeHttpTarget(location.url) : "Ubicación no disponible",
      line: location.lineNumber,
      column: location.columnNumber,
    });
  }
});
page.on("pageerror", (error) =>
  consoleErrors.push({
    text: redact(error.message),
    target: "Error JavaScript sin URL",
    line: undefined,
    column: undefined,
  }),
);
page.on("requestfailed", (request) => {
  requestFailures.push({
    method: request.method(),
    target: safeHttpTarget(request.url()),
    errorText: redact(request.failure()?.errorText || "Fallo desconocido"),
  });
});
page.on("response", (response) => {
  const status = response.status();
  if (status >= 400) {
    const url = new URL(response.url());
    const request = response.request();
    failedResponses.push({
      status,
      method: request.method(),
      pathname: url.pathname,
      target: safeHttpTarget(response.url()),
      resourceType: request.resourceType(),
    });
  }
});

const formatConsoleError = (item) =>
  `${item.text} @ ${item.target}${item.line == null ? "" : `:${item.line}:${item.column ?? 0}`}`;
const formatResponse = (item) =>
  `${item.method} ${item.target} [${item.resourceType}] -> ${item.status}`;
const formatRequestFailure = (item) =>
  `${item.method} ${item.target} -> ${item.errorText}`;

async function pageDiagnostic(label) {
  const location = safeLocation(page.url());
  const pathname = (() => {
    try {
      return new URL(page.url()).pathname;
    } catch {
      return "No disponible";
    }
  })();
  const title = redact(await page.title().catch(() => ""));
  const visibleText = redact(
    await page.locator("main, body").first().innerText().catch(() => ""),
  );
  const lines = [
    `Paso: ${label}`,
    `URL: ${location}`,
    `Pathname: ${pathname}`,
    `Título: ${title || "Sin título"}`,
    `Responses >= 400: ${failedResponses.map(formatResponse).join(" | ") || "ninguna"}`,
    `Request failed: ${requestFailures.map(formatRequestFailure).join(" | ") || "ninguno"}`,
    `Errores de consola: ${consoleErrors.map(formatConsoleError).join(" | ") || "ninguno"}`,
    `Texto visible (máx. 2000):\n${visibleText || "Sin texto visible"}`,
  ];
  return lines.join("\n");
}

async function assertPath(pathname, lostSessionMessage) {
  const current = new URL(page.url()).pathname;
  if (current === "/login") throw new Error(lostSessionMessage);
  if (current !== pathname)
    throw new Error(`Ruta inesperada: se esperaba ${pathname} y terminó en ${current}.`);
}

try {
  const firstAdminRequestPromise = page.waitForRequest((request) => {
    try {
      return new URL(request.url()).pathname.includes("/admin/");
    } catch {
      return false;
    }
  });
  await page.goto(`${appUrl}/dashboard`, { waitUntil: "domcontentloaded" });
  const firstAdminRequest = await firstAdminRequestPromise.catch(() => {
    throw new Error(
      "No se observó ninguna petición administrativa para confirmar el backend productivo.",
    );
  });
  const adminUrl = new URL(firstAdminRequest.url());
  if (
    adminUrl.origin !== expectedApiOrigin ||
    !adminUrl.pathname.startsWith("/api/v1/admin/")
  ) {
    throw new Error(
      `Backend administrativo incorrecto: ${safeHttpTarget(firstAdminRequest.url())}. Se esperaba ${expectedApiOrigin}/api/v1/admin/…`,
    );
  }
  process.stdout.write(
    `Backend administrativo confirmado: ${safeHttpTarget(firstAdminRequest.url())}\n`,
  );
  await Promise.race([
    page.getByText("Solo lectura", { exact: true }).waitFor(),
    page
      .waitForURL((url) => url.pathname === "/login")
      .then(() => {
        throw new Error(
          "La sesión READ_ONLY no pudo restaurarse; usa un refresh token nuevo/vigente.",
        );
      }),
  ]);
  await assertPath(
    "/dashboard",
    "La sesión READ_ONLY no pudo restaurarse; usa un refresh token nuevo/vigente.",
  );
  const hasRefreshSession = await page.evaluate(() =>
    Boolean(sessionStorage.getItem("ddr001.admin.refresh")),
  );
  if (!hasRefreshSession)
    throw new Error("Dashboard abrió sin una sesión refresh persistida.");

  const responseCheckpoint = failedResponses.length;
  await page.goto(`${appUrl}/hidrantes`, { waitUntil: "domcontentloaded" });
  await assertPath(
    "/hidrantes",
    "La sesión viewer se perdió al navegar a Hidrantes.",
  );
  await page.locator(".skeleton.loading").waitFor({ state: "hidden" });
  await page.getByRole("heading", { name: "Hidrantes", exact: true }).waitFor();

  const hydrantFailures = failedResponses.slice(responseCheckpoint);
  const unauthorizedHydrants = hydrantFailures.find(
    (item) => item.status === 401 && item.pathname === "/api/v1/admin/dashboard/hydrants",
  );
  if (unauthorizedHydrants)
    throw new Error(
      "/admin/dashboard/hydrants devolvió 401 después de restaurar la sesión viewer.",
    );

  process.stdout.write(`${await pageDiagnostic("Hidrantes cargado")}\n`);
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet", width: 768, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.screenshot({
      path: fileURLToPath(new URL(`${viewport.name}-hidrantes.png`, artifacts)),
      fullPage: true,
    });
  }

  if (consoleErrors.length)
    throw new Error(
      `Errores de consola: ${consoleErrors.map(formatConsoleError).join(" | ")}`,
    );
  if (requestFailures.length)
    throw new Error(
      `Requests fallidos: ${requestFailures.map(formatRequestFailure).join(" | ")}`,
    );
  if (failedResponses.length)
    throw new Error(
      `Respuestas HTTP fallidas: ${failedResponses.map(formatResponse).join(" | ")}`,
    );

  process.stdout.write(
    "Edge E2E correcto: viewer, dashboard e hidrantes en 1440/768/390.\n",
  );
} catch (error) {
  const diagnostic = await pageDiagnostic("Error E2E");
  await page
    .screenshot({
      path: fileURLToPath(new URL("error.png", artifacts)),
      fullPage: true,
    })
    .catch(() => undefined);
  await writeFile(
    fileURLToPath(new URL("error-page.txt", artifacts)),
    `${diagnostic}\nError: ${redact(error instanceof Error ? error.message : error)}\n`,
    "utf8",
  );
  process.stderr.write(`${diagnostic}\n`);
  throw error;
} finally {
  await browser.close();
}
