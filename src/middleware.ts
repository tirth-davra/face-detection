import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Home page (/) is now accessible to everyone - no authentication required
  if (pathname === "/") {
    return NextResponse.next();
  }

  // If user is on login page and already authenticated, redirect to main page
  if (pathname === "/login") {
    const isAuthenticated =
      request.cookies.get("isAuthenticated")?.value === "true";

    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Protect add-new-face page - requires authentication
  if (pathname === "/add-new-face") {
    const isAuthenticated =
      request.cookies.get("isAuthenticated")?.value === "true";
    const isAdmin = request.cookies.get("isAdmin")?.value === "true";

    if (!isAuthenticated || !isAdmin) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/add-new-face"],
};
