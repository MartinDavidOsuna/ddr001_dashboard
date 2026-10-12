// Controlled API dependency harness. No migrations, rebuilds, seeds or Field commands.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { writeFileSync, mkdirSync } from "node:fs";
const apiRoot = process.env.CABINETS_API_CHECKOUT;
if (!apiRoot) throw new Error("CABINETS_API_CHECKOUT is required");
const head = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: apiRoot,
  encoding: "utf8",
}).trim();
if (head !== "fbae6771c8457d623f652427ada9ac853f381f1f")
  throw new Error("Unexpected API HEAD; re-audit the contract");
process.chdir(apiRoot);
process.env.DOTENV_CONFIG_PATH = resolve(apiRoot, ".env.cabinets-test.local");
const load = (path: string) =>
  import(pathToFileURL(resolve(apiRoot, path)).href);
const { getEnv } = await load("src/config/env.ts");
const { db, closeDb } = await load("src/db/pool.ts");
const env = getEnv();
if (
  env.NODE_ENV !== "test" ||
  env.CONFIG_PROFILE !== "construction-test" ||
  env.SQL_DATABASE !== "DDR001_Hidrantes_TEST" ||
  resolve(env.STORAGE_ROOT) !== resolve(apiRoot, ".storage/construction-test")
)
  throw new Error("REFUSED: identity-certified TEST only");
const identity = (
  await (
    await db()
  )
    .request()
    .query(
      "SELECT DB_NAME() databaseName, CONVERT(varchar(40),SERVERPROPERTY('ProductVersion')) engineVersion,(SELECT compatibility_level FROM sys.databases WHERE name=DB_NAME()) compatibilityLevel",
    )
).recordset[0];
if (
  identity.databaseName !== "DDR001_Hidrantes_TEST" ||
  !identity.engineVersion.startsWith("12.") ||
  identity.compatibilityLevel !== 120
)
  throw new Error("REFUSED: actual SQL identity mismatch");
const evidenceRoot = resolve(
  process.env.CABINETS_EVIDENCE_ROOT ||
    "../ddr001_dashboard_cabinets/.artifacts/cabinets-real",
);
mkdirSync(evidenceRoot, { recursive: true });
writeFileSync(
  resolve(evidenceRoot, "identity.json"),
  JSON.stringify(
    {
      ...identity,
      apiHead: head,
      storageRoot: resolve(env.STORAGE_ROOT),
      checkedAt: new Date().toISOString(),
      apiOrigin: "http://127.0.0.1:3016",
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({ status: "TEST_VERIFIED", ...identity, apiHead: head }),
);
// Read existing TEST actors only. No password reset, seed or token-table mutation.
const { issueAdminTokens } = await load("src/security/jwt.ts");
const actors = (
  await (
    await db()
  )
    .request()
    .query(
      "SELECT admin_user_id,role FROM rv.admin_users WHERE is_active=1 AND role IN('admin','supervisor','viewer') ORDER BY admin_user_id",
    )
).recordset;
const sessions = Object.fromEntries(
  ["admin", "supervisor", "viewer"].flatMap((role) => {
    const actor = actors.find((row: { role: string }) => row.role === role);
    return actor
      ? [
          [
            role,
            {
              ...issueAdminTokens({ userId: actor.admin_user_id, role }),
              userId: actor.admin_user_id,
              role,
            },
          ],
        ]
      : [];
  }),
);
writeFileSync(
  resolve(evidenceRoot, "bootstrap.json"),
  JSON.stringify(sessions),
);
const { createApp } = await load("src/app.ts");
const server = createServer(createApp());
server.listen(3016, "127.0.0.1", () =>
  console.log("Controlled TEST API listening on 3016"),
);
async function close() {
  server.close();
  await closeDb();
  process.exit(0);
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
