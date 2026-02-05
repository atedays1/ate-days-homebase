import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase-middleware"

// Public routes that don't require authentication
const publicRoutes = ["/login", "/auth/callback", "/pending", "/denied"]

// Routes that require admin role
const adminRoutes = ["/admin"]

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return response
  }

  // Allow API routes for auth callback
  if (pathname.startsWith("/api/auth")) {
    return response
  }

  // Check if user is authenticated
  if (!user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check user access status
  const { data: userAccess, error } = await supabase
    .from("user_access")
    .select("status, role")
    .eq("email", user.email)
    .single()

  // If user doesn't have an access record, they need to request access
  if (error || !userAccess) {
    // Redirect to pending page which will create the access request
    return NextResponse.redirect(new URL("/pending", request.url))
  }

  // Check if access is denied
  if (userAccess.status === "denied") {
    return NextResponse.redirect(new URL("/denied", request.url))
  }

  // Check if access is pending
  if (userAccess.status === "pending") {
    return NextResponse.redirect(new URL("/pending", request.url))
  }

  // Check admin routes
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (userAccess.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     * - API routes that don't need auth
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
