import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate: send visitors without a session cookie straight to the login page.
// Real authorisation happens on the server in every admin page and action.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !request.cookies.has("pahad_session")) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
