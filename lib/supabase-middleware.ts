import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not run code between createServerClient and getClaims()
  // A simple mistake could make it very hard to debug issues with users being randomly logged out.
  
  // getClaims() validates the JWT signature against Supabase's public keys
  // This is more secure than getUser() for server-side validation
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims ? { 
    email: data.claims.email as string | undefined,
    id: data.claims.sub as string,
    user_metadata: data.claims.user_metadata as Record<string, unknown> | undefined
  } : null

  return { response: supabaseResponse, user, supabase }
}
