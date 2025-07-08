// Using Alpha Vantage API (free tier: 25 requests per day)
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || "demo"
const BASE_URL = "https://www.alphavantage.co/query"

export interface StockQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap?: number
  lastUpdated: string
}

export interface StockInfo {
  symbol: string
  name: string
  exchange: string
  currency: string
}

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const response = await fetch(`${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`)
    const data = await response.json()

    if (data["Error Message"] || data["Note"]) {
      console.error("API Error:", data["Error Message"] || data["Note"])
      return null
    }

    const quote = data["Global Quote"]
    if (!quote) return null

    return {
      symbol: quote["01. symbol"],
      price: Number.parseFloat(quote["05. price"]),
      change: Number.parseFloat(quote["09. change"]),
      changePercent: Number.parseFloat(quote["10. change percent"].replace("%", "")),
      volume: Number.parseInt(quote["06. volume"]),
      lastUpdated: quote["07. latest trading day"],
    }
  } catch (error) {
    console.error("Error fetching stock quote:", error)
    return null
  }
}

export async function getMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
  const quotes = await Promise.allSettled(symbols.map((symbol) => getStockQuote(symbol)))

  return quotes
    .filter(
      (result): result is PromiseFulfilledResult<StockQuote> => result.status === "fulfilled" && result.value !== null,
    )
    .map((result) => result.value)
}

export async function searchStocks(query: string): Promise<StockInfo[]> {
  try {
    const response = await fetch(`${BASE_URL}?function=SYMBOL_SEARCH&keywords=${query}&apikey=${API_KEY}`)
    const data = await response.json()

    if (data["Error Message"]) {
      console.error("API Error:", data["Error Message"])
      return []
    }

    const matches = data["bestMatches"] || []
    return matches.slice(0, 10).map((match: any) => ({
      symbol: match["1. symbol"],
      name: match["2. name"],
      exchange: match["4. region"],
      currency: match["8. currency"],
    }))
  } catch (error) {
    console.error("Error searching stocks:", error)
    return []
  }
}
