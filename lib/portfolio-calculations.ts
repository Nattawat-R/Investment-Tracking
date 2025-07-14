import type { Holding, Transaction } from "./supabase"
import type { StockQuote } from "./financial-api"
import { convertCurrencySync } from "./financial-api"

export interface PortfolioSummary {
  totalValue: number
  totalCost: number
  totalGainLoss: number
  totalGainLossPercent: number
  dayChange: number
  dayChangePercent: number
}

export interface EnrichedHolding extends Holding {
  currentPrice: number
  currentValue: number
  gainLoss: number
  gainLossPercent: number
  dayChange: number
  dayChangePercent: number
  assetType: "STOCK" | "CRYPTO" | "THAI_STOCK" | "THAI_GOLD"
  currency: string
  exchange: string
}

export interface PortfolioAllocation {
  assetType: "STOCK" | "CRYPTO" | "THAI_STOCK" | "THAI_GOLD"
  value: number
  percentage: number
  count: number
  color: string
}

export function calculatePortfolioSummary(holdings: EnrichedHolding[], displayCurrency = "USD"): PortfolioSummary {
  const totalValue = holdings.reduce((sum, holding) => {
    // Ensure we have valid numbers
    const currentValue = holding.currentValue || 0
    const currency = holding.currency || "USD"

    if (isNaN(currentValue)) return sum

    const convertedValue = convertCurrencySync(currentValue, currency, displayCurrency)
    return sum + (isNaN(convertedValue) ? 0 : convertedValue)
  }, 0)

  const totalCost = holdings.reduce((sum, holding) => {
    // Ensure we have valid numbers
    const totalInvested = holding.total_invested || 0
    const currency = holding.currency || "USD"

    if (isNaN(totalInvested)) return sum

    const convertedCost = convertCurrencySync(totalInvested, currency, displayCurrency)
    return sum + (isNaN(convertedCost) ? 0 : convertedCost)
  }, 0)

  const totalGainLoss = totalValue - totalCost
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0

  const dayChange = holdings.reduce((sum, holding) => {
    // Ensure we have valid numbers
    const dayChangeValue = holding.dayChange || 0
    const totalShares = holding.total_shares || 0
    const currency = holding.currency || "USD"

    if (isNaN(dayChangeValue) || isNaN(totalShares)) return sum

    const convertedDayChange = convertCurrencySync(dayChangeValue * totalShares, currency, displayCurrency)
    return sum + (isNaN(convertedDayChange) ? 0 : convertedDayChange)
  }, 0)

  const dayChangePercent = totalValue > 0 ? (dayChange / totalValue) * 100 : 0

  return {
    totalValue: isNaN(totalValue) ? 0 : totalValue,
    totalCost: isNaN(totalCost) ? 0 : totalCost,
    totalGainLoss: isNaN(totalGainLoss) ? 0 : totalGainLoss,
    totalGainLossPercent: isNaN(totalGainLossPercent) ? 0 : totalGainLossPercent,
    dayChange: isNaN(dayChange) ? 0 : dayChange,
    dayChangePercent: isNaN(dayChangePercent) ? 0 : dayChangePercent,
  }
}

export function enrichHoldingsWithMarketData(holdings: Holding[], quotes: StockQuote[]): EnrichedHolding[] {
  return holdings.map((holding) => {
    const quote = quotes.find((q) => q.symbol === holding.symbol)

    // Ensure we have valid numbers with fallbacks
    const currentPrice = quote?.price || 0
    const totalShares = holding.total_shares || 0
    const totalInvested = holding.total_invested || 0
    const avgCostBasis = holding.avg_cost_basis || 0

    const currentValue = currentPrice * totalShares
    const gainLoss = currentValue - totalInvested
    const gainLossPercent = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0
    const dayChange = quote?.change || 0
    const dayChangePercent = quote?.changePercent || 0

    return {
      ...holding,
      currentPrice: isNaN(currentPrice) ? 0 : currentPrice,
      currentValue: isNaN(currentValue) ? 0 : currentValue,
      gainLoss: isNaN(gainLoss) ? 0 : gainLoss,
      gainLossPercent: isNaN(gainLossPercent) ? 0 : gainLossPercent,
      dayChange: isNaN(dayChange) ? 0 : dayChange,
      dayChangePercent: isNaN(dayChangePercent) ? 0 : dayChangePercent,
      assetType: quote?.assetType || "STOCK",
      currency: quote?.currency || "USD",
      exchange: quote?.exchange || "US",
    }
  })
}

export function calculatePortfolioAllocation(
  holdings: EnrichedHolding[],
  displayCurrency = "USD",
): PortfolioAllocation[] {
  const totalValue = holdings.reduce((sum, holding) => {
    const convertedValue = convertCurrencySync(holding.currentValue, holding.currency, displayCurrency)
    return sum + convertedValue
  }, 0)

  const assetTypeColors = {
    STOCK: "#3B82F6", // Blue
    THAI_STOCK: "#10B981", // Green
    CRYPTO: "#8B5CF6", // Purple (updated from orange)
    THAI_GOLD: "#EAB308", // Yellow
  }

  const allocationMap = new Map<string, { value: number; count: number }>()

  holdings.forEach((holding) => {
    const convertedValue = convertCurrencySync(holding.currentValue, holding.currency, displayCurrency)
    const existing = allocationMap.get(holding.assetType) || { value: 0, count: 0 }
    allocationMap.set(holding.assetType, {
      value: existing.value + convertedValue,
      count: existing.count + 1,
    })
  })

  return Array.from(allocationMap.entries()).map(([assetType, data]) => ({
    assetType: assetType as "STOCK" | "CRYPTO" | "THAI_STOCK" | "THAI_GOLD",
    value: data.value,
    percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    count: data.count,
    color: assetTypeColors[assetType as keyof typeof assetTypeColors],
  }))
}

// Generate 1-year portfolio performance data based on actual transaction dates
export function generatePortfolioHistory(
  currentValue: number,
  totalGainLoss: number,
  transactions: Transaction[],
): Array<{ date: string; value: number }> {
  const data = []
  const today = new Date()

  // Find the earliest transaction date
  let earliestTransactionDate: Date | null = null
  if (transactions.length > 0) {
    const sortedTransactions = transactions.sort(
      (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime(),
    )
    earliestTransactionDate = new Date(sortedTransactions[0].transaction_date)
  }

  for (let i = 11; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const monthName = date.toLocaleDateString("en-US", { month: "short" })

    // If no transactions or this month is before the first transaction, show 0
    if (!earliestTransactionDate || date < earliestTransactionDate) {
      data.push({
        date: monthName,
        value: 0,
      })
      continue
    }

    // Calculate portfolio value for this month
    if (currentValue === 0) {
      data.push({
        date: monthName,
        value: 0,
      })
      continue
    }

    const startValue = Math.max(1000, currentValue - totalGainLoss)
    const monthsFromStart = Math.max(
      0,
      (date.getTime() - earliestTransactionDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
    )
    const totalMonthsInvesting = Math.max(
      1,
      (today.getTime() - earliestTransactionDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
    )

    const progress = monthsFromStart / totalMonthsInvesting
    const baseGrowth = startValue + totalGainLoss * progress
    const volatility = (Math.sin(monthsFromStart * 0.5) * 0.05 + Math.random() * 0.05 - 0.025) * baseGrowth
    const value = Math.max(0, baseGrowth + volatility)

    data.push({
      date: monthName,
      value: Math.round(value),
    })
  }

  return data
}

// Calculate individual asset allocation for pie chart with PROPER SORTING
export function calculateAssetAllocation(
  holdings: EnrichedHolding[],
  displayCurrency = "USD",
): Array<{
  symbol: string
  name: string
  value: number
  percentage: number
  assetType: "STOCK" | "CRYPTO" | "THAI_STOCK" | "THAI_GOLD"
  color: string
  gainLoss: number
  gainLossPercent: number
}> {
  if (holdings.length === 0) return []

  const totalValue = holdings.reduce((sum, holding) => {
    const currentValue = holding.currentValue || 0
    const currency = holding.currency || "USD"

    if (isNaN(currentValue)) return sum

    const convertedValue = convertCurrencySync(currentValue, currency, displayCurrency)
    return sum + (isNaN(convertedValue) ? 0 : convertedValue)
  }, 0)

  if (totalValue === 0) return []

  // More distinguishable color variations for each asset type
  const assetTypeColorVariations = {
    STOCK: ["#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#DBEAFE", "#EFF6FF", "#F0F9FF"],
    THAI_STOCK: ["#059669", "#10B981", "#34D399", "#6EE7B7", "#9DECCC", "#C6F6D5", "#D1FAE5", "#ECFDF5"],
    CRYPTO: ["#7C3AED", "#8B5CF6", "#A78BFA", "#C4B5FD", "#DDD6FE", "#EDE9FE", "#F3F4F6", "#FAFAFA"],
    THAI_GOLD: ["#CA8A04", "#EAB308", "#FACC15", "#FDE047", "#FEF08A", "#FEFCE8", "#FFFBEB", "#FEFCE8"],
  }

  // Group by asset type and assign colors
  const groupedByType = holdings.reduce(
    (acc, holding) => {
      if (!acc[holding.assetType]) {
        acc[holding.assetType] = []
      }
      acc[holding.assetType].push(holding)
      return acc
    },
    {} as Record<string, EnrichedHolding[]>,
  )

  const result: Array<{
    symbol: string
    name: string
    value: number
    percentage: number
    assetType: "STOCK" | "CRYPTO" | "THAI_STOCK" | "THAI_GOLD"
    color: string
    gainLoss: number
    gainLossPercent: number
  }> = []

  // Process each asset type group
  Object.entries(groupedByType).forEach(([assetType, holdings]) => {
    const colors = assetTypeColorVariations[assetType as keyof typeof assetTypeColorVariations]

    holdings.forEach((holding, index) => {
      const currentValue = holding.currentValue || 0
      const gainLoss = holding.gainLoss || 0
      const currency = holding.currency || "USD"

      const convertedValue = convertCurrencySync(currentValue, currency, displayCurrency)
      const convertedGainLoss = convertCurrencySync(gainLoss, currency, displayCurrency)
      const colorIndex = index % colors.length

      // Only add if we have valid values
      if (!isNaN(convertedValue) && convertedValue > 0) {
        result.push({
          symbol: holding.symbol,
          name: holding.company_name || holding.symbol,
          value: convertedValue,
          gainLoss: isNaN(convertedGainLoss) ? 0 : convertedGainLoss,
          gainLossPercent: isNaN(holding.gainLossPercent) ? 0 : holding.gainLossPercent,
          percentage: totalValue > 0 ? (convertedValue / totalValue) * 100 : 0,
          assetType: holding.assetType,
          color: colors[colorIndex],
        })
      }
    })
  })

  // Sort by percentage/value descending
  result.sort((a, b) => b.percentage - a.percentage)

  return result
}
