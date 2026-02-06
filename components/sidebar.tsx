"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  MessageSquare,
  CalendarDays,
  Palette,
  DollarSign,
  FolderOpen,
  Crown,
  BarChart3,
  Users,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Founder View", href: "/founder", icon: Crown },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Knowledge Base", href: "/knowledge-base", icon: MessageSquare },
  { name: "Documents", href: "/documents", icon: FolderOpen },
  { name: "Timeline", href: "/timeline", icon: CalendarDays },
  { name: "Brand", href: "/brand-research", icon: Palette },
  { name: "Financial", href: "/financial", icon: DollarSign },
]

const adminNavigation = [
  { name: "User Management", href: "/admin/users", icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userAccess, signOut } = useAuth()

  const isAdmin = userAccess?.role === "admin"

  const handleSignOut = () => {
    // Clear localStorage items
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key)
      }
    })
    localStorage.removeItem('google_access_token')
    localStorage.removeItem('google_token_expiry')
    // Use server-side sign out to clear httpOnly cookies
    window.location.href = "/api/auth/signout"
  }

  return (
    <div className="relative z-10 flex h-full w-56 shrink-0 flex-col bg-[#0a0a0a] border-r border-white/[0.08]">
      {/* Logo / Brand */}
      <div className="flex h-14 items-center px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
            <span className="text-sm font-bold text-black">A</span>
          </div>
          <span className="text-[13px] font-medium tracking-tight text-white/90">
            AteDays Homebase
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2">
        <ul className="space-y-0.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                    isActive
                      ? "bg-white/[0.08] text-white"
                      : "text-white/60 hover:bg-white/[0.04] hover:text-white/90"
                  )}
                >
                  <item.icon className="h-4 w-4 opacity-70" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Admin Navigation */}
        {isAdmin && (
          <>
            <div className="my-3 border-t border-white/[0.06]" />
            <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white/30">
              Admin
            </p>
            <ul className="space-y-0.5">
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                        isActive
                          ? "bg-white/[0.08] text-white"
                          : "text-white/60 hover:bg-white/[0.04] hover:text-white/90"
                      )}
                    >
                      <item.icon className="h-4 w-4 opacity-70" />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </nav>

      {/* User / Footer */}
      <div className="border-t border-white/[0.06] px-3 py-3">
        {user && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white/70">
                {(user.email?.[0] || "U").toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-white/70">
                  {user.user_metadata?.name || user.email?.split("@")[0]}
                </p>
                {userAccess?.role && (
                  <p className="text-[9px] capitalize text-white/40">{userAccess.role}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="shrink-0 rounded p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white/70"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
        {!user && (
          <p className="text-[11px] text-white/30">Ate Days Supplements</p>
        )}
      </div>
    </div>
  )
}
