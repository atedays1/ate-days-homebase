import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  // Get the base URL for redirect
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002"
  
  // Create redirect response
  const response = NextResponse.redirect(new URL("/login", baseUrl))

  // Get project ref for cookie names
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const projectRef = supabaseUrl ? new URL(supabaseUrl).hostname.split(".")[0] : ""

  // Cookie deletion options - be aggressive with settings
  const deleteOptions = {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  }

  // Delete cookies by setting them with immediate expiration on the RESPONSE
  const cookieNames = [
    `sb-${projectRef}-auth-token`,
    `sb-${projectRef}-auth-token-code-verifier`,
    `sb-${projectRef}-auth-token.0`,
    `sb-${projectRef}-auth-token.1`,
  ]

  for (const name of cookieNames) {
    response.cookies.set(name, "", deleteOptions)
  }

  // Also try to read all cookies and delete any sb- ones
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    for (const cookie of allCookies) {
      if (cookie.name.startsWith("sb-")) {
        response.cookies.set(cookie.name, "", deleteOptions)
      }
    }
  } catch {
    // Ignore errors reading cookies
  }

  return response
}

export async function POST() {
  const response = NextResponse.json({ success: true })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const projectRef = supabaseUrl ? new URL(supabaseUrl).hostname.split(".")[0] : ""

  const deleteOptions = {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  }

  const cookieNames = [
    `sb-${projectRef}-auth-token`,
    `sb-${projectRef}-auth-token-code-verifier`,
    `sb-${projectRef}-auth-token.0`,
    `sb-${projectRef}-auth-token.1`,
  ]

  for (const name of cookieNames) {
    response.cookies.set(name, "", deleteOptions)
  }

  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    for (const cookie of allCookies) {
      if (cookie.name.startsWith("sb-")) {
        response.cookies.set(cookie.name, "", deleteOptions)
      }
    }
  } catch {
    // Ignore
  }

  return response
}
