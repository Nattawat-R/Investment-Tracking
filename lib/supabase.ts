import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface UserProfile {
  id: string
  email: string
  display_name?: string
  preferred_currency?: "USD" | "THB"
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  symbol: string
  company_name?: string
  transaction_type: "BUY" | "SELL" | "DIVIDEND"
  shares: number
  price_per_share: number
  total_amount: number
  transaction_date: string
  notes?: string
  created_at: string
  updated_at: string
}

// Authentication functions
export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  try {
    console.log("Starting signup process for:", email)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split("@")[0],
        },
      },
    })

    if (error) {
      console.error("Signup error:", error)
      return { success: false, error: error.message }
    }

    console.log("Signup successful:", data)

    // If user is immediately confirmed, ensure profile exists
    if (data.user && data.user.email_confirmed_at) {
      const profileResult = await ensureUserProfile(
        data.user.id,
        data.user.email!,
        displayName || data.user.email!.split("@")[0],
      )

      if (!profileResult.success) {
        console.warn("Profile creation warning:", profileResult.error)
      }
    }

    return {
      success: true,
      data,
      message: data.user?.email_confirmed_at
        ? "Account created successfully! You can now sign in."
        : "Account created! Please check your email to verify your account.",
    }
  } catch (error: any) {
    console.error("Signup exception:", error)
    return { success: false, error: error.message || "Failed to create account" }
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    console.log("Starting signin process for:", email)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Signin error:", error)
      return { success: false, error: error.message }
    }

    console.log("Signin successful:", data)

    // Ensure user profile exists
    if (data.user) {
      const profileResult = await ensureUserProfile(
        data.user.id,
        data.user.email!,
        data.user.user_metadata?.display_name || data.user.email!.split("@")[0],
      )

      if (!profileResult.success) {
        console.warn("Profile creation warning:", profileResult.error)
      }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error("Signin exception:", error)
    return { success: false, error: error.message || "Failed to sign in" }
  }
}

export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, message: "Password reset email sent! Check your inbox." }
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to send reset email" }
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Sign out error:", error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (error: any) {
    console.error("Sign out exception:", error)
    return { success: false, error: error.message || "Failed to sign out" }
  }
}

export async function getCurrentUser() {
  try {
    // First check if there's an active session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Session error:", sessionError)
      return { success: false, error: sessionError.message, user: null }
    }

    if (!session) {
      return { success: true, user: null }
    }

    // Now get the user data
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error("Get user error:", userError)
      return { success: false, error: userError.message, user: null }
    }

    return { success: true, user }
  } catch (error: any) {
    console.error("Get current user exception:", error)
    return { success: false, error: error.message || "Failed to get current user", user: null }
  }
}

export async function ensureUserProfile(userId: string, email: string, displayName: string) {
  try {
    console.log("Ensuring user profile exists for:", userId)

    // First try to get existing profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (existingProfile) {
      console.log("Profile already exists:", existingProfile)
      return { success: true, profile: existingProfile }
    }

    // If profile doesn't exist, create it
    console.log("Creating new profile for:", userId)
    const { data: newProfile, error: insertError } = await supabase
      .from("user_profiles")
      .insert({
        id: userId,
        email: email,
        display_name: displayName,
        preferred_currency: "USD",
      })
      .select()
      .single()

    if (insertError) {
      console.error("Profile creation error:", insertError)
      return { success: false, error: insertError.message }
    }

    console.log("Profile created successfully:", newProfile)
    return { success: true, profile: newProfile }
  } catch (error: any) {
    console.error("Ensure profile exception:", error)
    return { success: false, error: error.message || "Failed to ensure user profile" }
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase.from("user_profiles").select("*").eq("id", userId).single()

    if (error) {
      console.error("Get user profile error:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Get user profile exception:", error)
    return null
  }
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  try {
    const { data, error } = await supabase.from("user_profiles").update(updates).eq("id", userId).select().single()

    if (error) {
      console.error("Update user profile error:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error("Update user profile exception:", error)
    return { success: false, error: error.message || "Failed to update profile" }
  }
}
