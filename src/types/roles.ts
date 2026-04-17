export type UserRole = "buyer" | "seller" | "driver" | "admin";

export function normalizeRole(role: unknown): UserRole | null {
  if (role === "buyer" || role === "driver" || role === "admin") return role;
  // Your DB uses `customer` for sellers today.
  if (role === "customer") return "seller";
  if (role === "seller") return "seller";
  return null;
}

