import { describe, expect, it } from "vitest";
import { userDate, userInitials } from "./user-format";

describe("user formatting", () => {
  it("builds stable initials", () => {
    expect(userInitials("  María López García ")).toBe("ML");
    expect(userInitials(" ")).toBe("?");
  });

  it("handles missing activity", () => {
    expect(userDate()).toBe("Sin actividad");
  });
});
