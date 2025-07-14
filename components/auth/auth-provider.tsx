"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase, getCurrentUser, signOut as supabaseSignOut } from "@/lib/supabase"

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const getInitialSession = async () => {
    try {
      console.log("Getting initial session...")
      const result = await getCurrentUser()

      if (result.success) {
        setUser(result.user)
        console.log("Initial session loaded:", result.user?.email)
      } else {
        console.error("Failed to get initial session:", result.error)
        setUser(null)
      }
    } catch (error) {
      console.error("Initial session error:", error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Get initial session
    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email)

      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        setUser(session.user)
      }

      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    try {
      setLoading(true)
      const result = await supabaseSignOut()
      if (result.success) {
        setUser(null)
      } else {
        console.error("Sign out error:", result.error)
      }
    } catch (error) {
      console.error("Sign out exception:", error)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    loading,
    signOut: handleSignOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
