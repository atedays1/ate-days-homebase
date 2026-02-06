import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase-middleware"

// Public routes that don't require authentication
const publicRoutes = ["/login", "/auth/callback", "/pending", "/denied", "/api/auth"]

// Routes that require admin role
const adminRoutes = ["/admin"]

export async function middleware(request: NextRequest) {
  try {
    const { response, user, supabase } = await updateSession(request)
    const pathname = request.nextUrl.pathname

    // Allow public routes
    if (publicRoutes.some(route => pathname.startsWith(route))) {
      return response
    }

    // Check if user is authenticated
    if (!user) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check user access status - wrapped in try/catch in case table doesn't exist
    try {
      const { data: userAccess, error } = await supabase
        .from("user_access")
        .select("status, role")
        .eq("email", user.email)
        .single()

      // If table doesn't exist or user has no record, allow through for now
      // The app will handle creating the record
      if (error) {
        console.log("user_access query error:", error.message)
        // If it's a "table doesn't exist" error, just let them through
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          return response
        }
        // For "no rows" error, redirect to pending
        if (error.code === "PGRST116") {
          return NextResponse.redirect(new URL("/pending", request.url))
        }
        // For other errors, let them through
        return response
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
      // On database errors, allow through - the app will handle it
      return response
    }

    return response
  } catch (error) {
    console.error("Middleware error:", error)
    // On any error, allow the request through
    return NextResponse.next()
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
     * - API routes that don't need auth
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
