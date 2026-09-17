// Read-only comparison with the audited API source; does not import/start/mutate the API.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const repo = process.env.DIAGNOSTICS_API_REPO || resolve("../ddr001_api_rv");
const sha = "e571b8bdf84a709a0d4ce40bf2a5f842e44199bd";
const show = (path) =>
  execFileSync("git", ["show", `${sha}:${path}`], {
    cwd: repo,
    encoding: "utf8",
  });
const sql = show(
    "database/migrations/20260902_functional_diagnostics_domain.sql",
  ),
  repository = show("src/modules/functional-diagnostics/admin.repository.ts"),
  schemas = show("src/modules/functional-diagnostics/admin.schemas.ts"),
  routes = show("src/modules/functional-diagnostics/admin.routes.ts");
const fixture = JSON.parse(
  readFileSync("tests/fixtures/functional-diagnostics.json", "utf8"),
);
const assert = (c, m) => {
  if (!c) throw new Error(m);
};
const camel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
for (const [table, row, extras] of [
  ["cases", fixture.detail.case, []],
  ["flow_points", fixture.detail.flowPoints[0], ["samples"]],
  [
    "samples",
    fixture.detail.flowPoints[0].samples[0],
    ["points", "evidence", "operationalSettings"],
  ],
  [
    "sample_operational_settings",
    fixture.detail.flowPoints[0].samples[0].operationalSettings,
    [],
  ],
  ["points", fixture.detail.flowPoints[0].samples[0].points[0], []],
]) {
  const block = sql
    .split(`CREATE TABLE functional_diag.${table}(`)[1]
    .split("\n  );")[0];
  const fields = [
    ...block.matchAll(
      /(?:^|[,\n])\s*(\w+)\s+(?:UNIQUEIDENTIFIER|NVARCHAR|VARCHAR|CHAR|DATETIME2|DECIMAL|BIGINT|SMALLINT|INT|BIT|ROWVERSION)/g,
    ),
  ]
    .map((m) => m[1])
    .filter((k) => !["row_version", "payload_sha256"].includes(k))
    .map(camel);
  for (const field of fields)
    assert(Object.hasOwn(row, field), `${table} fixture missing ${field}`);
  for (const field of Object.keys(row))
    assert(
      fields.includes(field) || extras.includes(field),
      `${table} fixture invents ${field}`,
    );
}
for (const alias of [
  "review_status status",
  "review_comment comment",
  "reviewed_by_admin_id reviewedBy",
  "reviewed_by_name_snapshot reviewedByName",
  "client_created_at createdAt",
  "server_created_at receivedAt",
])
  assert(repository.includes(alias), `Alias drift: ${alias}`);
for (const field of [
  "caseCount",
  "sampleCount",
  "meanErrorPct",
  "dispersionPct",
  "byFlowPoint",
  "bySource",
  "byTechnician",
  "evidenceCompleteness",
  "samplesPerCase",
])
  assert(repository.includes(field), `Missing metrics ${field}`);
for (const endpoint of [
  "/summary",
  "/cases",
  "/metrics",
  "/trends",
  "/users",
  "/users/:userId/access",
  "/users/:userId/access-history",
  "/reports",
  "/cases/:caseId/report",
  "/cases/:caseId/reviews",
  "/cases/:caseId/evidence/:evidenceId/thumbnail",
  "/cases/:caseId/evidence/:evidenceId/content",
])
  assert(routes.includes(`'${endpoint}'`), `Route drift ${endpoint}`);
assert(
  schemas.includes("z.enum(['exclude', 'include', 'only']).default('exclude')"),
  "Simulation contract drift",
);
assert(
  routes.includes("requireRole('admin', 'supervisor')") &&
    routes.includes("requireRole('admin')"),
  "Permission drift",
);
assert(
  repository.includes("sampleWhere = simulationPredicate(query.simulation)"),
  "Simulation filter missing",
);
console.log(
  JSON.stringify({
    status: "PASS",
    apiSha: sha,
    fixtureTables: 5,
    endpoints: 12,
    mode: "read-only source contract",
  }),
);
