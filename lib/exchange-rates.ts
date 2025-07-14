// Real-time exchange rate management with multiple API sources

// Exchange rate cache
const exchangeRateCache = new Map<string, { rate: number; timestamp: number }>()
const EXCHANGE_RATE_CACHE_DURATION = 30 * 60 * 1000 // 30 minutes cache

// Rate limiting for exchange rate APIs
const exchangeApiCallTracker = new Map<string, { count: number; resetTime: number }>()
const EXCHANGE_API_LIMITS = {
  EXCHANGERATE_API: { limit: 1500, windowMs: 60 * 60 * 1000 }, // 1500 per hour (free tier)
  FIXER: { limit: 100, windowMs: 60 * 60 * 1000 }, // 100 per hour (free tier)
  BOT: { limit: 60, windowMs: 60 * 1000 }, // 60 per minute
}

// Fallback rates (updated periodically)
const FALLBACK_RATES = {
  USD_TO_THB: 35.5,
  THB_TO_USD: 1 / 35.5,
  EUR_TO_USD: 1.08,
  GBP_TO_USD: 1.25,
  JPY_TO_USD: 0.0067,
  lastUpdated: "2025-01-14",
}

export interface ExchangeRate {
  from: string
  to: string
  rate: number
  source: string
  timestamp: string
  cached: boolean
}

// Rate limiting check for exchange APIs
function canMakeExchangeApiCall(apiName: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const tracker = exchangeApiCallTracker.get(apiName) || { count: 0, resetTime: now + windowMs }

  if (now > tracker.resetTime) {
    tracker.count = 0
    tracker.resetTime = now + windowMs
  }

  if (tracker.count >= limit) {
    console.warn(`⚠️ Exchange rate API limit exceeded for ${apiName}: ${tracker.count}/${limit}`)
    return false
  }

  tracker.count++
  exchangeApiCallTracker.set(apiName, tracker)
  return true
}

// Get cached exchange rate
function getCachedExchangeRate(from: string, to: string): ExchangeRate | null {
  const cacheKey = `${from}_${to}`
  const cached = exchangeRateCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < EXCHANGE_RATE_CACHE_DURATION) {
    return {
      from,
      to,
      rate: cached.rate,
      source: "Cache",
      timestamp: new Date(cached.timestamp).toISOString(),
      cached: true,
    }
  }

  return null
}

// Set cached exchange rate
function setCachedExchangeRate(from: string, to: string, rate: number): void {
  const cacheKey = `${from}_${to}`
  exchangeRateCache.set(cacheKey, { rate, timestamp: Date.now() })

  // Also cache the inverse rate
  const inverseCacheKey = `${to}_${from}`
  exchangeRateCache.set(inverseCacheKey, { rate: 1 / rate, timestamp: Date.now() })
}

// 1. ExchangeRate-API.com (Free, reliable, no API key required)
async function getExchangeRateFromExchangeRateAPI(from: string, to: string): Promise<ExchangeRate | null> {
  if (
    !canMakeExchangeApiCall(
      "EXCHANGERATE_API",
      EXCHANGE_API_LIMITS.EXCHANGERATE_API.limit,
      EXCHANGE_API_LIMITS.EXCHANGERATE_API.windowMs,
    )
  ) {
    return null
  }

  try {
    console.log(`🔄 Fetching ${from}/${to} from ExchangeRate-API...`)

    const url = `https://api.exchangerate-api.com/v4/latest/${from}`

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Investment-Tracker/1.0",
      },
    })

    if (!response.ok) {
      console.error(`ExchangeRate-API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    if (!data.rates || !data.rates[to]) {
      console.error(`No exchange rate found for ${from}/${to} in ExchangeRate-API`)
      return null
    }

    const rate = Number(data.rates[to])
    const exchangeRate: ExchangeRate = {
      from,
      to,
      rate,
      source: "ExchangeRate-API",
      timestamp: new Date().toISOString(),
      cached: false,
    }

    setCachedExchangeRate(from, to, rate)
    console.log(`✅ Got ${from}/${to} = ${rate} from ExchangeRate-API`)

    return exchangeRate
  } catch (error) {
    console.error(`Error fetching exchange rate from ExchangeRate-API:`, error)
    return null
  }
}

// 2. Fixer.io API (backup, requires API key)
async function getExchangeRateFromFixer(from: string, to: string): Promise<ExchangeRate | null> {
  const FIXER_API_KEY = process.env.FIXER_API_KEY

  if (!FIXER_API_KEY) {
    console.log("No Fixer API key available")
    return null
  }

  if (!canMakeExchangeApiCall("FIXER", EXCHANGE_API_LIMITS.FIXER.limit, EXCHANGE_API_LIMITS.FIXER.windowMs)) {
    return null
  }

  try {
    console.log(`🔄 Fetching ${from}/${to} from Fixer.io...`)

    const url = `https://api.fixer.io/latest?access_key=${FIXER_API_KEY}&base=${from}&symbols=${to}`

    const response = await fetch(url)

    if (!response.ok) {
      console.error(`Fixer.io error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    if (!data.success || !data.rates || !data.rates[to]) {
      console.error(`No exchange rate found for ${from}/${to} in Fixer.io`)
      return null
    }

    const rate = Number(data.rates[to])
    const exchangeRate: ExchangeRate = {
      from,
      to,
      rate,
      source: "Fixer.io",
      timestamp: new Date().toISOString(),
      cached: false,
    }

    setCachedExchangeRate(from, to, rate)
    console.log(`✅ Got ${from}/${to} = ${rate} from Fixer.io`)

    return exchangeRate
  } catch (error) {
    console.error(`Error fetching exchange rate from Fixer.io:`, error)
    return null
  }
}

// 3. Bank of Thailand API (for THB rates specifically)
async function getExchangeRateFromBOT(from: string, to: string): Promise<ExchangeRate | null> {
  // BOT API only provides THB rates
  if (from !== "THB" && to !== "THB") {
    return null
  }

  if (!canMakeExchangeApiCall("BOT", EXCHANGE_API_LIMITS.BOT.limit, EXCHANGE_API_LIMITS.BOT.windowMs)) {
    return null
  }

  try {
    console.log(`🔄 Fetching ${from}/${to} from Bank of Thailand...`)

    // BOT API endpoint for daily exchange rates
    const today = new Date().toISOString().split("T")[0]
    const url = `https://apigw1.bot.or.th/bot/public/Stat-ExchangeRate/v2/DAILY_AVG_EXG_RATE/?start_period=${today}&end_period=${today}`

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-IBM-Client-Id": process.env.BOT_CLIENT_ID || "default",
      },
    })

    if (!response.ok) {
      console.error(`BOT API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    if (!data.result || !data.result.data || data.result.data.length === 0) {
      console.error(`No exchange rate data from BOT API`)
      return null
    }

    // Find USD rate in BOT data
    const usdRate = data.result.data.find((item: any) => item.currency_id === "USD")

    if (!usdRate || !usdRate.mid_rate) {
      console.error(`No USD rate found in BOT data`)
      return null
    }

    let rate: number
    if (from === "USD" && to === "THB") {
      rate = Number(usdRate.mid_rate)
    } else if (from === "THB" && to === "USD") {
      rate = 1 / Number(usdRate.mid_rate)
    } else {
      return null
    }

    const exchangeRate: ExchangeRate = {
      from,
      to,
      rate,
      source: "Bank of Thailand",
      timestamp: new Date().toISOString(),
      cached: false,
    }

    setCachedExchangeRate(from, to, rate)
    console.log(`✅ Got ${from}/${to} = ${rate} from Bank of Thailand`)

    return exchangeRate
  } catch (error) {
    console.error(`Error fetching exchange rate from BOT:`, error)
    return null
  }
}

// Get fallback exchange rate
function getFallbackExchangeRate(from: string, to: string): ExchangeRate {
  let rate: number

  if (from === to) {
    rate = 1
  } else if (from === "USD" && to === "THB") {
    rate = FALLBACK_RATES.USD_TO_THB
  } else if (from === "THB" && to === "USD") {
    rate = FALLBACK_RATES.THB_TO_USD
  } else if (from === "EUR" && to === "USD") {
    rate = FALLBACK_RATES.EUR_TO_USD
  } else if (from === "GBP" && to === "USD") {
    rate = FALLBACK_RATES.GBP_TO_USD
  } else if (from === "JPY" && to === "USD") {
    rate = FALLBACK_RATES.JPY_TO_USD
  } else {
    // Default fallback
    rate = 1
  }

  return {
    from,
    to,
    rate,
    source: `Fallback (${FALLBACK_RATES.lastUpdated})`,
    timestamp: new Date().toISOString(),
    cached: false,
  }
}

// Main function to get exchange rate with multiple fallbacks
export async function getExchangeRate(from: string, to: string): Promise<ExchangeRate> {
  // Return 1 if same currency
  if (from === to) {
    return {
      from,
      to,
      rate: 1,
      source: "Same Currency",
      timestamp: new Date().toISOString(),
      cached: false,
    }
  }

  // Check cache first
  const cached = getCachedExchangeRate(from, to)
  if (cached) {
    console.log(`📦 Using cached exchange rate ${from}/${to} = ${cached.rate}`)
    return cached
  }

  console.log(`🔄 Fetching fresh exchange rate for ${from}/${to}...`)

  // Try multiple APIs in order of preference
  const apis = [
    () => getExchangeRateFromExchangeRateAPI(from, to),
    () => getExchangeRateFromBOT(from, to), // Specifically for THB
    () => getExchangeRateFromFixer(from, to),
  ]

  for (const apiCall of apis) {
    try {
      const result = await apiCall()
      if (result) {
        return result
      }
    } catch (error) {
      console.warn(`Exchange rate API failed:`, error)
      continue
    }
  }

  // All APIs failed, use fallback
  console.warn(`⚠️ All exchange rate APIs failed for ${from}/${to}, using fallback`)
  const fallback = getFallbackExchangeRate(from, to)

  // Cache the fallback for a shorter duration
  setCachedExchangeRate(from, to, fallback.rate)

  return fallback
}

// Batch get multiple exchange rates
export async function getMultipleExchangeRates(pairs: Array<{ from: string; to: string }>): Promise<ExchangeRate[]> {
  console.log(`🔄 Fetching ${pairs.length} exchange rates...`)

  const promises = pairs.map(({ from, to }) => getExchangeRate(from, to))
  const results = await Promise.all(promises)

  console.log(`✅ Fetched ${results.length} exchange rates`)
  return results
}

// Preload common exchange rates
export async function preloadCommonExchangeRates(): Promise<void> {
  const commonPairs = [
    { from: "USD", to: "THB" },
    { from: "THB", to: "USD" },
    { from: "EUR", to: "USD" },
    { from: "GBP", to: "USD" },
    { from: "JPY", to: "USD" },
  ]

  console.log(`🔄 Preloading ${commonPairs.length} common exchange rates...`)

  try {
    await getMultipleExchangeRates(commonPairs)
    console.log(`✅ Preloaded common exchange rates`)
  } catch (error) {
    console.error(`Error preloading exchange rates:`, error)
  }
}

// Get exchange rate info for transparency
export function getExchangeRateInfo(): {
  [key: string]: {
    name: string
    description: string
    updateFrequency: string
    reliability: "High" | "Medium" | "Low"
    free: boolean
  }
} {
  return {
    "ExchangeRate-API": {
      name: "ExchangeRate-API.com",
      description: "Free real-time exchange rates",
      updateFrequency: "Every hour",
      reliability: "High",
      free: true,
    },
    "Bank of Thailand": {
      name: "Bank of Thailand API",
      description: "Official THB exchange rates",
      updateFrequency: "Daily",
      reliability: "High",
      free: true,
    },
    "Fixer.io": {
      name: "Fixer.io",
      description: "Professional exchange rate API",
      updateFrequency: "Every minute",
      reliability: "High",
      free: false,
    },
    Fallback: {
      name: "Fallback Rates",
      description: "Static rates when APIs unavailable",
      updateFrequency: "Manual updates",
      reliability: "Low",
      free: true,
    },
  }
}
