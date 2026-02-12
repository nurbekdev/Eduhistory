import { Role } from "@prisma/client";

export function hasRole(userRole: Role | undefined, allowedRoles: Role[]) {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

export function isManagementRole(role: Role | undefined) {
  return role === Role.ADMIN || role === Role.INSTRUCTOR;
}
