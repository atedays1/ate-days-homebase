"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { XCircle, LogOut, Loader2 } from "lucide-react"

export default function DeniedPage() {
  const { user, userAccess, loading, signOut } = useAuth()
  const router = useRouter()

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

    // If pending, redirect to pending page
    if (!loading && userAccess?.status === "pending") {
      router.push("/pending")
      return
    }
  }, [user, userAccess, loading, router])

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
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Your request to access AteDays Homebase has been denied.
            <br />
            Please contact an administrator if you believe this is an error.
          </p>
        </div>

        {user && (
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm text-neutral-600">
              Signed in as <span className="font-medium">{user.email}</span>
            </p>
          </div>
        )}

        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 shadow-sm transition-all hover:bg-neutral-50"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>

        <p className="text-xs text-neutral-400">
          Questions? Contact chris.morell@atedays.com
        </p>
      </div>
    </div>
  )
}
