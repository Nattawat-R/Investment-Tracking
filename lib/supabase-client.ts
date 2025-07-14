import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export type Transaction = {
  id: string
  user_id: string
  symbol: string
  company_name: string | null
  transaction_type: "BUY" | "SELL" | "DIVIDEND"
  shares: number
  price_per_share: number
  total_amount: number
  transaction_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type Holding = {
  user_id: string
  symbol: string
  company_name: string | null
  total_shares: number
  avg_cost_basis: number
  total_invested: number
}

export type UserProfile = {
  id: string
  email: string
  display_name: string | null
  preferred_currency: "USD" | "THB"
  created_at: string
  updated_at: string
}
