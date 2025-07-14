import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
})

// Types
export interface UserProfile {
  id: string
  user_id: string
  email: string
  display_name?: string
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

// Enhanced error message mapping
function getDetailedErrorMessage(error: any): string {
  const errorCode = error.code || error.error_code
  const errorMessage = error.message || error.error_description || ""

  console.log("Error details:", { errorCode, errorMessage, fullError: error })

  // Map specific error codes to user-friendly messages
  switch (errorCode) {
    case "invalid_credentials":
      return "Invalid email or password. Please check your credentials and try again."

    case "email_not_confirmed":
      return "Please verify your email address before signing in. Check your inbox for the verification code."

    case "too_many_requests":
      return "Too many login attempts. Please wait a few minutes before trying again."

    case "signup_disabled":
      return "New account registration is currently disabled. Please contact support."

    case "email_address_invalid":
      return "Please enter a valid email address."

    case "password_too_short":
      return "Password must be at least 6 characters long."

    case "weak_password":
      return "Password is too weak. Please use a stronger password with letters, numbers, and symbols."

    case "email_address_not_authorized":
      return "This email address is not authorized to create an account."

    case "user_not_found":
      return "No account found with this email address. Please check your email or create a new account."

    default:
      // Check for common error message patterns
      if (errorMessage.toLowerCase().includes("invalid login credentials")) {
        return "Invalid email or password. Please check your credentials and try again."
      }

      if (errorMessage.toLowerCase().includes("email not confirmed")) {
        return "Please verify your email address before signing in. Check your inbox for the verification code."
      }

      if (errorMessage.toLowerCase().includes("user not found")) {
        return "No account found with this email address. Please check your email or create a new account."
      }

      if (errorMessage.toLowerCase().includes("invalid email")) {
        return "Please enter a valid email address."
      }

      if (errorMessage.toLowerCase().includes("password")) {
        return "Password issue: " + errorMessage
      }

      // Return the original message if we can't map it
      return errorMessage || "An unexpected error occurred. Please try again."
  }
}

// Authentication functions with enhanced error handling
export async function signUpWithEmail(email: string, password: string, displayName?: string, rememberMe = false) {
  try {
    console.log("Starting signup process for:", email)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split("@")[0],
        },
        emailRedirectTo: undefined, // We'll use OTP instead
      },
    })

    if (error) {
      console.error("Signup error:", error)
      return {
        success: false,
        error: getDetailedErrorMessage(error),
        needsVerification: error.message?.includes("confirm") || error.message?.includes("verify"),
      }
    }

    console.log("Signup successful:", data)

    // Set session persistence based on remember me
    if (rememberMe && data.session) {
      localStorage.setItem("supabase.auth.remember", "true")
    }

    return {
      success: true,
      data,
      needsVerification: !data.session, // If no session, verification is needed
      message: data.session
        ? "Account created successfully! You are now signed in."
        : "Account created! Please check your email and enter the verification code.",
    }
  } catch (error: any) {
    console.error("Signup exception:", error)
    return {
      success: false,
      error: getDetailedErrorMessage(error),
    }
  }
}

export async function signInWithEmail(email: string, password: string, rememberMe = false) {
  try {
    console.log("Starting signin process for:", email)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Signin error:", error)
      return {
        success: false,
        error: getDetailedErrorMessage(error),
        needsVerification: error.message?.includes("confirm") || error.message?.includes("verify"),
      }
    }

    console.log("Signin successful:", data)

    // Set session persistence based on remember me
    if (rememberMe) {
      localStorage.setItem("supabase.auth.remember", "true")
    } else {
      localStorage.removeItem("supabase.auth.remember")
    }

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
    return {
      success: false,
      error: getDetailedErrorMessage(error),
    }
  }
}

export async function verifyOTP(email: string, token: string) {
  try {
    console.log("Verifying OTP for:", email)

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    })

    if (error) {
      console.error("OTP verification error:", error)
      return {
        success: false,
        error: getDetailedErrorMessage(error),
      }
    }

    console.log("OTP verification successful:", data)

    // Ensure user profile exists after verification
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
    console.error("OTP verification exception:", error)
    return {
      success: false,
      error: getDetailedErrorMessage(error),
    }
  }
}

export async function resendVerificationCode(email: string) {
  try {
    console.log("Resending verification code to:", email)

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
    })

    if (error) {
      console.error("Resend verification error:", error)
      return {
        success: false,
        error: getDetailedErrorMessage(error),
      }
    }

    return {
      success: true,
      message: "Verification code sent! Please check your email.",
    }
  } catch (error: any) {
    console.error("Resend verification exception:", error)
    return {
      success: false,
      error: getDetailedErrorMessage(error),
    }
  }
}

export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      return {
        success: false,
        error: getDetailedErrorMessage(error),
      }
    }

    return { success: true, message: "Password reset email sent! Check your inbox." }
  } catch (error: any) {
    return {
      success: false,
      error: getDetailedErrorMessage(error),
    }
  }
}

export async function signOut() {
  try {
    // Clear remember me preference
    localStorage.removeItem("rememberUser")

    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Sign out error:", error)
      return { success: false, error: error.message }
    }
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Sign out exception:", error)
    return { success: false, error: "Failed to sign out" }
  }
}

export async function getCurrentUser() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error("Error getting current user:", error)
      return { success: false, error: error.message, user: null }
    }

    return { success: true, error: null, user }
  } catch (error) {
    console.error("Exception getting current user:", error)
    return { success: false, error: "Failed to get user", user: null }
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase.from("user_profiles").select("*").eq("user_id", userId).single()

    if (error) {
      console.error("Error getting user profile:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Exception getting user profile:", error)
    return null
  }
}

export async function ensureUserProfile(
  userId: string,
  email: string,
  displayName?: string,
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert({
        user_id: userId,
        email,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating user profile:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Exception creating user profile:", error)
    return null
  }
}

// Check if user wants to be remembered
export function shouldRememberUser(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem("rememberUser") === "true"
}
