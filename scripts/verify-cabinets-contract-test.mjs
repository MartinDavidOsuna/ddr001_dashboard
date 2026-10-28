// Read-only verification against the existing API checkout and identity-checked TEST.
// Run with the API's tsx loader; never invokes server startup, migrations or seeds.
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { assertContract } from "../src/features/cabinets/cabinets.contract.ts";

const apiRoot = process.argv[2] ? resolve(process.argv[2]) : undefined;
if (!apiRoot)
  throw new Error(
    "Usage: node --import <API>/node_modules/tsx/dist/loader.mjs scripts/verify-cabinets-contract-test.mjs <existing API checkout>",
  );
// The API's construction-test guard resolves its isolated root from cwd.
// Change it before loading API configuration, without weakening that guard.
if (process.argv.includes("--http")) process.chdir(apiRoot);
process.env.DOTENV_CONFIG_PATH ??= join(resolve(apiRoot), ".env");
const moduleAt = (path) =>
  import(pathToFileURL(join(resolve(apiRoot), path)).href);
const { getEnv } = await moduleAt("src/config/env.ts");
const { db, closeDb, databaseIdentity } = await moduleAt("src/db/pool.ts");
const { cabinetList } = await moduleAt(
  "src/modules/admin/cabinets-admin.repository.ts",
);
const { cabinetListSchema } = await moduleAt(
  "src/modules/admin/cabinets-admin.schemas.ts",
);
try {
  const env = getEnv();
  assert.equal(env.NODE_ENV, "test", "TEST environment required");
  assert.equal(
    env.SQL_DATABASE.trim(),
    "DDR001_Hidrantes_TEST",
    "Exact TEST configuration required",
  );
  const identity = await databaseIdentity();
  assert.equal(
    identity.databaseName,
    "DDR001_Hidrantes_TEST",
    "Actual SQL identity must be TEST",
  );
  const read = async (query) =>
    assertContract(
      "CabinetAdminList",
      JSON.parse(
        JSON.stringify(await cabinetList(cabinetListSchema.parse(query))),
      ),
    );
  const first = await read({ page: 1, pageSize: 2 });
  const second = await read({ page: 2, pageSize: 2 });
  const all = await read({ page: 1, pageSize: 100 });
  let validatedRows = all.items.length;
  for (let page = 2; page <= all.totalPages; page++)
    validatedRows += (await read({ page, pageSize: 100 })).items.length;
  assert.equal(validatedRows, all.total);
  assert.equal(first.total, second.total);
  assert.equal(first.page, 1);
  assert.equal(second.page, 2);
  assert.equal(first.totalPages, Math.ceil(first.total / 2));
  assert.equal(first.items.length, Math.min(2, first.total));
  assert.equal(second.items.length, Math.min(2, Math.max(0, first.total - 2)));
  assert(
    !first.items.some((row) =>
      second.items.some((other) => other.cabinetId === row.cabinetId),
    ),
  );
  let filtered = 0;
  if (first.items[0]) {
    const sample = first.items[0];
    const exact = await read({
      uid: sample.uid,
      model: sample.model,
      status: sample.status,
      automated: String(sample.automated),
    });
    assert.equal(exact.total, 1);
    assert.equal(exact.items[0].cabinetId, sample.cabinetId);
    filtered = exact.total;
  }
  const engine = await (
    await db()
  )
    .request()
    .query(
      "SELECT CONVERT(varchar(40),SERVERPROPERTY('ProductVersion')) productVersion,compatibility_level compatibilityLevel FROM sys.databases WHERE name=DB_NAME()",
    );
  let httpChecks = 0;
  if (process.argv.includes("--http")) {
    assert.equal(env.CONFIG_PROFILE, "construction-test");
    assert.equal(
      resolve(env.STORAGE_ROOT),
      join(resolve(apiRoot), ".storage/construction-test"),
    );
    assert.equal(env.ARCHIVE_STORAGE_ENABLED, false);
    const { createApp } = await moduleAt("src/app.ts");
    const { issueAdminTokens } = await moduleAt("src/security/jwt.ts");
    const request = createRequire(join(resolve(apiRoot), "package.json"))(
      "supertest",
    );
    const actors = await (
      await db()
    )
      .request()
      .query(
        "SELECT TOP(1) admin_user_id FROM rv.admin_users WHERE role='admin' AND is_active=1 ORDER BY admin_user_id",
      );
    assert(
      actors.recordset[0],
      "Existing active TEST admin required; this check never creates users",
    );
    // In-process HTTP only. This token is never printed, persisted or sent to an external host.
    const token = issueAdminTokens({
      userId: actors.recordset[0].admin_user_id,
      role: "admin",
    }).accessToken;
    const app = createApp(),
      root = "/api/v1/admin/dashboard/construction/cabinets";
    const get = async (suffix, schema, query = {}) => {
      const response = await request(app)
        .get(root + suffix)
        .set("Authorization", `Bearer ${token}`)
        .query(query);
      assert.equal(response.status, 200, `Current API HTTP ${suffix || "/"}`);
      assertContract(schema, response.body);
      httpChecks++;
      return response.body;
    };
    await get("", "CabinetAdminList", { page: 1, pageSize: 100 });
    await get("/summary", "CabinetAdminSummary");
    await get("/metrics", "CabinetAdminMetrics");
    await get("/map", "CabinetAdminMap");
    await get("/administration-options", "CabinetAdminOptions");
    for (const row of all.items)
      await get("/" + row.cabinetId, "CabinetAdminDossier");
  }
  let mutationChecks = 0;
  const captureIndex = process.argv.indexOf("--mutations");
  if (captureIndex >= 0) {
    const captured = JSON.parse(
      await readFile(process.argv[captureIndex + 1], "utf8"),
    );
    assert.deepEqual(Object.keys(captured).sort(), [
      "cancel",
      "delete",
      "edit",
    ]);
    for (const result of Object.values(captured)) {
      assertContract("CabinetAdminMutationResult", result);
      mutationChecks++;
    }
    assert.equal(captured.cancel.cabinet.installation, null);
    assert(captured.delete.cabinet.administration.archivedAt);
  }
  console.log(
    JSON.stringify({
      status: "PASS",
      database: identity.databaseName,
      engine: engine.recordset[0],
      total: all.total,
      validatedRows,
      companySources: [
        ...new Set(all.items.map((row) => row.crew?.source ?? null)),
      ],
      pageChecks: 2,
      filtered,
      httpChecks,
      mutationChecks,
      writes: 0,
    }),
  );
} finally {
  await closeDb();
}
