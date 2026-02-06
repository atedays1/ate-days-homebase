import { createClient, createServiceClient } from "@/lib/supabase-server"

export interface AuthResult {
  user: {
    id: string
    email: string
    name?: string
  }
  access: {
    status: "approved" | "pending" | "denied"
    role: "admin" | "editor" | "viewer"
  }
}

/**
 * Require authenticated and approved user for API routes
 * Throws Response object if authentication fails
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Use service client to bypass RLS for access check
  const serviceClient = await createServiceClient()

  const { data: access, error: accessError } = await serviceClient
    .from("user_access")
    .select("status, role")
    .eq("email", user.email)
    .single()

  if (accessError || !access) {
    throw new Response(JSON.stringify({ error: "Access not found" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (access.status !== "approved") {
    throw new Response(JSON.stringify({ error: "Access pending or denied" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  return {
    user: {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name || user.user_metadata?.name,
    },
    access: {
      status: access.status,
      role: access.role,
    },
  }
}

/**
 * Require admin role for API routes
 */
export async function requireAdmin(): Promise<AuthResult> {
  const auth = await requireAuth()

  if (auth.access.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  return auth
}

/**
 * Get user access info (returns null if not found, doesn't throw)
 */
export async function getUserAccess(email: string) {
  const serviceClient = await createServiceClient()

  const { data, error } = await serviceClient
    .from("user_access")
    .select("*")
    .eq("email", email)
    .single()

  if (error) {
    return null
  }

  return data
}

/**
 * Create or update user access record
 */
export async function upsertUserAccess(
  email: string,
  data: {
    name?: string
    avatar_url?: string
    status?: "approved" | "pending" | "denied"
    role?: "admin" | "editor" | "viewer"
    approved_by?: string
  }
) {
  const serviceClient = await createServiceClient()

  const { data: result, error } = await serviceClient
    .from("user_access")
    .upsert(
      {
        email,
        ...data,
      },
      {
        onConflict: "email",
      }
    )
    .select()
    .single()

  if (error) {
    console.error("Error upserting user access:", error)
    throw error
  }

  return result
}
