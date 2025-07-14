"use server"

import { supabase } from "@/lib/supabase-client"
import type { Transaction } from "@/lib/supabase-client"
import { revalidatePath } from "next/cache"

export async function addUserTransaction(formData: FormData, userId: string) {
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
        user_id: userId,
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

export async function updateUserTransaction(
  transactionId: string,
  userId: string,
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
      .eq("user_id", userId) // Ensure user can only update their own transactions
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

export async function deleteUserTransaction(transactionId: string, userId: string) {
  try {
    const { error } = await supabase.from("transactions").delete().eq("id", transactionId).eq("user_id", userId) // Ensure user can only delete their own transactions

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

export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
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

export async function getUserHoldings(userId: string) {
  try {
    const { data, error } = await supabase.from("portfolio_holdings").select("*").eq("user_id", userId).order("symbol")

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

// User profile management
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase.from("user_profiles").select("*").eq("id", userId).single()

    if (error) {
      console.error("Error fetching user profile:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return null
  }
}

export async function updateUserProfile(
  userId: string,
  updates: {
    display_name?: string
    preferred_currency?: "USD" | "THB"
  },
) {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()

    if (error) {
      console.error("Error updating user profile:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/")
    return { success: true, data }
  } catch (error) {
    console.error("Error updating user profile:", error)
    return { success: false, error: "Failed to update profile" }
  }
}
