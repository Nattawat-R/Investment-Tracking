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

export async function updateTransaction(
  transactionId: string,
  updateData: {
    transaction_type: string
    shares: string
    price_per_share: string
    transaction_date: string
    notes: string
  },
) {
  const shares = Number.parseFloat(updateData.shares)
  const pricePerShare = Number.parseFloat(updateData.price_per_share)
  const totalAmount = shares * pricePerShare

  try {
    const { data, error } = await supabase
      .from("transactions")
      .update({
        transaction_type: updateData.transaction_type as "BUY" | "SELL" | "DIVIDEND",
        shares,
        price_per_share: pricePerShare,
        total_amount: totalAmount,
        transaction_date: updateData.transaction_date,
        notes: updateData.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId)
      .select()

    if (error) {
      console.error("Error updating transaction:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/")
    return { success: true, data }
  } catch (error) {
    console.error("Error updating transaction:", error)
    return { success: false, error: "Failed to update transaction" }
  }
}

export async function deleteTransaction(transactionId: string) {
  try {
    const { error } = await supabase.from("transactions").delete().eq("id", transactionId)

    if (error) {
      console.error("Error deleting transaction:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return { success: false, error: "Failed to delete transaction" }
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
