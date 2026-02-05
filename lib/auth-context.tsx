"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { createClient } from "@/lib/supabase-browser"
import { User, Session } from "@supabase/supabase-js"

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
  session: Session | null
  userAccess: UserAccess | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshUserAccess: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userAccess, setUserAccess] = useState<UserAccess | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

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
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        
        setSession(initialSession)
        setUser(initialSession?.user ?? null)

        if (initialSession?.user?.email) {
          const access = await fetchUserAccess(initialSession.user.email)
          setUserAccess(access)
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user?.email) {
          const access = await fetchUserAccess(newSession.user.email)
          setUserAccess(access)
        } else {
          setUserAccess(null)
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

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

  const signOut = async () => {
    // Clear local state first
    setUser(null)
    setSession(null)
    setUserAccess(null)
    
    // Try to sign out from Supabase (use local scope to avoid lock issues)
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch (error) {
      // Ignore errors - we've already cleared local state
      console.log("Sign out completed with warning:", error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
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
