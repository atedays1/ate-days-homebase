import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

/**
 * Helper function to perform sign-out using modern Supabase SSR API
 */
async function performSignOut() {
  const cookieStore = cookies()
  
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

  // Sign out from Supabase
  await supabase.auth.signOut()

  // Belt and suspenders: Explicitly delete all Supabase auth cookies
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  
  const cookieNames = [
    `sb-${projectRef}-auth-token`,
    `sb-${projectRef}-auth-token-code-verifier`,
  ]

  // Delete cookies by setting them with maxAge: 0
  for (const name of cookieNames) {
    try {
      cookieStore.set(name, '', { 
        maxAge: 0,
        path: '/',
      })
    } catch (e) {
      // Cookie may not exist, ignore errors
    }
  }
}

export async function POST() {
  await performSignOut()
  return NextResponse.json({ success: true })
}

export async function GET() {
  await performSignOut()
  // Redirect to login after sign out
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002"))
}
