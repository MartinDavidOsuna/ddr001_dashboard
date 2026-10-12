import { readFileSync, writeFileSync } from "node:fs";
import { assertContract } from "../src/features/cabinets/cabinets.contract.ts";
import type {
  CabinetAdminList,
  CabinetAdminDossier,
} from "../src/features/cabinets/cabinets.generated.ts";
const evidence = ".artifacts/cabinets-real";
const identity = JSON.parse(readFileSync(`${evidence}/identity.json`, "utf8"));
if (
  identity.databaseName !== "DDR001_Hidrantes_TEST" ||
  !identity.engineVersion.startsWith("12.") ||
  identity.apiHead !== "fbae6771c8457d623f652427ada9ac853f381f1f"
)
  throw new Error("TEST identity evidence required");
const origin = identity.apiOrigin;
const bootstrap = JSON.parse(
  readFileSync(`${evidence}/bootstrap.json`, "utf8"),
);
let authentication = "existing-TEST-actor-issued-bearer",
  tokens = bootstrap.admin;
if (process.env.CABINETS_TEST_EMAIL && process.env.RVS_TEST_ADMIN_PASSWORD) {
  const login = await fetch(`${origin}/api/v1/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.CABINETS_TEST_EMAIL,
      password: process.env.RVS_TEST_ADMIN_PASSWORD,
    }),
  });
  if (!login.ok) throw Error(`TEST administrative login HTTP ${login.status}`);
  authentication = "password-login";
  tokens = await login.json();
}
if (!tokens?.accessToken)
  throw new Error("An existing active TEST administrator is required");
// Short-lived tokens only in ignored evidence, required by the browser TEST runner.
writeFileSync(
  `${evidence}/session.json`,
  JSON.stringify({ ...tokens, authentication }),
);
const root = `${origin}/api/v1/admin/dashboard/construction/cabinets`;
const results: Array<{ endpoint: string; status: number; contract: string }> =
  [];
async function get<T>(
  path: string,
  schema: Parameters<typeof assertContract>[0],
) {
  const response = await fetch(root + path, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });
  const body = await response.json();
  results.push({
    endpoint: path || "/",
    status: response.status,
    contract: schema,
  });
  if (!response.ok)
    throw new Error(
      `Administrative GET ${path || "/"}: HTTP ${response.status}`,
    );
  return assertContract<T>(schema, body);
}
await get("/summary", "CabinetAdminSummary");
await get("/metrics", "CabinetAdminMetrics");
for (const role of ["admin", "supervisor", "viewer"]) {
  if (!bootstrap[role]) throw new Error(`Missing existing TEST role ${role}`);
  const response = await fetch(root + "/summary", {
    headers: { Authorization: `Bearer ${bootstrap[role].accessToken}` },
  });
  const expected = role === "viewer" ? 403 : 200;
  if (response.status !== expected)
    throw new Error(
      `TEST ${role}: expected ${expected}, received ${response.status}`,
    );
  results.push({
    endpoint: `summary (${role})`,
    status: response.status,
    contract: "administrative-role",
  });
}
const page = await get<CabinetAdminList>(
  "?page=1&pageSize=10",
  "CabinetAdminList",
);
await get(
  "/map?limit=1&north=23&south=19&west=-105&east=-100",
  "CabinetAdminMap",
);
for (const automated of ["true", "false"])
  await get(`?automated=${automated}&pageSize=1`, "CabinetAdminList");
await get("?search=AQ26-&page=100000&pageSize=1", "CabinetAdminList");
if (page.items.length) {
  const row = page.items[0]!;
  const filters = [
    new URLSearchParams({ search: row.formattedUid }),
    new URLSearchParams({ search: row.uid }),
    new URLSearchParams({ uid: row.uid }),
    new URLSearchParams({ uid: row.formattedUid }),
    new URLSearchParams({ model: row.model }),
    new URLSearchParams({ status: row.status }),
  ];
  if (row.crew) filters.push(new URLSearchParams({ crewId: row.crew.id }));
  if (row.base)
    filters.push(new URLSearchParams({ baseSurveyId: row.base.surveyId }));
  if (row.installationAccountNumber)
    filters.push(
      new URLSearchParams({ accountNumber: row.installationAccountNumber }),
    );
  if (row.registeredAt)
    filters.push(
      new URLSearchParams({
        from: row.registeredAt,
        to: new Date(Date.parse(row.registeredAt) + 86400000).toISOString(),
      }),
    );
  for (const query of filters) {
    const found = await get<CabinetAdminList>("?" + query, "CabinetAdminList");
    if (!found.items.some((item) => item.cabinetId === row.cabinetId))
      throw Error("TEST supported filter lost selected row");
  }
  const detail = await get<CabinetAdminDossier>(
    `/${page.items[0]!.cabinetId}`,
    "CabinetAdminDossier",
  );
  for (const photo of detail.photos.slice(0, 1))
    for (const kind of ["thumbnailUrl", "contentUrl"] as const) {
      const response = await fetch(origin + photo[kind], {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      if (![200, 404, 409, 503].includes(response.status))
        throw new Error(`Unexpected photo HTTP ${response.status}`);
      results.push({
        endpoint: kind,
        status: response.status,
        contract: "binary/localized integrity error",
      });
    }
  writeFileSync(
    `${evidence}/selected.json`,
    JSON.stringify({
      cabinetId: page.items[0]!.cabinetId,
      formattedUid: page.items[0]!.formattedUid,
      hasPhotos: detail.photos.length > 0,
      baseId: detail.base?.surveyId || null,
    }),
  );
}
writeFileSync(
  `${evidence}/http-results.json`,
  JSON.stringify(
    {
      mode: "REAL_HTTP_TEST",
      authentication,
      identity,
      results,
      cases: page.items.length,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    mode: "REAL_HTTP_TEST",
    authentication,
    status: "PASS",
    checks: results.length,
    cases: page.items.length,
  }),
);
