import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase-middleware"

// Public routes that don't require authentication
const publicRoutes = ["/login", "/auth/callback", "/pending", "/denied", "/api/auth"]

// Routes that require admin role
const adminRoutes = ["/admin"]

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Allow public routes immediately (before any Supabase calls)
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  try {
    const { response, user, supabase } = await updateSession(request)

    // CRITICAL: If no user, ALWAYS redirect to login
    // Do NOT allow through on error - that's a security hole
    if (!user) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check user access status
    try {
      const { data: userAccess, error } = await supabase
        .from("user_access")
        .select("status, role")
        .eq("email", user.email)
        .single()

      if (error) {
        console.log("user_access query error:", error.message, error.code)
        
        // If table doesn't exist, let them through (first-time setup)
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          return response
        }
        
        // No record found - redirect to pending
        if (error.code === "PGRST116") {
          return NextResponse.redirect(new URL("/pending", request.url))
        }
        
        // Other errors - still redirect to pending (safer than letting through)
        return NextResponse.redirect(new URL("/pending", request.url))
      }

      if (!userAccess) {
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
    } catch (dbError) {
      console.error("Database error in middleware:", dbError)
      // On database errors, redirect to pending (safer than allowing access)
      return NextResponse.redirect(new URL("/pending", request.url))
    }

    return response
  } catch (error) {
    console.error("Middleware error:", error)
    // CRITICAL: On any error, redirect to login - do NOT allow through
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
