import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Transaction = {
  id: string
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
  symbol: string
  company_name: string | null
  total_shares: number
  avg_cost_basis: number
  total_invested: number
}
