import { describe, expect, it } from "vitest";
import {
  assertSupportedAdministrativeRole,
  selectEdgeAuthMode,
} from "./edge-auth-mode.mjs";

describe("Edge E2E authentication mode", () => {
  it("uses credentials when email and password exist", () => {
    expect(selectEdgeAuthMode({ email: "viewer@example.test", password: "test-password" })).toBe("credentials");
  });

  it("prioritizes credentials over a simultaneous refresh token", () => {
    expect(selectEdgeAuthMode({ email: "viewer@example.test", password: "test-password", refreshToken: "test-refresh" })).toBe("credentials");
  });

  it("uses refresh only when credentials are absent", () => {
    expect(selectEdgeAuthMode({ refreshToken: "test-refresh" })).toBe("refresh");
  });

  it("rejects an empty configuration clearly", () => {
    expect(() => selectEdgeAuthMode({})).toThrow(/Define E2E_VIEWER_EMAIL/);
  });
});

describe("Edge E2E administrative role", () => {
  it("allows viewer", () => {
    expect(assertSupportedAdministrativeRole("viewer")).toBe("viewer");
  });

  it("allows admin", () => {
    expect(assertSupportedAdministrativeRole("admin")).toBe("admin");
  });

  it("rejects any other role", () => {
    expect(() => assertSupportedAdministrativeRole("supervisor")).toThrow(
      "La sesión E2E tiene un rol administrativo no soportado.",
    );
  });
});
