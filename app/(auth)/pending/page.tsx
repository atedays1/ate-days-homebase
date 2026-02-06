"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase-browser"
import { Clock, LogOut, RefreshCw, Loader2 } from "lucide-react"

export default function PendingPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          window.location.href = "/login"
          return
        }

        setUserEmail(user.email || null)

        // Check user_access status
        const { data: access } = await supabase
          .from("user_access")
          .select("status")
          .eq("email", user.email)
          .single()

        if (access?.status === "approved") {
          window.location.href = "/"
          return
        }

        if (access?.status === "denied") {
          window.location.href = "/denied"
          return
        }

        setStatus(access?.status || "pending")
        setLoading(false)
      } catch (error) {
        console.error("Error checking status:", error)
        setLoading(false)
      }
    }

    checkStatus()
  }, [supabase])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data: access } = await supabase
        .from("user_access")
        .select("status")
        .eq("email", user.email)
        .single()

      if (access?.status === "approved") {
        window.location.href = "/"
        return
      }

      if (access?.status === "denied") {
        window.location.href = "/denied"
        return
      }

      setStatus(access?.status || "pending")
    } catch (error) {
      console.error("Error refreshing status:", error)
    }
    
    setIsRefreshing(false)
  }

  const handleSignOut = () => {
    window.location.href = "/api/auth/signout"
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
      <div className="w-full max-w-md space-y-8 px-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <Clock className="h-8 w-8 text-amber-600" />
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Access Request Pending
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Your request to access AteDays Homebase has been submitted.
            <br />
            An admin will review your request shortly.
          </p>
        </div>

        {userEmail && (
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm text-neutral-600">
              Signed in as <span className="font-medium">{userEmail}</span>
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Check Status
          </button>

          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 shadow-sm transition-all hover:bg-neutral-50"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        <p className="text-xs text-neutral-400">
          Need immediate access? Contact chris.morell@atedays.com
        </p>
      </div>
    </div>
  )
}
