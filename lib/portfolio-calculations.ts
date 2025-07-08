import type { Holding } from "./supabase"
import type { StockQuote } from "./financial-api"

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
}

export function calculatePortfolioSummary(holdings: EnrichedHolding[]): PortfolioSummary {
  const totalValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0)
  const totalCost = holdings.reduce((sum, holding) => sum + holding.total_invested, 0)
  const totalGainLoss = totalValue - totalCost
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0
  const dayChange = holdings.reduce((sum, holding) => sum + holding.dayChange * holding.total_shares, 0)
  const dayChangePercent = totalValue > 0 ? (dayChange / totalValue) * 100 : 0

  return {
    totalValue,
    totalCost,
    totalGainLoss,
    totalGainLossPercent,
    dayChange,
    dayChangePercent,
  }
}

export function enrichHoldingsWithMarketData(holdings: Holding[], quotes: StockQuote[]): EnrichedHolding[] {
  return holdings.map((holding) => {
    const quote = quotes.find((q) => q.symbol === holding.symbol)
    const currentPrice = quote?.price || 0
    const currentValue = currentPrice * holding.total_shares
    const gainLoss = currentValue - holding.total_invested
    const gainLossPercent = holding.total_invested > 0 ? (gainLoss / holding.total_invested) * 100 : 0
    const dayChange = quote?.change || 0
    const dayChangePercent = quote?.changePercent || 0

    return {
      ...holding,
      currentPrice,
      currentValue,
      gainLoss,
      gainLossPercent,
      dayChange,
      dayChangePercent,
    }
  })
}
