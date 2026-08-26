import { access, mkdir } from "node:fs/promises";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const appUrl = process.env.E2E_APP_URL || "http://localhost:5173";
const refreshToken = process.env.E2E_REFRESH_TOKEN;
const artifacts = new URL("../.artifacts/edge/", import.meta.url);
const edgeCandidates = [
  process.env.EDGE_EXECUTABLE,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

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
  timezoneId: "America/Ojinaga",
});
await context.addInitScript((token) => {
  sessionStorage.setItem("ddr001.admin.refresh", token);
}, refreshToken);

const page = await context.newPage();
page.setDefaultTimeout(15_000);
const consoleErrors = [];
const failedResponses = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400)
    failedResponses.push(`${response.status()} ${new URL(response.url()).pathname}`);
});

try {
  await page.goto(`${appUrl}/dashboard`, { waitUntil: "networkidle" });
  if (new URL(page.url()).pathname === "/login")
    throw new Error("La sesión READ_ONLY no pudo restaurarse; renueva el refresh token.");
  await page.getByText("Solo lectura", { exact: true }).waitFor();

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet", width: 768, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${appUrl}/hidrantes`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Hidrantes" }).waitFor();
    await page.screenshot({
      path: fileURLToPath(new URL(`${viewport.name}-hidrantes.png`, artifacts)),
      fullPage: true,
    });
  }

  if (consoleErrors.length)
    throw new Error(`Errores de consola: ${consoleErrors.join(" | ")}`);
  if (failedResponses.length)
    throw new Error(`Respuestas HTTP fallidas: ${failedResponses.join(" | ")}`);

  process.stdout.write(
    "Edge E2E correcto: viewer, dashboard e hidrantes en 1440/768/390.\n",
  );
} finally {
  await browser.close();
}
