"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { 
  Users, 
  Check, 
  X, 
  Clock, 
  Shield, 
  Edit2, 
  Loader2,
  RefreshCw,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"

interface UserAccessRecord {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  status: "approved" | "pending" | "denied"
  role: "admin" | "editor" | "viewer"
  requested_at: string
  approved_at: string | null
  approved_by: string | null
}

export default function AdminUsersPage() {
  const { user, userAccess, loading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserAccessRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && (!user || userAccess?.role !== "admin")) {
      router.push("/")
      return
    }

    if (user && userAccess?.role === "admin") {
      fetchUsers()
    }
  }, [user, userAccess, loading, router])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (err) {
      console.error("Failed to fetch users:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const updateUserStatus = async (email: string, status: "approved" | "denied") => {
    setIsUpdating(email)
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, status }),
      })
      
      if (response.ok) {
        await fetchUsers()
      }
    } catch (err) {
      console.error("Failed to update user:", err)
    } finally {
      setIsUpdating(null)
    }
  }

  const updateUserRole = async (email: string, role: "admin" | "editor" | "viewer") => {
    setIsUpdating(email)
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      })
      
      if (response.ok) {
        await fetchUsers()
      }
    } catch (err) {
      console.error("Failed to update user role:", err)
    } finally {
      setIsUpdating(null)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  const pendingUsers = users.filter(u => u.status === "pending")
  const approvedUsers = users.filter(u => u.status === "approved")
  const deniedUsers = users.filter(u => u.status === "denied")

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div className="h-6 w-px bg-neutral-200" />
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-neutral-700" />
              <h1 className="text-xl font-semibold text-neutral-900">User Management</h1>
            </div>
          </div>
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Pending Requests */}
        {pendingUsers.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-neutral-700">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Requests ({pendingUsers.length})
            </h2>
            <div className="space-y-3">
              {pendingUsers.map(u => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 text-amber-700">
                        {(u.name || u.email)[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-neutral-900">{u.name || "Unknown"}</p>
                      <p className="text-sm text-neutral-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateUserStatus(u.email, "approved")}
                      disabled={isUpdating === u.email}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {isUpdating === u.email ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => updateUserStatus(u.email, "denied")}
                      disabled={isUpdating === u.email}
                      className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {isUpdating === u.email ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Approved Users */}
        <section className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-neutral-700">
            <Check className="h-4 w-4 text-green-500" />
            Approved Users ({approvedUsers.length})
          </h2>
          {approvedUsers.length === 0 ? (
            <p className="text-sm text-neutral-500">No approved users yet</p>
          ) : (
            <div className="space-y-2">
              {approvedUsers.map(u => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4"
                >
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-neutral-600">
                        {(u.name || u.email)[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-neutral-900">{u.name || "Unknown"}</p>
                        {u.role === "admin" && (
                          <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                            Admin
                          </span>
                        )}
                        {u.role === "editor" && (
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            Editor
                          </span>
                        )}
                        {u.role === "viewer" && (
                          <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                            Viewer
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={u.role}
                      onChange={(e) => updateUserRole(u.email, e.target.value as "admin" | "editor" | "viewer")}
                      disabled={isUpdating === u.email || u.email === user?.email}
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    {u.email !== user?.email && (
                      <button
                        onClick={() => updateUserStatus(u.email, "denied")}
                        disabled={isUpdating === u.email}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Denied Users */}
        {deniedUsers.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-neutral-700">
              <X className="h-4 w-4 text-red-500" />
              Denied Users ({deniedUsers.length})
            </h2>
            <div className="space-y-2">
              {deniedUsers.map(u => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4 opacity-75"
                >
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full grayscale" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-300 text-neutral-500">
                        {(u.name || u.email)[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-neutral-700">{u.name || "Unknown"}</p>
                      <p className="text-sm text-neutral-500">{u.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateUserStatus(u.email, "approved")}
                    disabled={isUpdating === u.email}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
