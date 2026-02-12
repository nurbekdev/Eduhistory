import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { hasRole, isManagementRole } from "@/lib/rbac";

describe("RBAC yordamchilari", () => {
  it("foydalanuvchi ruxsatini to'g'ri tekshiradi", () => {
    expect(hasRole(Role.ADMIN, [Role.ADMIN, Role.INSTRUCTOR])).toBe(true);
    expect(hasRole(Role.STUDENT, [Role.ADMIN, Role.INSTRUCTOR])).toBe(false);
  });

  it("management rolini aniqlaydi", () => {
    expect(isManagementRole(Role.ADMIN)).toBe(true);
    expect(isManagementRole(Role.INSTRUCTOR)).toBe(true);
    expect(isManagementRole(Role.STUDENT)).toBe(false);
  });
});
