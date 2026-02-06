"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { createClient } from "@/lib/supabase-browser"
import { User } from "@supabase/supabase-js"

interface UserAccess {
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

interface AuthContextType {
  user: User | null
  userAccess: UserAccess | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => void
  refreshUserAccess: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userAccess, setUserAccess] = useState<UserAccess | null>(null)
  const [loading, setLoading] = useState(true)
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
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Use getUser() instead of getSession() - more reliable
        const { data: { user: currentUser }, error } = await supabase.auth.getUser()
        
        if (error) {
          // Don't log AbortError - it's expected in some cases
          if (!error.message?.includes("abort")) {
            console.error("Error getting user:", error)
          }
        }

        if (mounted) {
          setUser(currentUser)
          
          if (currentUser?.email) {
            const access = await fetchUserAccess(currentUser.email)
            if (mounted) setUserAccess(access)
          }
          
          setLoading(false)
        }
      } catch (error: unknown) {
        // Ignore AbortError - it's a known Supabase issue
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Auth initialization aborted (expected in some cases)")
        } else {
          console.error("Error initializing auth:", error)
        }
        if (mounted) setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes with error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
          // Ignore AbortError
          if (error instanceof Error && error.name === "AbortError") {
            return
          }
          console.error("Error in auth state change:", error)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

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
    // Clear local state
    setUser(null)
    setUserAccess(null)
    
    // Redirect to server-side sign-out endpoint
    // This properly clears httpOnly cookies
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
