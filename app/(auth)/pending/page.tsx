"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Clock, LogOut, RefreshCw, Loader2 } from "lucide-react"

export default function PendingPage() {
  const { user, userAccess, loading, signOut, refreshUserAccess } = useAuth()
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!loading && !user) {
      router.push("/login")
      return
    }

    // If approved, redirect to home
    if (!loading && userAccess?.status === "approved") {
      router.push("/")
      return
    }

    // If denied, redirect to denied page
    if (!loading && userAccess?.status === "denied") {
      router.push("/denied")
      return
    }

    // If user is authenticated but has no access record, create one
    if (!loading && user && !userAccess) {
      createAccessRequest()
    }
  }, [user, userAccess, loading, router])

  const createAccessRequest = async () => {
    if (!user?.email) return

    try {
      await fetch("/api/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name,
        }),
      })
      await refreshUserAccess()
    } catch (err) {
      console.error("Failed to create access request:", err)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshUserAccess()
    setIsRefreshing(false)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
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

        {user && (
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm text-neutral-600">
              Signed in as <span className="font-medium">{user.email}</span>
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
