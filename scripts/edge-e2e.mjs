import { access, mkdir, writeFile } from "node:fs/promises";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import {
  assertSupportedAdministrativeRole,
  selectEdgeAuthMode,
} from "./edge-auth-mode.mjs";

const appUrl = process.env.E2E_APP_URL || "http://localhost:5173";
const refreshToken = process.env.E2E_REFRESH_TOKEN;
const viewerEmail = process.env.E2E_VIEWER_EMAIL;
const viewerPassword = process.env.E2E_VIEWER_PASSWORD;
const authMode = selectEdgeAuthMode({
  email: viewerEmail,
  password: viewerPassword,
  refreshToken,
});
const useCredentials = authMode === "credentials";
const useRefreshToken = authMode === "refresh";
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

process.stdout.write(
  [
    `E2E_VIEWER_EMAIL: ${viewerEmail ? "definido" : "no definido"}`,
    `E2E_VIEWER_PASSWORD: ${viewerPassword ? "definido" : "no definido"}`,
    `E2E_REFRESH_TOKEN: ${refreshToken ? "definido" : "no definido"}`,
    `Modo de autenticación E2E: ${useCredentials ? "credenciales administrativas" : "refresh token"}`,
  ].join("\n") + "\n",
);

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
if (useRefreshToken)
  await context.addInitScript((token) => {
    const key = "ddr001.admin.refresh";
    if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, token);
  }, refreshToken);
if (useCredentials)
  await context.addInitScript(() => {
    if (location.pathname === "/login")
      sessionStorage.removeItem("ddr001.admin.refresh");
  });

const page = await context.newPage();
page.setDefaultNavigationTimeout(timeoutMs);
page.setDefaultTimeout(timeoutMs);
const consoleErrors = [];
const failedResponses = [];
const requestFailures = [];
const galleryRequests = [];
page.on("request", (request) => {
  const url = new URL(request.url());
  if (
    url.pathname.includes("/admin/dashboard/photos") ||
    /\/admin\/dashboard\/inspections\/[^/]+\/photos\/[^/]+\/(thumbnail|content)$/.test(
      url.pathname,
    )
  )
    galleryRequests.push({
      method: request.method(),
      pathname: url.pathname,
      queryKeys: [...url.searchParams.keys()].sort(),
    });
});
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

const adminMePath = "/api/v1/admin/auth/me";
const isAdminMeResponse = (response) => {
  try {
    return (
      response.request().method() === "GET" &&
      new URL(response.url()).pathname === adminMePath
    );
  } catch {
    return false;
  }
};
async function detectSupportedAdministrativeRole(response) {
  if (response.status() !== 200)
    throw new Error("No fue posible confirmar el rol administrativo E2E.");
  const claims = await response.json().catch(() => undefined);
  const role = assertSupportedAdministrativeRole(claims?.role);
  const expectedLabel = role === "viewer" ? "Solo lectura" : "Administrador";
  await page.getByText(expectedLabel, { exact: true }).waitFor();
  return role;
}

const galleryListPath = "/api/v1/admin/dashboard/photos";
const isGalleryListResponse = (response) => {
  const url = new URL(response.url());
  return response.request().method() === "GET" && url.pathname === galleryListPath;
};
async function galleryAction(action) {
  const responsePromise = page.waitForResponse(isGalleryListResponse);
  await action();
  const response = await responsePromise;
  if (response.status() !== 200)
    throw new Error(`La consulta de galería devolvió ${response.status()}.`);
  return response.json();
}
async function resetGallery() {
  return galleryAction(() => page.getByRole("button", { name: "Limpiar" }).click());
}
async function chooseFirst(selectId) {
  const options = await page.locator(`${selectId} option`).evaluateAll((items) =>
    items.map((item) => ({ value: item.value, text: item.textContent || "" })),
  );
  const option = options.find((item) => item.value);
  if (!option) return undefined;
  return galleryAction(() => page.locator(selectId).selectOption(option.value));
}
async function assertNoHorizontalOverflow(label) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  if (overflow) throw new Error(`Overflow horizontal en ${label}.`);
}

try {
  const authPath = useCredentials
    ? "/api/v1/admin/auth/login"
    : "/api/v1/admin/auth/refresh";
  const initialAuthResponsePromise = page.waitForResponse((response) => {
    const request = response.request();
    try {
      return (
        request.method() === "POST" &&
        new URL(response.url()).pathname === authPath
      );
    } catch {
      return false;
    }
  });
  const initialMeResponsePromise = page.waitForResponse(isAdminMeResponse);
  await page.goto(`${appUrl}${useCredentials ? "/login" : "/dashboard"}`, {
    waitUntil: "domcontentloaded",
  });
  if (useCredentials) {
    const cleanSession = await page.evaluate(
      () => !sessionStorage.getItem("ddr001.admin.refresh"),
    );
    if (!cleanSession)
      throw new Error("El contexto E2E de credenciales no inició con una sesión limpia.");
    await page.getByLabel("Correo electrónico").fill(viewerEmail);
    await page.getByLabel("Contraseña", { exact: true }).fill(viewerPassword);
    await page.getByRole("button", { name: "Ingresar" }).click();
  }
  const initialAuthResponse = await initialAuthResponsePromise.catch(() => {
    throw new Error(
      useCredentials
        ? "El login administrativo E2E falló."
        : "El E2E_REFRESH_TOKEN no pudo restaurar la sesión.",
    );
  });
  const adminUrl = new URL(initialAuthResponse.url());
  if (
    adminUrl.origin !== expectedApiOrigin ||
    adminUrl.pathname !== authPath
  ) {
    throw new Error(
      `Backend administrativo incorrecto: ${safeHttpTarget(initialAuthResponse.url())}. Se esperaba ${expectedApiOrigin}${authPath}.`,
    );
  }
  process.stdout.write(
    `Backend administrativo confirmado: ${safeHttpTarget(initialAuthResponse.url())}\n`,
  );
  if (initialAuthResponse.status() !== 200)
    throw new Error(
      useCredentials
        ? "El login administrativo E2E falló."
        : "El E2E_REFRESH_TOKEN no pudo restaurar la sesión.",
    );
  const initialMeResponse = await initialMeResponsePromise.catch(() => {
    throw new Error("No fue posible confirmar el rol administrativo E2E.");
  });
  const authenticatedRole = await detectSupportedAdministrativeRole(
    initialMeResponse,
  );
  process.stdout.write(
    `Rol administrativo E2E detectado: ${authenticatedRole}\n`,
  );
  await Promise.all([
    page
      .waitForURL((url) => url.pathname === "/dashboard")
      .catch(() => {
        throw new Error(
          useCredentials
            ? "El login administrativo E2E falló."
            : "El E2E_REFRESH_TOKEN no pudo restaurar la sesión.",
        );
      }),
  ]);
  await assertPath(
    "/dashboard",
    useCredentials
      ? "El login administrativo E2E falló."
      : "El E2E_REFRESH_TOKEN no pudo restaurar la sesión.",
  );
  const hasRefreshSession = await page.evaluate(() =>
    Boolean(sessionStorage.getItem("ddr001.admin.refresh")),
  );
  if (!hasRefreshSession)
    throw new Error("Dashboard abrió sin una sesión refresh persistida.");

  const refreshAfterReloadPromise = page.waitForResponse((response) => {
    try {
      return (
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/v1/admin/auth/refresh"
      );
    } catch {
      return false;
    }
  });
  const refreshedMeResponsePromise = page.waitForResponse(isAdminMeResponse);
  await page.reload({ waitUntil: "domcontentloaded" });
  const refreshAfterReload = await refreshAfterReloadPromise.catch(() => {
    throw new Error(
      "El refresh de la sesión administrativa falló después del login.",
    );
  });
  if (refreshAfterReload.status() !== 200)
    throw new Error(
      "El refresh de la sesión administrativa falló después del login.",
    );
  const refreshedMeResponse = await refreshedMeResponsePromise.catch(() => {
    throw new Error(
      "El refresh de la sesión administrativa falló después del login.",
    );
  });
  const refreshedRole = await detectSupportedAdministrativeRole(
    refreshedMeResponse,
  );
  if (refreshedRole !== authenticatedRole)
    throw new Error("El rol cambió después del refresh de sesión.");
  await assertPath(
    "/dashboard",
    "El refresh de la sesión administrativa falló después del login.",
  );

  const initialResponsePromise = page.waitForResponse(isGalleryListResponse);
  await page.goto(`${appUrl}/fotografias`, { waitUntil: "domcontentloaded" });
  const initialResponse = await initialResponsePromise;
  if (initialResponse.status() !== 200)
    throw new Error(`Galería inicial devolvió ${initialResponse.status()}.`);
  const initial = await initialResponse.json();
  await assertPath(
    "/fotografias",
    "La sesión administrativa se perdió al abrir Fotografías.",
  );
  await page.getByRole("heading", { name: "Fotografías", exact: true }).waitFor();
  await page.locator(".gallery .skeleton").first().waitFor({ state: "hidden" }).catch(() => undefined);
  if (!Array.isArray(initial.items) || !initial.items.length)
    throw new Error("La galería productiva no devolvió fotografías reales.");
  if (!(Number(initial.total) >= initial.items.length))
    throw new Error("El total server-side de la galería es inconsistente.");
  await page.getByText(`${Number(initial.total).toLocaleString("es-MX")} imágenes`).waitFor();

  const verified = initial.items.filter((item) => item.uploadStatus === "verified");
  const additional = initial.items.filter((item) => item.category === "additional");
  const mandatory = initial.items.filter((item) => item.category === "mandatory");
  if (!verified.length) throw new Error("No hay fotografía verificada para probar el original.");
  if (!mandatory.length && !additional.length)
    throw new Error("La API no clasificó fotografías obligatorias/adicionales.");

  await page.waitForTimeout(700);
  const initialThumbs = galleryRequests.filter((item) => item.pathname.endsWith("/thumbnail")).length;
  if (initialThumbs >= verified.length && verified.length > 12)
    throw new Error("Todas las miniaturas de la página se descargaron al inicio; lazy loading no opera.");
  if (galleryRequests.some((item) => item.pathname.endsWith("/content")))
    throw new Error("Se descargó un original antes de abrir el lightbox.");

  const nonVerifiedIndex = initial.items.findIndex(
    (item) => item.uploadStatus !== "verified",
  );
  if (nonVerifiedIndex >= 0) {
    const originalCount = galleryRequests.filter((item) => item.pathname.endsWith("/content")).length;
    await page.locator(".photo-card .preview").nth(nonVerifiedIndex).click();
    await page.getByText("El original privado sólo está disponible para fotografías verificadas.").waitFor();
    const afterOpen = galleryRequests.filter((item) => item.pathname.endsWith("/content")).length;
    if (afterOpen !== originalCount)
      throw new Error("Una fotografía no verificada intentó descargar el original.");
    await page.getByRole("button", { name: "Cerrar" }).click();
  }

  const first = initial.items[0];
  const searched = await galleryAction(async () => {
    await page.getByLabel("Buscar fotografías").fill(String(first.accountNumber));
  });
  if (!searched.items.every((item) => String(item.accountNumber).includes(String(first.accountNumber))))
    throw new Error("La búsqueda server-side por cuenta devolvió un resultado ajeno.");
  await resetGallery();

  for (const selectId of ["#slot", "#technician", "#crew", "#verification"]) {
    const result = await chooseFirst(selectId);
    if (result) await resetGallery();
  }
  for (const category of ["mandatory", "additional"]) {
    const result = await galleryAction(() => page.locator("#category").selectOption(category));
    if (result.items.length && !result.items.every((item) => item.category === category))
      throw new Error(`El filtro ${category} devolvió otra categoría.`);
    await resetGallery();
  }

  const capturedDate = String(first.capturedAt).slice(0, 10);
  for (const inputId of ["#from", "#to"]) {
    const result = await galleryAction(async () => {
      await page.locator(inputId).fill(capturedDate);
      await page.getByRole("button", { name: "Aplicar" }).click();
    });
    if (!Array.isArray(result.items)) throw new Error(`Filtro ${inputId} inválido.`);
    await resetGallery();
  }

  const combined = await galleryAction(async () => {
    await page.getByLabel("Buscar fotografías").fill(String(first.accountNumber));
    await page.waitForTimeout(50);
    await page.locator("#category").selectOption(String(first.category));
  });
  if (!combined.items.every((item) => item.category === first.category))
    throw new Error("La combinación de filtros no se aplicó server-side.");
  await page.waitForTimeout(400);
  const restored = await resetGallery();
  if (restored.page !== 1 || restored.total !== initial.total)
    throw new Error("Limpiar filtros no restauró el estado inicial.");

  if (initial.total > initial.pageSize) {
    const second = await galleryAction(() => page.getByRole("button", { name: "Siguiente" }).click());
    if (second.page !== 2 || second.items.length > second.pageSize)
      throw new Error("Paginación server-side inválida en página 2.");
    const returned = await galleryAction(() => page.getByRole("button", { name: "Anterior" }).click());
    if (returned.page !== 1) throw new Error("No se pudo volver a página 1.");
  }
  const resized = await galleryAction(() => page.getByLabel("Por página").selectOption("20"));
  if (resized.pageSize !== 20 || resized.items.length > 20)
    throw new Error("El page size no se aplicó en servidor.");

  const verifiedPage = await galleryAction(() =>
    page.locator("#verification").selectOption("verified"),
  );
  if (!verifiedPage.items.length)
    throw new Error("El filtro verified no devolvió fotografías para el lightbox.");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: fileURLToPath(new URL("desktop-gallery.png", artifacts)),
    fullPage: true,
  });
  const contentResponsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/content"),
  );
  await page.locator(".photo-card .preview").first().click();
  const contentResponse = await contentResponsePromise;
  if (contentResponse.status() !== 200 || !contentResponse.headers()["content-type"]?.startsWith("image/"))
    throw new Error("El original privado no devolvió HTTP 200 con MIME de imagen.");
  await page.locator(".lightbox img").waitFor();
  await page.getByText("Obligatoria", { exact: true }).or(page.getByText("Adicional", { exact: true })).first().waitFor();
  await page.getByRole("button", { name: "Acercar" }).click();
  await page.getByRole("button", { name: "Alejar" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Anterior" }).click();
  await page.screenshot({
    path: fileURLToPath(new URL("gallery-lightbox.png", artifacts)),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cerrar" }).click();
  await resetGallery();

  await page.locator(".photo-card a").filter({ hasText: "Hidrante" }).first().click();
  await page.waitForURL((url) => url.pathname.startsWith("/hidrantes/"));
  await page.goBack({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Fotografías", exact: true }).waitFor();
  await page.locator(".photo-card a").filter({ hasText: "Rev." }).first().click();
  await page.waitForURL((url) => url.pathname.startsWith("/revisiones/"));
  await page.goBack({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Fotografías", exact: true }).waitFor();

  await galleryAction(() => page.locator("#verification").selectOption("verified"));

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet", width: 768, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await assertNoHorizontalOverflow(viewport.name);
    await page.screenshot({
      path: fileURLToPath(new URL(`${viewport.name}-gallery.png`, artifacts)),
      fullPage: true,
    });
    await page.locator(".photo-card .preview").first().click();
    await page.locator(".lightbox img").waitFor();
    await assertNoHorizontalOverflow(`${viewport.name} lightbox`);
    await page.getByRole("button", { name: "Cerrar" }).click();
  }

  const nonVerified = initial.items.find((item) => item.uploadStatus !== "verified");
  const certification = {
    authenticatedRole,
    initialTotal: initial.total,
    initialPageSize: initial.pageSize,
    initialItems: initial.items.length,
    mandatoryObserved: mandatory.length,
    additionalObserved: additional.length,
    initialThumbnailRequests: initialThumbs,
    nonVerifiedObserved: Boolean(nonVerified),
    galleryListRequests: galleryRequests.filter((item) => item.pathname === galleryListPath).length,
    originalRequests: galleryRequests.filter((item) => item.pathname.endsWith("/content")).length,
  };
  await writeFile(
    fileURLToPath(new URL("gallery-certification.json", artifacts)),
    `${JSON.stringify(certification, null, 2)}\n`,
    "utf8",
  );

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

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForURL((url) => url.pathname === "/login");
  const sessionRemoved = await page.evaluate(
    () => !sessionStorage.getItem("ddr001.admin.refresh"),
  );
  if (!sessionRemoved) throw new Error("Logout no eliminó la sesión refresh.");

  process.stdout.write(`${await pageDiagnostic("Galería certificada y logout correcto")}\n`);
  process.stdout.write(
    `Edge E2E correcto: rol ${authenticatedRole}, galería y lightbox en 1440/768/390.\n`,
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
