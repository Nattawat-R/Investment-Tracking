"use server"

import { supabase, type Transaction } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function addTransaction(formData: FormData) {
  const symbol = formData.get("symbol") as string
  const companyName = formData.get("companyName") as string
  const transactionType = formData.get("transactionType") as "BUY" | "SELL" | "DIVIDEND"
  const shares = Number.parseFloat(formData.get("shares") as string)
  const pricePerShare = Number.parseFloat(formData.get("pricePerShare") as string)
  const transactionDate = formData.get("transactionDate") as string
  const notes = formData.get("notes") as string

  const totalAmount = shares * pricePerShare

  try {
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        symbol: symbol.toUpperCase(),
        company_name: companyName,
        transaction_type: transactionType,
        shares,
        price_per_share: pricePerShare,
        total_amount: totalAmount,
        transaction_date: transactionDate,
        notes: notes || null,
      })
      .select()

    if (error) {
      console.error("Error adding transaction:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/")
    return { success: true, data }
  } catch (error) {
    console.error("Error adding transaction:", error)
    return { success: false, error: "Failed to add transaction" }
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("transaction_date", { ascending: false })

    if (error) {
      console.error("Error fetching transactions:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return []
  }
}

export async function getHoldings() {
  try {
    const { data, error } = await supabase.from("portfolio_holdings").select("*").order("symbol")

    if (error) {
      console.error("Error fetching holdings:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error fetching holdings:", error)
    return []
  }
}
