/**
 * Next.js Edge Middleware – authentication guard for the HRMS.
 *
 * Uses the NextAuth v5 `auth` helper (which runs on the Edge runtime) to
 * inspect the JWT session cookie.  Public paths are allowed through
 * unconditionally; all other routes require an authenticated session.
 *
 * Public paths:
 *   /login                – sign-in page
 *   /api/auth/*           – NextAuth internal endpoints
 *   /_next/*              – Next.js static/image assets
 *   /favicon.ico          – browser favicon
 *   /public/*             – static public assets served from /public
 */
import { auth } from "@/lib/auth-options"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Paths that are accessible without a session.
const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/public",
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/") || pathname.startsWith(prefix + "?")
  )
}

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl

  // Always allow public paths through.
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  // For protected paths, check the session embedded by the auth() wrapper.
  const session = (req as NextRequest & { auth: { user?: unknown } | null }).auth

  if (!session?.user) {
    // API routes: return 401 JSON instead of a redirect.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Page routes: redirect to the login page, preserving the original URL as
    // a `callbackUrl` query parameter so the user is sent back after login.
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  /*
   * Match every path EXCEPT:
   *   - _next/static  (static files)
   *   - _next/image   (image optimisation)
   *   - favicon.ico
   *   - public/*      (public directory assets)
   *
   * Note: /api/auth/* is matched but handled as a public path inside the
   * middleware function above.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
}
