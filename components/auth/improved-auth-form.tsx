"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, User, TrendingUp, AlertCircle, CheckCircle } from "lucide-react"
import { signUpWithEmail, signInWithEmail, resetPassword } from "@/lib/supabase"

export default function ImprovedAuthForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
  })

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      console.log("Starting sign up process...")

      // Validate form data
      if (!formData.email || !formData.password) {
        throw new Error("Email and password are required")
      }

      if (formData.password.length < 6) {
        throw new Error("Password must be at least 6 characters long")
      }

      const result = await signUpWithEmail(formData.email, formData.password, formData.displayName)

      if (result.success) {
        setMessage(result.message || "Account created successfully!")
        setFormData({ email: "", password: "", displayName: "" })
      } else {
        setError(result.error || "Failed to create account")
      }
    } catch (error: any) {
      console.error("Sign up error:", error)
      setError(error.message || "Failed to create account")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      console.log("Starting sign in process...")

      // Validate form data
      if (!formData.email || !formData.password) {
        throw new Error("Email and password are required")
      }

      const result = await signInWithEmail(formData.email, formData.password)

      if (result.success) {
        setMessage("Signed in successfully!")
        // The auth provider will handle the redirect
      } else {
        setError(result.error || "Failed to sign in")
      }
    } catch (error: any) {
      console.error("Sign in error:", error)
      setError(error.message || "Failed to sign in")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!formData.email) {
      setError("Please enter your email address first")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await resetPassword(formData.email)

      if (result.success) {
        setMessage(result.message || "Password reset email sent!")
      } else {
        setError(result.error || "Failed to send reset email")
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Investment Portfolio</h1>
          </div>
          <p className="text-gray-400">Secure investment portfolio management</p>
        </div>

        <Card className="border-gray-800 bg-gray-900 shadow-xl">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
              <TabsTrigger
                value="signin"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300 hover:text-gray-100 hover:bg-gray-700 transition-all duration-200"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300 hover:text-gray-100 hover:bg-gray-700 transition-all duration-200"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <CardHeader className="pb-4">
                <CardTitle className="text-white">Welcome back</CardTitle>
                <CardDescription className="text-gray-400">Sign in to access your investment portfolio</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-gray-300">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 hover:border-gray-600 transition-colors"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-gray-300">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 hover:border-gray-600 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    onClick={handleResetPassword}
                    disabled={isLoading}
                  >
                    Forgot password?
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="signup">
              <CardHeader className="pb-4">
                <CardTitle className="text-white">Create account</CardTitle>
                <CardDescription className="text-gray-400">Start tracking your investments today</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-gray-300">
                      Display Name (Optional)
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your display name"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 hover:border-gray-600 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-gray-300">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 hover:border-gray-600 transition-colors"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-gray-300">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password (min 6 characters)"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 hover:border-gray-600 transition-colors"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>

          {/* Error/Success Messages */}
          {error && (
            <div className="px-6 pb-6">
              <Alert className="border-red-800 bg-red-900/20">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {message && (
            <div className="px-6 pb-6">
              <Alert className="border-green-800 bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-400">{message}</AlertDescription>
              </Alert>
            </div>
          )}
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>Secure authentication powered by Supabase</p>
          <p className="mt-1">Your data is encrypted and protected</p>
        </div>
      </div>
    </div>
  )
}
