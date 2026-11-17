import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate: send visitors without a session cookie straight to the login page.
// Real authorisation happens on the server in every admin page and action.
// Pages for people who aren't signed in yet.
const PUBLIC_ADMIN = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ADMIN.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (pathname.startsWith("/admin") && !isPublic && !request.cookies.has("pahad_session")) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
