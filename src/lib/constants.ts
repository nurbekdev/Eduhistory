import { Role } from "@prisma/client";

export const appConfig = {
  name: "Eduhistory",
  description: "Maktab fanlari, IT, robototexnika va 3D kurslar uchun zamonaviy LMS platforma",
  locale: "uz-UZ",
};

export const routeAccess: Record<string, Role[]> = {
  "/dashboard": [Role.STUDENT],
  "/mening-kurslarim": [Role.STUDENT],
  "/player": [Role.STUDENT],
  "/sertifikatlar": [Role.STUDENT, Role.ADMIN, Role.INSTRUCTOR],
  "/profil": [Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN],
  "/boshqaruv": [Role.ADMIN, Role.INSTRUCTOR],
};
