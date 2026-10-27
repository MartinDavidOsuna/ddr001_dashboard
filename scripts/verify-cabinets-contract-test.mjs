// Read-only verification against the existing API checkout and identity-checked TEST.
// Run with the API's tsx loader; never invokes server startup, migrations or seeds.
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { assertContract } from "../src/features/cabinets/cabinets.contract.ts";

const apiRoot = process.argv[2];
if (!apiRoot)
  throw new Error(
    "Usage: node --import <API>/node_modules/tsx/dist/loader.mjs scripts/verify-cabinets-contract-test.mjs <existing API checkout>",
  );
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
      writes: 0,
    }),
  );
} finally {
  await closeDb();
}
