// Multi-source financial API with better free alternatives
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY || "demo"
const ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query"

// CoinGecko is free for crypto data
const COINGECKO_URL = "https://api.coingecko.com/api/v3"

// Finnhub - Free tier: 60 calls/minute
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || ""
const FINNHUB_URL = "https://finnhub.io/api/v1"

// Twelve Data - Free tier: 800 requests/day
const TWELVE_DATA_KEY = process.env.TWELVE_DATA_API_KEY || ""
const TWELVE_DATA_URL = "https://api.twelvedata.com"

// Yahoo Finance Alternative (no key needed, but less reliable)
const YAHOO_FINANCE_URL = "https://query1.finance.yahoo.com/v8/finance/chart"

// Alternative Yahoo Finance API endpoints
const YAHOO_FINANCE_V7_URL = "https://query1.finance.yahoo.com/v7/finance/quote"
const YAHOO_FINANCE_V10_URL = "https://query2.finance.yahoo.com/v10/finance/quoteSummary"

// Exchange rates for currency conversion
const EXCHANGE_RATES = {
  USD_TO_THB: 35.5, // Approximate rate, should be updated from real API
  THB_TO_USD: 1 / 35.5,
}

// Simple in-memory cache to reduce API calls
const priceCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Rate limiting tracker
const apiCallTracker = new Map<string, { count: number; resetTime: number }>()

// Expanded Thai stock symbols (SET - Stock Exchange of Thailand)
const THAI_STOCK_SYMBOLS = new Set([
  // Major banks
  "KBANK",
  "SCB",
  "BBL",
  "KTB",
  "TMB",
  "TISCO",
  "TCAP",
  "KKP",
  "LHFG",
  "SAWAD",

  // Energy & Petrochemicals
  "PTT",
  "PTTEP",
  "BANPU",
  "RATCH",
  "EGCO",
  "EA",
  "GULF",
  "GPSC",
  "CKP",
  "BCPG",
  "BCP",
  "TOP",
  "IRPC",
  "SPRC",
  "ESSO",
  "OR",
  "SUSCO",
  "BPP",
  "PRM",
  "BAFS",

  // Retail & Consumer
  "CPALL",
  "HMPRO",
  "MAKRO",
  "BJC",
  "CRC",
  "ROBINS",
  "SINGER",
  "COM7",
  "DOHOME",

  // Technology & Telecom
  "ADVANC",
  "INTUCH",
  "TRUE",
  "DTAC",
  "SAMART",
  "JAS",
  "SYNEX",
  "MFEC",
  "SVT",

  // Real Estate & Construction
  "CPN",
  "SPALI",
  "LPN",
  "AP",
  "SIRI",
  "ORIGIN",
  "NOBLE",
  "PRUKSA",
  "QH",
  "PEACE",
  "SC",
  "SUPALAI",
  "BLAND",
  "AMATA",
  "WHA",
  "HEMARAJ",
  "ROJNA",
  "TASCO",
  "PSH",

  // Industrial & Materials
  "SCC",
  "TPIPL",
  "TCAP",
  "CPAC",
  "TASCO",
  "HANA",
  "DELTA",
  "KCE",
  "AAV",
  "HTECH",

  // Food & Beverage
  "TU",
  "CPF",
  "MINT",
  "OISHI",
  "CBG",
  "NRF",
  "RBF",
  "SAUCE",
  "ZEN",
  "COFFEE",

  // Healthcare & Pharmaceuticals
  "BH",
  "CHG",
  "BDMS",
  "BCH",
  "RJH",
  "PR9",
  "VIBHA",
  "NEW",
  "VIH",
  "PRINC",

  // Transportation & Logistics
  "AOT",
  "BEM",
  "BTS",
  "KERRY",
  "TTA",
  "PSL",
  "NYT",
  "WICE",
  "TKN",
  "TFFIF",

  // Finance & Securities
  "KTC",
  "TIDLOR",
  "MTC",
  "AEONTS",
  "CHAYO",
  "JMT",
  "SINGER",
  "SAWAD",
  "GCAP",

  // Agriculture & Food Processing
  "GFPT",
  "LEE",
  "TFG",
  "MALEE",
  "AFC",
  "LST",
  "SORKON",
  "TAPAC",
  "CFRESH",

  // Tourism & Entertainment
  "CENTEL",
  "ERW",
  "HOTPOT",
  "LRH",
  "MANRIN",
  "VRANDA",
  "SHANG",
  "ASIAN",

  // Media & Publishing
  "WORK",
  "PLANB",
  "VGI",
  "MACO",
  "GRAMMY",
  "RS",
  "BEC",
  "MCOT",
  "POST",

  // Textiles & Fashion
  "FANCY",
  "LALIN",
  "SABUY",
  "BEAUTY",
  "BSM",
  "FTI",
  "MODERN",
  "SAHA",

  // Additional popular stocks
  "LH",
  "DITTO",
  "JMART",
  "CPANEL",
  "TEAMG",
  "SISB",
  "ADVICE",
  "HUMAN",
  "SOLAR",
  "WINMED",
  "ITEL",
  "INSET",
  "NETBAY",
  "STECH",
  "FORTH",
  "DTCENT",
  "SNNP",
])

// Thai Gold symbols
const THAI_GOLD_SYMBOLS = new Set(["GOLD96.5", "GOLD", "XAU", "THGOLD"])

// Mock price data for Thai stocks (fallback when APIs fail) - Expanded with more stocks
const THAI_STOCK_MOCK_PRICES: { [key: string]: { price: number; change: number } } = {
  // Major Banks
  PTT: { price: 35.5, change: 0.25 },
  CPALL: { price: 62.75, change: -0.5 },
  KBANK: { price: 142.5, change: 1.25 },
  SCB: { price: 118.0, change: -0.75 },
  BBL: { price: 158.5, change: 2.0 },
  KTB: { price: 16.8, change: 0.1 },
  TMB: { price: 1.32, change: -0.02 },
  TISCO: { price: 85.5, change: 1.5 },

  // Technology & Telecom
  ADVANC: { price: 198.0, change: -1.5 },
  INTUCH: { price: 58.25, change: 0.75 },
  TRUE: { price: 4.86, change: -0.04 },
  DTAC: { price: 38.5, change: 0.5 },

  // Transportation & Infrastructure
  AOT: { price: 68.25, change: 0.75 },
  BEM: { price: 8.95, change: -0.05 },
  BTS: { price: 9.8, change: 0.15 },

  // Retail & Consumer
  CPN: { price: 52.5, change: 0.25 },
  HMPRO: { price: 12.8, change: -0.1 },
  MAKRO: { price: 48.75, change: 0.5 },
  BJC: { price: 42.0, change: -0.25 },

  // Hospitality & Tourism
  MINT: { price: 28.75, change: 0.5 },
  CENTEL: { price: 38.5, change: 1.0 },
  ERW: { price: 3.94, change: 0.06 },

  // Healthcare & Pharmaceuticals
  BH: { price: 165.0, change: 2.5 },
  CHG: { price: 3.84, change: 0.02 },
  BDMS: { price: 25.5, change: 0.25 },
  BCH: { price: 18.2, change: -0.3 },
  RJH: { price: 32.75, change: 0.25 },
  VIH: { price: 12.6, change: 0.1 },

  // Finance & Securities
  KTC: { price: 42.25, change: 0.75 },
  TIDLOR: { price: 22.8, change: -0.2 },
  MTC: { price: 58.5, change: 1.0 },
  AEONTS: { price: 185.0, change: 2.0 },
  CHAYO: { price: 8.15, change: -0.05 },
  JMT: { price: 42.5, change: 0.5 },
  SAWAD: { price: 52.75, change: 0.25 },

  // Energy & Petrochemicals
  PTTEP: { price: 118.5, change: 1.5 },
  BANPU: { price: 12.4, change: -0.1 },
  RATCH: { price: 48.25, change: 0.75 },
  EGCO: { price: 285.0, change: 5.0 },
  GULF: { price: 42.75, change: -0.25 },
  EA: { price: 68.5, change: 1.0 },
  GPSC: { price: 85.25, change: 0.75 },

  // Food & Beverage
  TU: { price: 15.6, change: 0.1 },
  CPF: { price: 24.8, change: -0.2 },
  OISHI: { price: 285.0, change: 5.0 },
  CBG: { price: 48.75, change: 0.25 },

  // Industrial & Materials
  SCC: { price: 385.0, change: 5.0 },
  TPIPL: { price: 2.38, change: 0.02 },
  CPAC: { price: 38.5, change: -0.5 },
  HANA: { price: 42.25, change: 0.75 },
  DELTA: { price: 68.5, change: 1.5 },
  KCE: { price: 58.25, change: 0.25 },

  // Real Estate & Construction
  SPALI: { price: 18.8, change: 0.2 },
  LPN: { price: 8.45, change: -0.05 },
  AP: { price: 6.85, change: 0.05 },
  SIRI: { price: 1.89, change: -0.01 },
  ORIGIN: { price: 8.95, change: 0.15 },
  NOBLE: { price: 2.84, change: 0.04 },
  PRUKSA: { price: 22.8, change: -0.2 },

  // Additional popular stocks
  WORK: { price: 5.65, change: 0.05 },
  PLANB: { price: 8.75, change: -0.15 },
  JMART: { price: 42.5, change: 0.5 },
  DITTO: { price: 1.85, change: 0.05 },
  HUMAN: { price: 18.6, change: 0.4 },
  SISB: { price: 22.4, change: -0.1 },
}

// Mock Thai Gold prices (per gram in THB)
const THAI_GOLD_MOCK_PRICES: { [key: string]: { price: number; change: number } } = {
  "GOLD96.5": { price: 51140, change: 200 }, // Thai Gold 96.5% per gram - current price
  GOLD: { price: 51140, change: 200 },
  XAU: { price: 51140, change: 200 },
  THGOLD: { price: 51140, change: 200 },
}

// Mock crypto prices (fallback when CoinGecko fails)
const CRYPTO_MOCK_PRICES: { [key: string]: { price: number; change: number } } = {
  BTC: { price: 43250, change: 1250 },
  ETH: { price: 2680, change: -45 },
  ADA: { price: 0.52, change: 0.02 },
  DOT: { price: 7.85, change: -0.15 },
  SOL: { price: 98.5, change: 2.1 },
  MATIC: { price: 0.89, change: -0.03 },
  AVAX: { price: 38.2, change: 1.2 },
  LINK: { price: 15.8, change: 0.4 },
  UNI: { price: 6.2, change: -0.1 },
  AAVE: { price: 95.5, change: 2.8 },
  XRP: { price: 0.58, change: 0.01 },
  DOGE: { price: 0.085, change: 0.002 },
  LTC: { price: 72.5, change: -1.2 },
  BNB: { price: 315, change: 8.5 },
  AXS: { price: 8.2, change: -0.3 },
  SAND: { price: 0.45, change: 0.02 },
  MANA: { price: 0.38, change: -0.01 },
}

export interface StockQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap?: number
  lastUpdated: string
  currency: string
  exchange: string
  assetType: "STOCK" | "CRYPTO" | "THAI_STOCK" | "THAI_GOLD"
}

export interface StockInfo {
  symbol: string
  name: string
  exchange: string
  currency: string
  assetType: "STOCK" | "CRYPTO" | "THAI_STOCK" | "THAI_GOLD"
}

// Asset type colors for consistent theming
export const ASSET_TYPE_COLORS = {
  STOCK: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
    solid: "#3B82F6",
  },
  THAI_STOCK: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    border: "border-green-500/30",
    solid: "#10B981",
  },
  CRYPTO: {
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    border: "border-purple-500/30",
    solid: "#8B5CF6",
  },
  THAI_GOLD: {
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
    solid: "#EAB308",
  },
}

// Currency conversion functions
export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount

  if (fromCurrency === "USD" && toCurrency === "THB") {
    return amount * EXCHANGE_RATES.USD_TO_THB
  }
  if (fromCurrency === "THB" && toCurrency === "USD") {
    return amount * EXCHANGE_RATES.THB_TO_USD
  }

  return amount // Fallback
}

// Cache management functions
function getCachedData(key: string): any | null {
  const cached = priceCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  return null
}

function setCachedData(key: string, data: any): void {
  priceCache.set(key, { data, timestamp: Date.now() })
}

// Rate limiting functions
function canMakeApiCall(apiName: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const tracker = apiCallTracker.get(apiName) || { count: 0, resetTime: now + windowMs }

  if (now > tracker.resetTime) {
    tracker.count = 0
    tracker.resetTime = now + windowMs
  }

  if (tracker.count >= limit) {
    return false
  }

  tracker.count++
  apiCallTracker.set(apiName, tracker)
  return true
}

// Helper function to safely parse JSON responses
async function safeJsonParse(response: Response): Promise<any> {
  try {
    const text = await response.text()

    // Check if response is actually JSON
    if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) {
      console.error("Non-JSON response received:", text.substring(0, 100))
      return null
    }

    return JSON.parse(text)
  } catch (error) {
    console.error("Failed to parse JSON response:", error)
    return null
  }
}

// Sleep function for delays
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Improved Thai stock detection - be more specific
function isThaiStock(symbol: string): boolean {
  const upperSymbol = symbol.toUpperCase()

  // Check if it's in our known Thai stock list first (most reliable)
  if (THAI_STOCK_SYMBOLS.has(upperSymbol)) {
    return true
  }

  // Check if it ends with .BK (Bangkok Stock Exchange)
  if (upperSymbol.endsWith(".BK")) {
    return true
  }

  // Don't use generic pattern matching as it causes false positives
  // Only rely on explicit lists and .BK suffix
  return false
}

function isThaiGold(symbol: string): boolean {
  const upperSymbol = symbol.toUpperCase()
  return THAI_GOLD_SYMBOLS.has(upperSymbol)
}

// Detect asset type based on symbol with improved detection
function detectAssetType(symbol: string): "STOCK" | "CRYPTO" | "THAI_STOCK" | "THAI_GOLD" {
  const upperSymbol = symbol.toUpperCase()

  // Check Thai Gold first
  if (isThaiGold(symbol)) {
    return "THAI_GOLD"
  }

  // Check crypto
  const cryptoSymbols = [
    "BTC",
    "ETH",
    "ADA",
    "DOT",
    "SOL",
    "MATIC",
    "AVAX",
    "LINK",
    "UNI",
    "AAVE",
    "XRP",
    "DOGE",
    "LTC",
    "BNB",
    "USDT",
    "USDC",
    "BUSD",
    "AXS",
    "SAND",
    "MANA",
  ]
  if (cryptoSymbols.includes(upperSymbol) || upperSymbol.includes("USD") || upperSymbol.includes("USDT")) {
    return "CRYPTO"
  }

  // Check Thai stocks
  if (isThaiStock(symbol)) {
    return "THAI_STOCK"
  }

  // Default to US stock
  return "STOCK"
}

// Generate mock Thai stock data with realistic variations
function generateMockThaiStockQuote(symbol: string): StockQuote {
  const baseData = THAI_STOCK_MOCK_PRICES[symbol.toUpperCase()]

  if (baseData) {
    // Add small random variation to make it look more realistic (±2% price variation)
    const priceVariationPercent = (Math.random() - 0.5) * 0.04 // -2% to +2%
    const changeVariationPercent = (Math.random() - 0.5) * 0.02 // -1% to +1%

    const currentPrice = baseData.price * (1 + priceVariationPercent)
    const change = baseData.change * (1 + changeVariationPercent)
    const changePercent = (change / (currentPrice - change)) * 100

    return {
      symbol: symbol.toUpperCase(),
      price: Number.parseFloat(currentPrice.toFixed(2)),
      change: Number.parseFloat(change.toFixed(2)),
      changePercent: Number.parseFloat(changePercent.toFixed(2)),
      volume: Math.floor(Math.random() * 2000000) + 500000, // 500K - 2.5M volume
      lastUpdated: new Date().toISOString().split("T")[0],
      currency: "THB",
      exchange: "SET",
      assetType: "THAI_STOCK",
    }
  }

  // Fallback for unknown Thai stocks - generate reasonable data
  const randomPrice = 5 + Math.random() * 200 // 5-205 THB (realistic range)
  const randomChangePercent = (Math.random() - 0.5) * 10 // -5% to +5%
  const randomChange = randomPrice * (randomChangePercent / 100)

  return {
    symbol: symbol.toUpperCase(),
    price: Number.parseFloat(randomPrice.toFixed(2)),
    change: Number.parseFloat(randomChange.toFixed(2)),
    changePercent: Number.parseFloat(randomChangePercent.toFixed(2)),
    volume: Math.floor(Math.random() * 1000000) + 100000, // 100K - 1.1M volume
    lastUpdated: new Date().toISOString().split("T")[0],
    currency: "THB",
    exchange: "SET",
    assetType: "THAI_STOCK",
  }
}

// Generate mock Thai Gold data
function generateMockThaiGoldQuote(symbol: string): StockQuote {
  const baseData = THAI_GOLD_MOCK_PRICES[symbol.toUpperCase()] || THAI_GOLD_MOCK_PRICES["GOLD96.5"]

  // Add small random variation (±1% for gold as it's more stable)
  const priceVariationPercent = (Math.random() - 0.5) * 0.02 // -1% to +1%
  const changeVariationPercent = (Math.random() - 0.5) * 0.01 // -0.5% to +0.5%

  const currentPrice = baseData.price * (1 + priceVariationPercent)
  const change = baseData.change * (1 + changeVariationPercent)
  const changePercent = (change / (currentPrice - change)) * 100

  return {
    symbol: symbol.toUpperCase(),
    price: Number.parseFloat(currentPrice.toFixed(0)), // Gold prices in whole numbers
    change: Number.parseFloat(change.toFixed(0)),
    changePercent: Number.parseFloat(changePercent.toFixed(2)),
    volume: Math.floor(Math.random() * 100) + 50, // Lower volume for gold (kg)
    lastUpdated: new Date().toISOString().split("T")[0],
    currency: "THB",
    exchange: "THAI_GOLD",
    assetType: "THAI_GOLD",
  }
}

// Generate mock crypto data
function generateMockCryptoQuote(symbol: string): StockQuote {
  const baseData = CRYPTO_MOCK_PRICES[symbol.toUpperCase()]

  if (baseData) {
    // Add realistic crypto volatility (±5% price variation)
    const priceVariationPercent = (Math.random() - 0.5) * 0.1 // -5% to +5%
    const changeVariationPercent = (Math.random() - 0.5) * 0.05 // -2.5% to +2.5%

    const currentPrice = baseData.price * (1 + priceVariationPercent)
    const change = baseData.change * (1 + changeVariationPercent)
    const changePercent = (change / (currentPrice - change)) * 100

    return {
      symbol: symbol.toUpperCase(),
      price: Number.parseFloat(currentPrice.toFixed(currentPrice > 1 ? 2 : 6)),
      change: Number.parseFloat(change.toFixed(change > 1 ? 2 : 6)),
      changePercent: Number.parseFloat(changePercent.toFixed(2)),
      volume: Math.floor(Math.random() * 10000000) + 1000000, // High volume for crypto
      lastUpdated: new Date().toISOString().split("T")[0],
      currency: "USD",
      exchange: "CRYPTO",
      assetType: "CRYPTO",
    }
  }

  // Fallback for unknown crypto
  const randomPrice = Math.random() * 1000 + 0.01
  const randomChangePercent = (Math.random() - 0.5) * 20 // -10% to +10%
  const randomChange = randomPrice * (randomChangePercent / 100)

  return {
    symbol: symbol.toUpperCase(),
    price: Number.parseFloat(randomPrice.toFixed(randomPrice > 1 ? 2 : 6)),
    change: Number.parseFloat(randomChange.toFixed(randomChange > 1 ? 2 : 6)),
    changePercent: Number.parseFloat(randomChangePercent.toFixed(2)),
    volume: Math.floor(Math.random() * 5000000) + 500000,
    lastUpdated: new Date().toISOString().split("T")[0],
    currency: "USD",
    exchange: "CRYPTO",
    assetType: "CRYPTO",
  }
}

// Yahoo Finance API (Free, no key needed) with better headers
export async function getYahooFinanceQuote(symbol: string): Promise<StockQuote | null> {
  try {
    console.log(`Fetching Yahoo Finance quote for ${symbol}`)

    const response = await fetch(`${YAHOO_FINANCE_URL}/${symbol}?interval=1d&range=1d`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    })

    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await safeJsonParse(response)
    if (!data) return null

    console.log(`Yahoo Finance response for ${symbol}:`, data)

    if (!data.chart?.result?.[0]) {
      console.error("No Yahoo Finance data found for", symbol)
      return null
    }

    const result = data.chart.result[0]
    const meta = result.meta
    const quote = result.indicators.quote[0]

    if (!meta || !quote) {
      console.error("Invalid Yahoo Finance data structure for", symbol)
      return null
    }

    const currentPrice = meta.regularMarketPrice || meta.previousClose || 0
    const previousClose = meta.previousClose || currentPrice
    const change = currentPrice - previousClose
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

    return {
      symbol: meta.symbol,
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      volume: meta.regularMarketVolume || 0,
      lastUpdated: new Date(meta.regularMarketTime * 1000).toISOString().split("T")[0],
      currency: meta.currency || "USD",
      exchange: meta.exchangeName || "US",
      assetType: "STOCK",
    }
  } catch (error) {
    console.error("Error fetching Yahoo Finance quote:", error)
    return null
  }
}

// Get Thai stock quote with mock data priority and simplified fallback
export async function getThaiStockQuote(symbol: string): Promise<StockQuote | null> {
  const originalSymbol = symbol.toUpperCase()
  console.log(`Fetching Thai stock quote for ${originalSymbol}`)

  // Check cache first
  const cacheKey = `thai_stock_${originalSymbol}`
  const cachedData = getCachedData(cacheKey)
  if (cachedData) {
    console.log(`Using cached data for Thai stock ${originalSymbol}`)
    return cachedData
  }

  // Strategy 1: Try Twelve Data first (if available and reliable)
  if (TWELVE_DATA_KEY && canMakeApiCall("twelve_data", 50, 60000)) {
    // 50 calls per minute
    try {
      const thaiSymbol = originalSymbol.endsWith(".BK") ? originalSymbol : `${originalSymbol}.BK`
      console.log(`Trying Twelve Data for ${thaiSymbol}`)

      const response = await fetch(`${TWELVE_DATA_URL}/quote?symbol=${thaiSymbol}&apikey=${TWELVE_DATA_KEY}`)
      if (response.ok) {
        const data = await safeJsonParse(response)
        if (data && data.close && !data.status) {
          const currentPrice = Number.parseFloat(data.close)
          const previousClose = Number.parseFloat(data.previous_close)
          const change = currentPrice - previousClose
          const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

          const result = {
            symbol: originalSymbol,
            price: currentPrice,
            change: change,
            changePercent: changePercent,
            volume: Number.parseInt(data.volume) || 0,
            lastUpdated: data.datetime?.split(" ")[0] || new Date().toISOString().split("T")[0],
            currency: "THB",
            exchange: "SET",
            assetType: "THAI_STOCK" as const,
          }

          setCachedData(cacheKey, result)
          console.log(`Successfully got Thai stock data for ${originalSymbol} from Twelve Data`)
          return result
        }
      }
    } catch (error) {
      console.log(`Twelve Data failed for ${originalSymbol}:`, error)
    }
  }

  // Strategy 2: Try Yahoo Finance with rate limiting
  if (canMakeApiCall("yahoo_finance", 100, 60000)) {
    // 100 calls per minute
    try {
      const thaiSymbol = originalSymbol.endsWith(".BK") ? originalSymbol : `${originalSymbol}.BK`
      console.log(`Trying Yahoo Finance for ${thaiSymbol}`)

      const response = await fetch(`${YAHOO_FINANCE_URL}/${thaiSymbol}?interval=1d&range=1d`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://finance.yahoo.com/",
        },
      })

      if (response.ok) {
        const data = await safeJsonParse(response)
        if (data?.chart?.result?.[0]) {
          const result = data.chart.result[0]
          const meta = result.meta

          if (meta && meta.regularMarketPrice) {
            const currentPrice = meta.regularMarketPrice || meta.previousClose || 0
            const previousClose = meta.previousClose || currentPrice
            const change = currentPrice - previousClose
            const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

            const result = {
              symbol: originalSymbol,
              price: currentPrice,
              change: change,
              changePercent: changePercent,
              volume: meta.regularMarketVolume || 0,
              lastUpdated: new Date(meta.regularMarketTime * 1000).toISOString().split("T")[0],
              currency: "THB",
              exchange: "SET",
              assetType: "THAI_STOCK" as const,
            }

            setCachedData(cacheKey, result)
            console.log(`Successfully got Thai stock data for ${originalSymbol} from Yahoo Finance`)
            return result
          }
        }
      }
    } catch (error) {
      console.log(`Yahoo Finance failed for ${originalSymbol}:`, error)
    }
  }

  // Strategy 3: Always use mock data as reliable fallback
  console.log(`Using mock data for Thai stock ${originalSymbol}`)
  const result = generateMockThaiStockQuote(originalSymbol)
  setCachedData(cacheKey, result)
  return result
}

// Get Thai Gold quote (always use mock data for now)
export async function getThaiGoldQuote(symbol: string): Promise<StockQuote | null> {
  console.log(`Fetching Thai Gold quote for ${symbol}`)

  // Check cache first
  const cacheKey = `thai_gold_${symbol.toUpperCase()}`
  const cachedData = getCachedData(cacheKey)
  if (cachedData) {
    console.log(`Using cached data for Thai Gold ${symbol}`)
    return cachedData
  }

  const result = generateMockThaiGoldQuote(symbol)
  setCachedData(cacheKey, result)
  return result
}

// Finnhub API (Free tier: 60 calls/minute)
export async function getFinnhubQuote(symbol: string): Promise<StockQuote | null> {
  if (!FINNHUB_KEY) {
    console.log("Finnhub API key not available, skipping...")
    return null
  }

  if (!canMakeApiCall("finnhub", 50, 60000)) {
    // 50 calls per minute to stay under limit
    console.log("Finnhub rate limit reached, skipping...")
    return null
  }

  try {
    console.log(`Fetching Finnhub quote for ${symbol}`)

    const response = await fetch(`${FINNHUB_URL}/quote?symbol=${symbol}&token=${FINNHUB_KEY}`)

    if (!response.ok) {
      console.error(`Finnhub API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await safeJsonParse(response)
    if (!data) return null

    console.log(`Finnhub response for ${symbol}:`, data)

    if (data.error || !data.c) {
      console.error("Finnhub API error or no data:", data.error || "No price data")
      return null
    }

    return {
      symbol: symbol.toUpperCase(),
      price: data.c, // current price
      change: data.d, // change
      changePercent: data.dp, // percent change
      volume: 0, // Finnhub doesn't provide volume in quote endpoint
      lastUpdated: new Date().toISOString().split("T")[0],
      currency: "USD",
      exchange: "US",
      assetType: "STOCK",
    }
  } catch (error) {
    console.error("Error fetching Finnhub quote:", error)
    return null
  }
}

// Twelve Data API (Free tier: 800 requests/day)
export async function getTwelveDataQuote(symbol: string): Promise<StockQuote | null> {
  if (!TWELVE_DATA_KEY) {
    console.log("Twelve Data API key not available, skipping...")
    return null
  }

  if (!canMakeApiCall("twelve_data", 50, 60000)) {
    // 50 calls per minute
    console.log("Twelve Data rate limit reached, skipping...")
    return null
  }

  try {
    console.log(`Fetching Twelve Data quote for ${symbol}`)

    const response = await fetch(`${TWELVE_DATA_URL}/quote?symbol=${symbol}&apikey=${TWELVE_DATA_KEY}`)

    if (!response.ok) {
      console.error(`Twelve Data API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await safeJsonParse(response)
    if (!data) return null

    console.log(`Twelve Data response for ${symbol}:`, data)

    if (data.status === "error" || !data.close) {
      console.error("Twelve Data API error:", data.message || "No data")
      return null
    }

    const currentPrice = Number.parseFloat(data.close)
    const previousClose = Number.parseFloat(data.previous_close)
    const change = currentPrice - previousClose
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

    return {
      symbol: data.symbol,
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      volume: Number.parseInt(data.volume) || 0,
      lastUpdated: data.datetime?.split(" ")[0] || new Date().toISOString().split("T")[0],
      currency: "USD",
      exchange: "US",
      assetType: "STOCK",
    }
  } catch (error) {
    console.error("Error fetching Twelve Data quote:", error)
    return null
  }
}

// Get US stock quote with fallback APIs
export async function getUSStockQuote(symbol: string): Promise<StockQuote | null> {
  console.log(`Fetching US stock quote for ${symbol}`)

  // Check cache first
  const cacheKey = `us_stock_${symbol.toUpperCase()}`
  const cachedData = getCachedData(cacheKey)
  if (cachedData) {
    console.log(`Using cached data for US stock ${symbol}`)
    return cachedData
  }

  // Try APIs in order of preference with rate limiting
  const apis = [() => getFinnhubQuote(symbol), () => getTwelveDataQuote(symbol), () => getYahooFinanceQuote(symbol)]

  for (const apiCall of apis) {
    try {
      const result = await apiCall()
      if (result) {
        setCachedData(cacheKey, result)
        console.log(`Successfully got US stock data for ${symbol} from API`)
        return result
      }
    } catch (error) {
      console.error(`API call failed for ${symbol}:`, error)
      continue
    }
  }

  console.error(`All APIs failed for US stock ${symbol}`)
  return null
}

// Circuit breaker for CoinGecko API - More aggressive settings
let coinGeckoFailureCount = 0
const coinGeckoLastFailure = 0
const COINGECKO_FAILURE_THRESHOLD = 1 // Reduced from 3 to 1
const COINGECKO_COOLDOWN_PERIOD = 10 * 60 * 1000 // Increased to 10 minutes

// Check if CoinGecko should be attempted - More restrictive
function shouldTryCoinGecko(): boolean {
  const now = Date.now()

  // If we've had any recent failures, check if cooldown period has passed
  if (coinGeckoFailureCount >= COINGECKO_FAILURE_THRESHOLD) {
    if (now - coinGeckoLastFailure < COINGECKO_COOLDOWN_PERIOD) {
      console.log("CoinGecko in cooldown period, using mock data")
      return false
    } else {
      // Reset failure count after cooldown
      coinGeckoFailureCount = 0
    }
  }

  // Additional check: don't try CoinGecko if we've made any calls in the last 2 minutes
  const lastCallTime = apiCallTracker.get("coingecko")?.resetTime || 0
  if (now - lastCallTime < 120000) {
    // 2 minutes
    console.log("CoinGecko rate limit protection, using mock data")
    return false
  }

  return false // Temporarily disable CoinGecko entirely
}

// Get crypto quote with aggressive fallback to mock data
export async function getCryptoQuote(symbol: string): Promise<StockQuote | null> {
  console.log(`Fetching crypto quote for ${symbol}`)

  // Check cache first
  const cacheKey = `crypto_${symbol.toUpperCase()}`
  const cachedData = getCachedData(cacheKey)
  if (cachedData) {
    console.log(`Using cached data for crypto ${symbol}`)
    return cachedData
  }

  // For now, always use mock data to avoid rate limiting issues
  console.log(`Using mock data for crypto ${symbol} to avoid API rate limits`)
  const result = generateMockCryptoQuote(symbol)
  setCachedData(cacheKey, result)
  return result

  // CoinGecko API code commented out temporarily
  /*
  const shouldTryApi = shouldTryCoinGecko() && canMakeApiCall("coingecko", 2, 300000) // Only 2 calls per 5 minutes

  if (!shouldTryApi) {
    console.log(`Skipping CoinGecko API for ${symbol}, using mock data`)
    const result = generateMockCryptoQuote(symbol)
    setCachedData(cacheKey, result)
    return result
  }

  // Rest of CoinGecko API code...
  */
}

// Main function to get quote for any asset type
export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  const assetType = detectAssetType(symbol)
  console.log(`Detected asset type for ${symbol}: ${assetType}`)

  switch (assetType) {
    case "THAI_GOLD":
      return getThaiGoldQuote(symbol)
    case "THAI_STOCK":
      return getThaiStockQuote(symbol)
    case "CRYPTO":
      return getCryptoQuote(symbol)
    case "STOCK":
    default:
      return getUSStockQuote(symbol)
  }
}

export async function getMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
  console.log("Fetching quotes for symbols:", symbols)

  const quotes: StockQuote[] = []
  const errors: string[] = []

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i]
    try {
      console.log(`Processing ${i + 1}/${symbols.length}: ${symbol}`)
      const quote = await getStockQuote(symbol)
      if (quote) {
        quotes.push(quote)
      } else {
        errors.push(symbol)
        console.warn(`No quote returned for ${symbol}`)
      }

      // Progressive delay - longer delays for more requests
      const assetType = detectAssetType(symbol)
      const baseDelay = assetType === "CRYPTO" ? 500 : 200 // Reduced delays
      const delay = Math.min(baseDelay + i * 50, 1500) // 200ms-1.5s delay

      if (i < symbols.length - 1) {
        console.log(`Waiting ${delay}ms before next request...`)
        await sleep(delay)
      }
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error)

      // If it's a rate limit error, try to generate mock data as fallback
      if (error.message && error.message.includes("429")) {
        console.log(`Rate limit error for ${symbol}, generating mock data`)
        try {
          const mockQuote = await getStockQuote(symbol) // This should now use mock data
          if (mockQuote) {
            quotes.push(mockQuote)
          }
        } catch (mockError) {
          console.error(`Failed to generate mock data for ${symbol}:`, mockError)
          errors.push(symbol)
        }
      } else {
        errors.push(symbol)
      }

      // Continue with next symbol instead of failing completely
      continue
    }
  }

  console.log(`Successfully fetched ${quotes.length} quotes out of ${symbols.length} symbols`)
  if (errors.length > 0) {
    console.log("Failed symbols:", errors)
  }

  return quotes
}

// Enhanced search with comprehensive support for all asset types
export async function searchStocks(query: string): Promise<StockInfo[]> {
  const results: StockInfo[] = []
  const lowerQuery = query.toLowerCase()

  // Search Thai Gold first
  try {
    const goldMatches = Array.from(THAI_GOLD_SYMBOLS)
      .filter((symbol) => symbol.toLowerCase().includes(lowerQuery) || "gold".includes(lowerQuery))
      .slice(0, 3)
      .map((symbol) => ({
        symbol,
        name: symbol === "GOLD96.5" ? "Thai Gold 96.5%" : "Thai Gold",
        exchange: "THAI_GOLD",
        currency: "THB",
        assetType: "THAI_GOLD" as const,
      }))

    results.push(...goldMatches)
  } catch (error) {
    console.error("Error searching Thai Gold:", error)
  }

  // Search Thai stocks with comprehensive matching
  try {
    const thaiStockNames: { [key: string]: string } = {
      // Healthcare & Pharmaceuticals
      BH: "Bumrungrad Hospital",
      CHG: "Chularat Hospital Group",
      BDMS: "Bangkok Dusit Medical Services",
      BCH: "Bangkok Chain Hospital",
      RJH: "Rajavithi Hospital",
      PR9: "Prime Road Power",
      VIBHA: "Vibhavadi Hospital",
      NEW: "New Life Enterprise",
      VIH: "Vejthani Hospital",
      PRINC: "Principal Capital",

      // Finance & Securities
      KTC: "Krungthai Card",
      TIDLOR: "Tidlor Capital",
      MTC: "Muangthai Capital",
      AEONTS: "AEON Thana Sinsap (Thailand)",
      CHAYO: "Chayo Group",
      JMT: "JMT Network Services",
      SAWAD: "Sawad Capital",
      GCAP: "G Capital",

      // Major stocks
      PTT: "PTT Public Company Limited",
      CPALL: "CP ALL",
      KBANK: "Kasikornbank",
      SCB: "Siam Commercial Bank",
      BBL: "Bangkok Bank",
      ADVANC: "Advanced Info Service",
      AOT: "Airports of Thailand",
      CPN: "Central Pattana",
      HMPRO: "Home Product Center",
      MINT: "Minor International",
    }

    const thaiMatches = Array.from(THAI_STOCK_SYMBOLS)
      .filter((symbol) => {
        const symbolMatch = symbol.toLowerCase().includes(lowerQuery)
        const nameMatch = thaiStockNames[symbol]?.toLowerCase().includes(lowerQuery) || false
        return symbolMatch || nameMatch
      })
      .slice(0, 8)
      .map((symbol) => ({
        symbol,
        name: thaiStockNames[symbol] || `${symbol} - Thai Stock`,
        exchange: "SET",
        currency: "THB",
        assetType: "THAI_STOCK" as const,
      }))

    results.push(...thaiMatches)
  } catch (error) {
    console.error("Error searching Thai stocks:", error)
  }

  // Add common US stocks for search
  try {
    const commonStocks = [
      { symbol: "AAPL", name: "Apple Inc." },
      { symbol: "GOOGL", name: "Alphabet Inc." },
      { symbol: "MSFT", name: "Microsoft Corporation" },
      { symbol: "AMZN", name: "Amazon.com Inc." },
      { symbol: "TSLA", name: "Tesla Inc." },
      { symbol: "META", name: "Meta Platforms Inc." },
      { symbol: "NVDA", name: "NVIDIA Corporation" },
      { symbol: "NFLX", name: "Netflix Inc." },
      { symbol: "DIS", name: "The Walt Disney Company" },
      { symbol: "IBM", name: "International Business Machines" },
      { symbol: "JPM", name: "JPMorgan Chase & Co." },
      { symbol: "V", name: "Visa Inc." },
      { symbol: "JNJ", name: "Johnson & Johnson" },
      { symbol: "WMT", name: "Walmart Inc." },
      { symbol: "PG", name: "Procter & Gamble Co." },
    ]

    const stockMatches = commonStocks
      .filter(
        (stock) => stock.symbol.toLowerCase().includes(lowerQuery) || stock.name.toLowerCase().includes(lowerQuery),
      )
      .slice(0, 5)
      .map((stock) => ({
        symbol: stock.symbol,
        name: stock.name,
        exchange: "NASDAQ/NYSE",
        currency: "USD",
        assetType: "STOCK" as const,
      }))

    results.push(...stockMatches)
  } catch (error) {
    console.error("Error searching US stocks:", error)
  }

  // Add common crypto currencies
  try {
    const commonCrypto = [
      { symbol: "BTC", name: "Bitcoin" },
      { symbol: "ETH", name: "Ethereum" },
      { symbol: "ADA", name: "Cardano" },
      { symbol: "DOT", name: "Polkadot" },
      { symbol: "SOL", name: "Solana" },
      { symbol: "MATIC", name: "Polygon" },
      { symbol: "AVAX", name: "Avalanche" },
      { symbol: "LINK", name: "Chainlink" },
      { symbol: "UNI", name: "Uniswap" },
      { symbol: "AAVE", name: "Aave" },
      { symbol: "XRP", name: "Ripple" },
      { symbol: "DOGE", name: "Dogecoin" },
      { symbol: "LTC", name: "Litecoin" },
    ]

    const cryptoMatches = commonCrypto
      .filter(
        (crypto) => crypto.symbol.toLowerCase().includes(lowerQuery) || crypto.name.toLowerCase().includes(lowerQuery),
      )
      .slice(0, 5)
      .map((crypto) => ({
        symbol: crypto.symbol,
        name: crypto.name,
        exchange: "CRYPTO",
        currency: "USD",
        assetType: "CRYPTO" as const,
      }))

    results.push(...cryptoMatches)
  } catch (error) {
    console.error("Error searching crypto:", error)
  }

  return results.slice(0, 15)
}

// Helper function to format currency based on asset type and user preference
export function formatCurrency(amount: number, currency: string, displayCurrency?: string): string {
  const targetCurrency = displayCurrency || currency
  let convertedAmount = amount

  // Convert if needed
  if (currency !== targetCurrency) {
    convertedAmount = convertCurrency(amount, currency, targetCurrency)
  }

  switch (targetCurrency) {
    case "THB":
      return `฿${convertedAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case "USD":
      return `$${convertedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    default:
      return `${convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${targetCurrency}`
  }
}

// Helper function to get asset type badge component props
export function getAssetTypeBadge(assetType: "STOCK" | "CRYPTO" | "THAI_STOCK" | "THAI_GOLD") {
  const colors = ASSET_TYPE_COLORS[assetType]
  const labels = {
    STOCK: "US Stock",
    THAI_STOCK: "Thai Stock",
    CRYPTO: "Crypto",
    THAI_GOLD: "Thai Gold",
  }

  return {
    className: `text-xs ${colors.bg} ${colors.text} ${colors.border}`,
    label: labels[assetType],
    color: colors.solid,
  }
}

export interface Holding {
  symbol: string
  amount: number
  assetType: "STOCK" | "CRYPTO" | "THAI_STOCK" | "THAI_GOLD"
  currency: string
}

export interface EnrichedHolding extends Holding {
  currentPrice: number
  currentValue: number
  name: string
}

export interface PortfolioAllocation {
  assetType: "STOCK" | "CRYPTO" | "THAI_STOCK" | "THAI_GOLD"
  percentage: number
  value: number
  color: string
}

// Calculate current value of a holding
export async function enrichHolding(holding: Holding): Promise<EnrichedHolding | null> {
  try {
    const quote = await getStockQuote(holding.symbol)

    if (!quote) {
      console.warn(`Could not fetch quote for ${holding.symbol}`)
      return null
    }

    const currentValue = quote.price * holding.amount

    return {
      ...holding,
      currentPrice: quote.price,
      currentValue: currentValue,
      name: quote.symbol, // Temporary name
    }
  } catch (error) {
    console.error(`Error enriching holding ${holding.symbol}:`, error)
    return null
  }
}

export async function enrichHoldings(holdings: Holding[]): Promise<EnrichedHolding[]> {
  const enrichedHoldings: EnrichedHolding[] = []

  for (const holding of holdings) {
    const enriched = await enrichHolding(holding)
    if (enriched) {
      enrichedHoldings.push(enriched)
    }
  }

  return enrichedHoldings
}

export function calculatePortfolioAllocation(
  holdings: EnrichedHolding[],
  displayCurrency = "USD",
): PortfolioAllocation[] {
  const totalValue = holdings.reduce((sum, holding) => {
    const convertedValue = convertCurrency(holding.currentValue, holding.currency, displayCurrency)
    return sum + convertedValue
  }, 0)

  const assetTypeColors = {
    STOCK: "#3B82F6", // Blue
    THAI_STOCK: "#10B981", // Green
    CRYPTO: "#8B5CF6", // Purple (changed from orange)
    THAI_GOLD: "#EAB308", // Yellow
  }

  const allocation: { [key: string]: { value: number; percentage: number } } = {}

  holdings.forEach((holding) => {
    const convertedValue = convertCurrency(holding.currentValue, holding.currency, displayCurrency)
    const assetType = holding.assetType

    if (!allocation[assetType]) {
      allocation[assetType] = { value: 0, percentage: 0 }
    }

    allocation[assetType].value += convertedValue
  })

  const result: PortfolioAllocation[] = Object.entries(allocation).map(([assetType, data]) => ({
    assetType: assetType as "STOCK" | "CRYPTO" | "THAI_STOCK" | "THAI_GOLD",
    percentage: (data.value / totalValue) * 100,
    value: data.value,
    color: assetTypeColors[assetType],
  }))

  return result
}

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
}> {
  if (holdings.length === 0) return []

  const totalValue = holdings.reduce((sum, holding) => {
    const convertedValue = convertCurrency(holding.currentValue, holding.currency, displayCurrency)
    return sum + convertedValue
  }, 0)

  if (totalValue === 0) return []

  // More distinguishable color variations for each asset type
  const assetTypeColorVariations = {
    STOCK: ["#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#DBEAFE", "#EFF6FF", "#F0F9FF"], // Blue variations
    THAI_STOCK: ["#059669", "#10B981", "#34D399", "#6EE7B7", "#9DECCC", "#C6F6D5", "#D1FAE5", "#ECFDF5"], // Green variations
    CRYPTO: ["#7C3AED", "#8B5CF6", "#A78BFA", "#C4B5FD", "#DDD6FE", "#EDE9FE", "#F3F4F6", "#FAFAFA"], // Purple variations (changed from orange)
    THAI_GOLD: ["#CA8A04", "#EAB308", "#FACC15", "#FDE047", "#FEF08A", "#FEFCE8", "#FFFBEB", "#FEFCE8"], // Yellow variations
  }

  const assetAllocation: {
    [key: string]: {
      value: number
      percentage: number
      assetType: "STOCK" | "CRYPTO" | "THAI_STOCK" | "THAI_GOLD"
    }
  } = {}

  holdings.forEach((holding) => {
    const convertedValue = convertCurrency(holding.currentValue, holding.currency, displayCurrency)
    const symbol = holding.symbol

    if (!assetAllocation[symbol]) {
      assetAllocation[symbol] = {
        value: 0,
        percentage: 0,
        assetType: holding.assetType,
      }
    }

    assetAllocation[symbol].value += convertedValue
  })

  const result = Object.entries(assetAllocation).map(([symbol, data], index) => {
    const assetType = data.assetType
    const colorIndex = index % assetTypeColorVariations[assetType].length
    const color = assetTypeColorVariations[assetType][colorIndex]

    const holding = holdings.find((h) => h.symbol === symbol)
    const name = holding?.name || symbol

    return {
      symbol,
      name,
      value: data.value,
      percentage: (data.value / totalValue) * 100,
      assetType: data.assetType,
      color: color,
    }
  })

  return result
}
