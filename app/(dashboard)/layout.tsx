import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase-server"
import { DashboardShell } from "@/components/dashboard-shell"
import { AuthProvider } from "@/lib/auth-context"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If no user (shouldn't happen due to middleware, but double-check)
  if (!user) {
    redirect("/login")
  }

  // Use service client to bypass RLS for user_access lookup
  const serviceClient = await createServiceClient()
  
  // Check user_access status in the database
  const { data: userAccess, error } = await serviceClient
    .from("user_access")
    .select("status, role")
    .eq("email", user.email?.toLowerCase())
    .single()

  // Handle case where user_access table doesn't exist yet (first-time setup)
  if (error && error.code !== "PGRST116" && !error.message?.includes("does not exist")) {
    console.error("Error checking user access:", error)
  }

  // If no access record or pending status, redirect to pending page
  if (!userAccess || userAccess.status === "pending") {
    redirect("/pending")
  }

  // If access is denied, redirect to denied page
  if (userAccess.status === "denied") {
    redirect("/denied")
  }

  // Pass server-side auth data to client-side AuthProvider
  const initialUser = {
    id: user.id,
    email: user.email!,
    user_metadata: user.user_metadata,
  }

  const initialAccess = {
    status: userAccess.status as "approved" | "pending" | "denied",
    role: userAccess.role as "admin" | "editor" | "viewer",
  }

  return (
    <AuthProvider initialUser={initialUser} initialAccess={initialAccess}>
      <DashboardShell>
        {children}
      </DashboardShell>
    </AuthProvider>
  )
}
