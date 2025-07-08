// Data accuracy monitoring and alerting system

export interface PriceAlert {
  symbol: string
  currentPrice: number
  expectedPrice: number
  deviation: number
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  timestamp: string
  message: string
}

export interface DataAccuracyReport {
  totalSymbols: number
  accurateCount: number
  warningCount: number
  errorCount: number
  alerts: PriceAlert[]
  lastUpdated: string
}

// Current market price references (should be updated regularly)
const CURRENT_MARKET_PRICES = {
  // US Stocks
  NVDA: 158.9,
  AAPL: 185.25,
  GOOGL: 140.5,
  MSFT: 380.75,

  // Thai Stocks
  BH: 137.5,
  AOT: 30.75,
  PR9: 24.5,
  PTT: 35.5,

  // Crypto
  SOL: 152.5,
  BTC: 43250,
  ETH: 2680,
  USDT: 1.0,

  // Thai Gold
  "GOLD96.5": 51140,
}

export function validatePriceAccuracy(symbol: string, price: number): PriceAlert | null {
  const expectedPrice = CURRENT_MARKET_PRICES[symbol as keyof typeof CURRENT_MARKET_PRICES]

  if (!expectedPrice) {
    return null // No reference price available
  }

  const deviation = Math.abs(price - expectedPrice) / expectedPrice
  let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW"

  if (deviation > 0.5)
    severity = "CRITICAL" // >50% deviation
  else if (deviation > 0.2)
    severity = "HIGH" // >20% deviation
  else if (deviation > 0.1)
    severity = "MEDIUM" // >10% deviation
  else if (deviation > 0.05)
    severity = "LOW" // >5% deviation
  else return null // Within acceptable range

  return {
    symbol,
    currentPrice: price,
    expectedPrice,
    deviation: deviation * 100,
    severity,
    timestamp: new Date().toISOString(),
    message: `${symbol} price ${price} deviates ${(deviation * 100).toFixed(1)}% from expected ${expectedPrice}`,
  }
}

export function generateDataAccuracyReport(quotes: any[]): DataAccuracyReport {
  const alerts: PriceAlert[] = []
  let accurateCount = 0
  let warningCount = 0
  let errorCount = 0

  quotes.forEach((quote) => {
    const alert = validatePriceAccuracy(quote.symbol, quote.price)

    if (!alert) {
      accurateCount++
    } else {
      alerts.push(alert)

      if (alert.severity === "LOW" || alert.severity === "MEDIUM") {
        warningCount++
      } else {
        errorCount++
      }
    }
  })

  return {
    totalSymbols: quotes.length,
    accurateCount,
    warningCount,
    errorCount,
    alerts: alerts.sort((a, b) => b.deviation - a.deviation), // Sort by highest deviation first
    lastUpdated: new Date().toISOString(),
  }
}

// Function to log data accuracy issues
export function logDataAccuracyIssue(issue: string, details: any) {
  console.error(`[DATA ACCURACY] ${issue}:`, {
    ...details,
    timestamp: new Date().toISOString(),
    severity: "HIGH",
  })
}

// Recommendations to prevent future data accuracy issues
export const DATA_ACCURACY_PREVENTION_MEASURES = {
  "Regular Price Updates": "Update mock prices weekly with current market data",
  "Asset Type Validation": "Implement strict asset type checking with explicit symbol lists",
  "Share Count Validation": "Add validation to prevent share count calculation errors",
  "Cross-Reference Checking": "Compare prices across multiple data sources",
  "User Feedback System": "Allow users to report incorrect data",
  "Automated Monitoring": "Set up alerts for price deviations beyond acceptable ranges",
  "Data Source Diversification": "Use multiple APIs to cross-validate prices",
  "Regular Audits": "Perform monthly data accuracy audits",
}
