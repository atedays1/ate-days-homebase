"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { createClient } from "@/lib/supabase-browser"
import { User } from "@supabase/supabase-js"

interface UserAccess {
  id?: string
  email: string
  name?: string | null
  avatar_url?: string | null
  status: "approved" | "pending" | "denied"
  role: "admin" | "editor" | "viewer"
  requested_at?: string
  approved_at?: string | null
  approved_by?: string | null
}

interface AuthContextType {
  user: User | null
  userAccess: UserAccess | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => void
  refreshUserAccess: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
  initialUser?: {
    id: string
    email: string
    user_metadata?: Record<string, unknown>
  } | null
  initialAccess?: {
    status: "approved" | "pending" | "denied"
    role: "admin" | "editor" | "viewer"
  } | null
}

export function AuthProvider({ children, initialUser, initialAccess }: AuthProviderProps) {
  // Convert initial user to User-like object
  const [user, setUser] = useState<User | null>(
    initialUser ? ({ ...initialUser } as unknown as User) : null
  )
  const [userAccess, setUserAccess] = useState<UserAccess | null>(
    initialUser && initialAccess
      ? { email: initialUser.email, ...initialAccess }
      : null
  )
  const [loading, setLoading] = useState(!initialUser) // Not loading if we have initial data
  const [supabase] = useState(() => createClient())

  const fetchUserAccess = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from("user_access")
        .select("*")
        .eq("email", email)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user access:", error)
      }

      return data as UserAccess | null
    } catch (err) {
      console.error("Error fetching user access:", err)
      return null
    }
  }

  const refreshUserAccess = async () => {
    if (user?.email) {
      const access = await fetchUserAccess(user.email)
      setUserAccess(access)
    }
  }

  useEffect(() => {
    // If we have initial user, we're already set up
    if (initialUser) {
      return
    }

    let mounted = true

    const initializeAuth = async () => {
      try {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser()

        if (error && !error.message?.includes("abort") && !error.message?.includes("session")) {
          console.error("Error getting user:", error)
        }

        if (mounted && currentUser) {
          setUser(currentUser)

          if (currentUser.email) {
            const access = await fetchUserAccess(currentUser.email)
            if (mounted) setUserAccess(access)
          }
        }

        if (mounted) setLoading(false)
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error initializing auth:", error)
        }
        if (mounted) setLoading(false)
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      try {
        const newUser = session?.user ?? null
        setUser(newUser)

        if (newUser?.email) {
          const access = await fetchUserAccess(newUser.email)
          if (mounted) setUserAccess(access)
        } else {
          setUserAccess(null)
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error in auth state change:", error)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, initialUser])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    })

    if (error) {
      console.error("Error signing in with Google:", error)
      throw error
    }
  }

  const signOut = () => {
    setUser(null)
    setUserAccess(null)
    window.location.href = "/api/auth/signout"
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userAccess,
        loading,
        signInWithGoogle,
        signOut,
        refreshUserAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
