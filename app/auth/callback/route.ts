import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const redirect = requestUrl.searchParams.get("redirect") || "/"

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Exchange code for session
    const {
      data: { user },
      error,
    } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Auth callback error:", error)
      return NextResponse.redirect(
        new URL("/login?error=auth_failed", requestUrl.origin)
      )
    }

    if (user?.email) {
      // Use service role to manage user access
      const serviceClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll() {
              return []
            },
            setAll() {},
          },
        }
      )

      // Check if user already has access record
      const { data: existingAccess } = await serviceClient
        .from("user_access")
        .select("*")
        .eq("email", user.email)
        .single()

      if (!existingAccess) {
        // Check if email is from @atedays.com domain
        const isAteDaysEmail = user.email.toLowerCase().endsWith("@atedays.com")

        // Create access record
        const accessData = {
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          status: isAteDaysEmail ? "approved" : "pending",
          role: isAteDaysEmail ? "editor" : "viewer",
        }

        await serviceClient.from("user_access").insert(accessData)

        // If not an @atedays.com email, send notification to admin
        if (!isAteDaysEmail) {
          try {
            await fetch(
              new URL("/api/access-request", requestUrl.origin).toString(),
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: user.email,
                  name: accessData.name,
                }),
              }
            )
          } catch (err) {
            console.error("Failed to send access request notification:", err)
          }
        }
      }
    }
  }

  // Redirect to the intended destination or home
  return NextResponse.redirect(new URL(redirect, requestUrl.origin))
}
