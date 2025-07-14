"use client"

import { useAuth } from "@/components/auth/auth-provider"
import ImprovedAuthForm from "@/components/auth/improved-auth-form"
import AuthenticatedInvestmentDashboard from "@/authenticated-investment-dashboard"

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <ImprovedAuthForm />
  }

  return <AuthenticatedInvestmentDashboard />
}
