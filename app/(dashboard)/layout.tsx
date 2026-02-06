import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { Sidebar } from "@/components/sidebar"
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

  // Check user_access status in the database
  const { data: userAccess, error } = await supabase
    .from("user_access")
    .select("status, role")
    .eq("email", user.email)
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

  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden bg-white">
        <Sidebar />
        <main className="relative flex-1 overflow-auto bg-[#fafafa]">
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}
