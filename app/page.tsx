"use client"

import { useAuth } from "@/components/auth/auth-provider"
import ImprovedAuthForm from "@/components/auth/improved-auth-form"
import InvestmentDashboard from "@/authenticated-investment-dashboard"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <ImprovedAuthForm />
  }

  return <InvestmentDashboard />
}
