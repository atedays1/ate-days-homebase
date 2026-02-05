import { Sidebar } from "@/components/sidebar"
import { AuthProvider } from "@/lib/auth-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
