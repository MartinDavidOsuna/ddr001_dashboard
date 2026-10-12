import definitions from "./cabinets.schemas.json";

type Schema = {
  $ref?: string;
  nullable?: boolean;
  type?: string;
  enum?: unknown[];
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  additionalProperties?: Schema | boolean;
  allOf?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
};
const schemas = definitions as Record<string, Schema>;
function valid(schema: Schema, value: unknown): boolean {
  if (value === null) return schema.nullable === true;
  if (schema.$ref)
    return valid(schemas[schema.$ref.split("/").at(-1)!]!, value);
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.allOf && !schema.allOf.every((s) => valid(s, value))) return false;
  const union = schema.oneOf || schema.anyOf;
  if (union && !union.some((s) => valid(s, value))) return false;
  if (schema.type === "number" || schema.type === "integer")
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      (schema.type !== "integer" || Number.isInteger(value))
    );
  if (schema.type === "string") return typeof value === "string";
  if (schema.type === "boolean") return typeof value === "boolean";
  if (schema.type === "array")
    return Array.isArray(value) && value.every((v) => valid(schema.items!, v));
  if (schema.type === "object" || schema.properties) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return false;
    const record = value as Record<string, unknown>;
    if (schema.required?.some((key) => !(key in record))) return false;
    if (
      Object.entries(schema.properties || {}).some(
        ([key, s]) => key in record && !valid(s, record[key]),
      )
    )
      return false;
    if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === "object"
    )
      return Object.entries(record).every(
        ([key, v]) =>
          key in (schema.properties || {}) ||
          valid(schema.additionalProperties as Schema, v),
      );
  }
  return true;
}
export function assertContract<T>(
  name: keyof typeof definitions,
  value: unknown,
): T {
  if (!valid(schemas[name]!, value)) throw new Error("CABINETS_CONTRACT_DRIFT");
  return value as T;
}
