import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase-middleware"

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  // Public routes - no auth needed
  if (
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth") ||
    request.nextUrl.pathname.startsWith("/pending") ||
    request.nextUrl.pathname.startsWith("/denied") ||
    request.nextUrl.pathname.startsWith("/api/auth")
  ) {
    return supabaseResponse
  }

  // No user = redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // IMPORTANT: Must return supabaseResponse for cookie sync
  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
