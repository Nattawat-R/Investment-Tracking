import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Auth helper functions
export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split("@")[0],
        },
      },
    })

    return { success: !error, data, error: error?.message }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    return { success: !error, data, error: error?.message }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function verifyOTP(email: string, token: string) {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    })

    return { success: !error, data, error: error?.message }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function resendOTP(email: string) {
  try {
    const { data, error } = await supabase.auth.resend({
      type: "signup",
      email,
    })

    return { success: !error, data, error: error?.message }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    return { success: !error, error: error?.message }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export function getAuthErrorMessage(error: string): string {
  const errorMessages: { [key: string]: string } = {
    "Invalid login credentials": "Invalid email or password. Please check your credentials and try again.",
    "Email not confirmed": "Please verify your email address before signing in.",
    "User not found": "No account found with this email address.",
    "Invalid email": "Please enter a valid email address.",
    "Password should be at least 6 characters": "Password must be at least 6 characters long.",
    "User already registered": "An account with this email already exists.",
    "Invalid token": "Invalid or expired verification code. Please try again.",
    "Token has expired": "Verification code has expired. Please request a new one.",
    "Email rate limit exceeded": "Too many emails sent. Please wait before requesting another code.",
  }

  return errorMessages[error] || error || "An unexpected error occurred. Please try again."
}
