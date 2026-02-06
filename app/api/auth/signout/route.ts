import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

/**
 * Helper function to perform sign-out
 * Clears Supabase auth cookies properly
 */
async function performSignOut() {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          // FIX: Properly delete cookies instead of setting to empty string
          cookieStore.delete(name)
        },
      },
    }
  )

  // Sign out from Supabase (this triggers the remove() callback for auth cookies)
  await supabase.auth.signOut()

  // Belt and suspenders: Explicitly delete all known Supabase auth cookies
  // This ensures cookies are removed even if signOut() doesn't trigger remove() for some reason
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  
  const cookieNames = [
    `sb-${projectRef}-auth-token`,
    `sb-${projectRef}-auth-token-code-verifier`,
  ]

  for (const name of cookieNames) {
    try {
      cookieStore.delete(name)
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
