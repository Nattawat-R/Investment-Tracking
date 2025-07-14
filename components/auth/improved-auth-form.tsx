"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2, Mail, Lock, User, CheckCircle, AlertCircle, Info } from "lucide-react"
import { signUpWithEmail, signInWithEmail, verifyOTP, resendOTP, getAuthErrorMessage, signOut } from "@/lib/supabase"

type AuthMode = "signin" | "signup" | "verify"
type MessageType = "error" | "success" | "info"

interface Message {
  type: MessageType
  text: string
}

export default function ImprovedAuthForm() {
  const [mode, setMode] = useState<AuthMode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [resendCooldown, setResendCooldown] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const showMessage = (type: MessageType, text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6)
      const newOtp = [...otp]
      for (let i = 0; i < pastedCode.length && i < 6; i++) {
        newOtp[i] = pastedCode[i]
      }
      setOtp(newOtp)

      // Focus on the next empty field or the last field
      const nextIndex = Math.min(pastedCode.length, 5)
      otpRefs.current[nextIndex]?.focus()
      return
    }

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      showMessage("error", "Please fill in all required fields")
      return
    }

    setLoading(true)
    const result = await signUpWithEmail(email, password, displayName)

    if (result.success) {
      setMode("verify")
      showMessage("success", "Verification code sent to your email!")
    } else {
      showMessage("error", getAuthErrorMessage(result.error || "Signup failed"))
    }
    setLoading(false)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      showMessage("error", "Please enter your email and password")
      return
    }

    setLoading(true)
    const result = await signInWithEmail(email, password)

    if (result.success) {
      showMessage("success", "Successfully signed in!")
      // The auth state change will be handled by the AuthProvider
    } else {
      showMessage("error", getAuthErrorMessage(result.error || "Sign in failed"))
    }
    setLoading(false)
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    const otpCode = otp.join("")

    if (otpCode.length !== 6) {
      showMessage("error", "Please enter the complete 6-digit code")
      return
    }

    setLoading(true)
    const result = await verifyOTP(email, otpCode)

    if (result.success) {
      showMessage("success", "Email verified successfully!")
      // The auth state change will be handled by the AuthProvider
    } else {
      showMessage("error", getAuthErrorMessage(result.error || "Verification failed"))
    }
    setLoading(false)
  }

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return

    setLoading(true)
    const result = await resendOTP(email)

    if (result.success) {
      showMessage("success", "New verification code sent!")
      setResendCooldown(60)
      setOtp(["", "", "", "", "", ""])
    } else {
      showMessage("error", getAuthErrorMessage(result.error || "Failed to resend code"))
    }
    setLoading(false)
  }

  const handleCreateNewAccount = async () => {
    // Sign out first to ensure clean state
    await signOut()
    setMode("signup")
    setEmail("")
    setPassword("")
    setDisplayName("")
    setOtp(["", "", "", "", "", ""])
    setMessage(null)
  }

  const getMessageIcon = (type: MessageType) => {
    switch (type) {
      case "error":
        return <AlertCircle className="h-4 w-4" />
      case "success":
        return <CheckCircle className="h-4 w-4" />
      case "info":
        return <Info className="h-4 w-4" />
    }
  }

  const getMessageColor = (type: MessageType) => {
    switch (type) {
      case "error":
        return "text-red-400 border-red-800 bg-red-950/50"
      case "success":
        return "text-green-400 border-green-800 bg-green-950/50"
      case "info":
        return "text-blue-400 border-blue-800 bg-blue-950/50"
    }
  }

  if (mode === "verify") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">Verify Your Email</CardTitle>
            <CardDescription className="text-gray-400">Enter the 6-digit code sent to {email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <Alert className={`border ${getMessageColor(message.type)}`}>
                <div className="flex items-center gap-2">
                  {getMessageIcon(message.type)}
                  <AlertDescription className="text-sm">{message.text}</AlertDescription>
                </div>
              </Alert>
            )}

            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
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
                disabled={loading || otp.join("").length !== 6}
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
            </form>

            <div className="text-center space-y-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleResendOTP}
                disabled={loading || resendCooldown > 0}
                className="text-blue-400 hover:text-blue-300"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend verification code"}
              </Button>

              <div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode("signin")}
                  className="text-gray-400 hover:text-gray-300"
                >
                  Back to sign in
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
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
          {message && (
            <Alert className={`border ${getMessageColor(message.type)}`}>
              <div className="flex items-center gap-2">
                {getMessageIcon(message.type)}
                <AlertDescription className="text-sm">{message.text}</AlertDescription>
              </div>
            </Alert>
          )}

          <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Display Name (Optional)</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1 h-8 w-8 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="keepSignedIn"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="keepSignedIn" className="text-sm text-gray-300">
                Keep me signed in
              </label>
            </div>

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
                    type="button"
                    variant="ghost"
                    onClick={() => setMode("signup")}
                    className="text-blue-400 hover:text-blue-300 p-0 h-auto font-normal"
                  >
                    Sign up
                  </Button>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCreateNewAccount}
                  className="text-gray-400 hover:text-gray-300 text-sm"
                >
                  Create New Account
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-400">
                Already have an account?{" "}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode("signin")}
                  className="text-blue-400 hover:text-blue-300 p-0 h-auto font-normal"
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
