import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { routeAccess } from "@/lib/constants";

const authPages = ["/kirish", "/royxatdan-otish"];
const publicPrefixes = ["/", "/kurslar", "/sertifikat", "/api/auth"];

function isPublicPath(pathname: string) {
  return publicPrefixes.some((prefix) => {
    if (prefix === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(prefix);
  });
}

function getAllowedRoles(pathname: string): Role[] | null {
  const entry = Object.entries(routeAccess).find(([prefix]) => pathname.startsWith(prefix));
  return entry ? entry[1] : null;
}

function getDefaultRouteByRole(role: Role | undefined) {
  if (role === Role.ADMIN || role === Role.INSTRUCTOR) {
    return "/boshqaruv";
  }
  return "/dashboard";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (authPages.includes(pathname) && token) {
    const role = token.role as Role | undefined;
    return NextResponse.redirect(new URL(getDefaultRouteByRole(role), request.url));
  }

  const allowedRoles = getAllowedRoles(pathname);
  if (!allowedRoles && isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (allowedRoles && !token) {
    const loginUrl = new URL("/kirish", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (allowedRoles && token) {
    const role = token.role as Role | undefined;
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.redirect(new URL("/403", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
