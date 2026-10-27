import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import { isDeepStrictEqual } from "node:util";
import { execFileSync } from "node:child_process";

const apiRoot = process.argv[2];
if (!apiRoot)
  throw new Error(
    "Usage: node scripts/generate-cabinets-contract.mjs <API checkout>",
  );
const document = YAML.parse(
  readFileSync(resolve(apiRoot, "docs/openapi.yaml"), "utf8"),
);
const selected = {};
function collect(name) {
  if (selected[name]) return;
  const schema = document.components.schemas[name];
  if (!schema) throw new Error(`Missing schema ${name}`);
  selected[name] = schema;
  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (value.$ref) collect(value.$ref.split("/").at(-1));
    Object.values(value).forEach(walk);
  }
  walk(schema);
}
Object.keys(document.components.schemas)
  .filter((name) => name.startsWith("CabinetAdmin"))
  .forEach(collect);
if (process.argv.includes("--check")) {
  const pinned = JSON.parse(
    readFileSync("src/features/cabinets/cabinets.schemas.json", "utf8"),
  );
  if (!isDeepStrictEqual(pinned, selected))
    throw Error(
      "Cabinets OpenAPI drift: re-audit types/adapters before regenerating",
    );
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: apiRoot,
    encoding: "utf8",
  }).trim();
  const header = readFileSync(
    "src/features/cabinets/cabinets.generated.ts",
    "utf8",
  ).split(/\r?\n/, 1)[0];
  if (header !== `// Generated from ddr001_api ${head}.`)
    throw Error(
      "Cabinets API reference drift: regenerate from the current committed API HEAD",
    );
  const paths = Object.entries(document.paths).filter(([path]) =>
    path.startsWith("/admin/dashboard/construction/cabinets"),
  );
  if (
    paths.filter(([, operations]) => operations.get).length !== 8 ||
    !document.paths["/admin/dashboard/construction/cabinets/{cabinetId}"]
      ?.patch ||
    !document.paths["/admin/dashboard/construction/cabinets/{cabinetId}"]
      ?.delete ||
    !document.paths[
      "/admin/dashboard/construction/cabinets/{cabinetId}/cancel-installation"
    ]?.post
  )
    throw Error("Administrative route contract drift");
  console.log(
    JSON.stringify({
      status: "PASS",
      schemas: Object.keys(selected).length,
      getEndpoints: paths.filter(([, operations]) => operations.get).length,
      apiHead: head,
    }),
  );
  process.exit(0);
}
function type(schema) {
  let value;
  if (schema.$ref) value = schema.$ref.split("/").at(-1);
  else if (schema.enum)
    value = schema.enum.map((item) => JSON.stringify(item)).join(" | ");
  else if (schema.allOf)
    value = schema.allOf
      .map(type)
      .map((t) => `(${t})`)
      .join(" & ");
  else if (schema.oneOf || schema.anyOf)
    value = (schema.oneOf || schema.anyOf)
      .map(type)
      .map((t) => `(${t})`)
      .join(" | ");
  else if (schema.type === "array") value = `Array<${type(schema.items)}>`;
  else if (schema.type === "object" || schema.properties) {
    const fields = Object.entries(schema.properties || {}).map(
      ([key, child]) =>
        `${JSON.stringify(key)}${schema.required?.includes(key) ? "" : "?"}: ${type(child)};`,
    );
    value = fields.length
      ? `{ ${fields.join(" ")} }`
      : schema.additionalProperties &&
          typeof schema.additionalProperties === "object"
        ? `Record<string, ${type(schema.additionalProperties)}>`
        : "object";
  } else
    value =
      schema.type === "integer" || schema.type === "number"
        ? "number"
        : schema.type === "boolean"
          ? "boolean"
          : schema.type === "string"
            ? "string"
            : "unknown";
  return schema.nullable ? `(${value}) | null` : value;
}
const out = resolve("src/features/cabinets");
const apiHead = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: apiRoot,
  encoding: "utf8",
}).trim();
const contractDirty = execFileSync(
  "git",
  ["status", "--porcelain", "--", "docs/openapi.yaml"],
  { cwd: apiRoot, encoding: "utf8" },
).trim();
mkdirSync(out, { recursive: true });
writeFileSync(
  resolve(out, "cabinets.generated.ts"),
  `// Generated from ddr001_api ${apiHead}${contractDirty ? " plus reviewed working-tree contract" : ""}.\n` +
    Object.entries(selected)
      .map(([name, schema]) => `export type ${name} = ${type(schema)};`)
      .join("\n") +
    "\n",
);
writeFileSync(
  resolve(out, "cabinets.schemas.json"),
  JSON.stringify(selected, null, 2) + "\n",
);
console.log(`Generated ${Object.keys(selected).length} schemas`);
