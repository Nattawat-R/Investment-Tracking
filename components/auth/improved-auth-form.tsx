"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface AuthFormProps {
  onSuccess?: () => void
}

type AuthMode = "signin" | "signup" | "verify"

interface AuthError {
  message: string
  type: "error" | "success" | "info"
}

// Enhanced error message mapping
const getErrorMessage = (error: any): string => {
  const message = error?.message?.toLowerCase() || ""

  if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
    return "Invalid email or password. Please check your credentials and try again."
  }
  if (message.includes("email not confirmed")) {
    return "Please verify your email address before signing in."
  }
  if (message.includes("invalid email")) {
    return "Please enter a valid email address."
  }
  if (message.includes("password should be at least")) {
    return "Password must be at least 6 characters long."
  }
  if (message.includes("user not found")) {
    return "No account found with this email address."
  }
  if (message.includes("email already registered") || message.includes("user already registered")) {
    return "An account with this email already exists. Please sign in instead."
  }
  if (message.includes("too many requests")) {
    return "Too many attempts. Please wait a few minutes before trying again."
  }
  if (message.includes("signup disabled")) {
    return "New account registration is currently disabled."
  }
  if (message.includes("invalid verification code") || message.includes("otp")) {
    return "Invalid verification code. Please check the code and try again."
  }
  if (message.includes("expired")) {
    return "Verification code has expired. Please request a new one."
  }

  return error?.message || "An unexpected error occurred. Please try again."
}

export default function ImprovedAuthForm({ onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""])
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6).split("")
      const newCode = [...verificationCode]
      pastedCode.forEach((char, i) => {
        if (index + i < 6) {
          newCode[index + i] = char
        }
      })
      setVerificationCode(newCode)

      // Focus on the last filled input or next empty one
      const nextIndex = Math.min(index + pastedCode.length, 5)
      const nextInput = document.getElementById(`otp-${nextIndex}`)
      nextInput?.focus()
    } else {
      const newCode = [...verificationCode]
      newCode[index] = value
      setVerificationCode(newCode)

      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`)
        nextInput?.focus()
      }
    }
  }

  // Handle OTP backspace
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  // Start resend cooldown
  const startResendCooldown = () => {
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError({ message: getErrorMessage(error), type: "error" })
        return
      }

      if (data.user) {
        // Handle remember me
        if (rememberMe) {
          localStorage.setItem("rememberUser", "true")
        } else {
          localStorage.removeItem("rememberUser")
        }

        setError({ message: "Successfully signed in!", type: "success" })
        onSuccess?.()
      }
    } catch (err) {
      setError({ message: getErrorMessage(err), type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError({ message: "Passwords do not match", type: "error" })
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError({ message: "Password must be at least 6 characters long", type: "error" })
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // Disable email link, use OTP instead
        },
      })

      if (error) {
        setError({ message: getErrorMessage(error), type: "error" })
        return
      }

      if (data.user && !data.session) {
        // User needs to verify email
        setMode("verify")
        setError({
          message: "Please check your email for a 6-digit verification code",
          type: "info",
        })
        startResendCooldown()
      } else if (data.session) {
        // User is automatically signed in
        setError({ message: "Account created successfully!", type: "success" })
        onSuccess?.()
      }
    } catch (err) {
      setError({ message: getErrorMessage(err), type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const code = verificationCode.join("")
    if (code.length !== 6) {
      setError({ message: "Please enter the complete 6-digit code", type: "error" })
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
      })

      if (error) {
        setError({ message: getErrorMessage(error), type: "error" })
        return
      }

      if (data.user) {
        setError({ message: "Email verified successfully!", type: "success" })
        onSuccess?.()
      }
    } catch (err) {
      setError({ message: getErrorMessage(err), type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      })

      if (error) {
        setError({ message: getErrorMessage(error), type: "error" })
      } else {
        setError({ message: "Verification code sent!", type: "success" })
        startResendCooldown()
      }
    } catch (err) {
      setError({ message: getErrorMessage(err), type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNewAccount = async () => {
    setLoading(true)
    try {
      // Sign out any existing session
      await supabase.auth.signOut()

      // Reset form
      setEmail("")
      setPassword("")
      setConfirmPassword("")
      setVerificationCode(["", "", "", "", "", ""])
      setError(null)
      setMode("signup")
    } catch (err) {
      console.error("Error signing out:", err)
    } finally {
      setLoading(false)
    }
  }

  if (mode === "verify") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">Verify Your Email</CardTitle>
            <CardDescription className="text-gray-400">Enter the 6-digit code sent to {email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert
                className={`${
                  error.type === "error"
                    ? "border-red-500 bg-red-500/10 text-red-400"
                    : error.type === "success"
                      ? "border-green-500 bg-green-500/10 text-green-400"
                      : "border-blue-500 bg-blue-500/10 text-blue-400"
                }`}
              >
                {error.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex justify-center space-x-2">
                {verificationCode.map((digit, index) => (
                  <Input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-12 text-center text-lg font-bold bg-gray-800 border-gray-700 text-white focus:border-blue-500"
                  />
                ))}
              </div>

              <Button
                type="submit"
                disabled={loading || verificationCode.join("").length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || loading}
                  className="text-blue-400 hover:text-blue-300"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend verification code"}
                </Button>
              </div>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode("signin")}
                  className="text-gray-400 hover:text-gray-300"
                >
                  Back to sign in
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">
            {mode === "signin" ? "Welcome Back" : "Create Account"}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {mode === "signin" ? "Sign in to your investment portfolio" : "Start tracking your investments today"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert
              className={`${
                error.type === "error"
                  ? "border-red-500 bg-red-500/10 text-red-400"
                  : error.type === "success"
                    ? "border-green-500 bg-green-500/10 text-green-400"
                    : "border-blue-500 bg-blue-500/10 text-blue-400"
              }`}
            >
              {error.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white focus:border-blue-500"
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-gray-800 border-gray-700 text-white focus:border-blue-500 pr-10"
                  placeholder="Enter your password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-gray-800 border-gray-700 text-white focus:border-blue-500 pr-10"
                    placeholder="Confirm your password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-300"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {mode === "signin" && (
              <div className="flex items-center space-x-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="remember" className="text-sm text-gray-400">
                  Keep me signed in
                </Label>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "signin" ? "Signing in..." : "Creating account..."}
                </>
              ) : mode === "signin" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="text-center space-y-2">
            {mode === "signin" ? (
              <>
                <p className="text-sm text-gray-400">
                  Don't have an account?{" "}
                  <Button
                    variant="link"
                    onClick={() => setMode("signup")}
                    className="text-blue-400 hover:text-blue-300 p-0"
                  >
                    Sign up
                  </Button>
                </p>
                <Button
                  variant="outline"
                  onClick={handleCreateNewAccount}
                  disabled={loading}
                  className="w-full border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                  Create New Account
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-400">
                Already have an account?{" "}
                <Button
                  variant="link"
                  onClick={() => setMode("signin")}
                  className="text-blue-400 hover:text-blue-300 p-0"
                >
                  Sign in
                </Button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
