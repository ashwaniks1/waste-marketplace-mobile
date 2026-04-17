import { describe, expect, it } from "vitest";
import { normalizeRole } from "./roles";

describe("normalizeRole", () => {
  it("maps customer to seller", () => {
    expect(normalizeRole("customer")).toBe("seller");
  });

  it("passes through buyer, driver, admin", () => {
    expect(normalizeRole("buyer")).toBe("buyer");
    expect(normalizeRole("driver")).toBe("driver");
    expect(normalizeRole("admin")).toBe("admin");
  });

  it("returns null for unknown", () => {
    expect(normalizeRole("hacker")).toBeNull();
    expect(normalizeRole(null)).toBeNull();
  });
});
