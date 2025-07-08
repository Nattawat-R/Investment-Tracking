// Data validation and accuracy monitoring utilities

export interface PriceValidationRule {
  symbol: string
  assetType: "STOCK" | "CRYPTO" | "THAI_STOCK" | "THAI_GOLD"
  minPrice: number
  maxPrice: number
  lastKnownGoodPrice?: number
  lastUpdated?: string
}

// Known price ranges for major assets (updated regularly)
export const PRICE_VALIDATION_RULES: PriceValidationRule[] = [
  // Major Cryptocurrencies
  { symbol: "BTC", assetType: "CRYPTO", minPrice: 15000, maxPrice: 100000, lastKnownGoodPrice: 43250 },
  { symbol: "ETH", assetType: "CRYPTO", minPrice: 800, maxPrice: 8000, lastKnownGoodPrice: 2680 },
  { symbol: "SOL", assetType: "CRYPTO", minPrice: 8, maxPrice: 300, lastKnownGoodPrice: 152.5 },
  { symbol: "ADA", assetType: "CRYPTO", minPrice: 0.1, maxPrice: 5, lastKnownGoodPrice: 0.52 },
  { symbol: "USDT", assetType: "CRYPTO", minPrice: 0.98, maxPrice: 1.02, lastKnownGoodPrice: 1.0 },
  { symbol: "USDC", assetType: "CRYPTO", minPrice: 0.98, maxPrice: 1.02, lastKnownGoodPrice: 1.0 },

  // Major US Stocks
  { symbol: "AAPL", assetType: "STOCK", minPrice: 50, maxPrice: 300, lastKnownGoodPrice: 185 },
  { symbol: "GOOGL", assetType: "STOCK", minPrice: 80, maxPrice: 200, lastKnownGoodPrice: 140 },
  { symbol: "MSFT", assetType: "STOCK", minPrice: 200, maxPrice: 500, lastKnownGoodPrice: 380 },
  { symbol: "TSLA", assetType: "STOCK", minPrice: 100, maxPrice: 400, lastKnownGoodPrice: 250 },

  // Major Thai Stocks
  { symbol: "PTT", assetType: "THAI_STOCK", minPrice: 20, maxPrice: 60, lastKnownGoodPrice: 35.5 },
  { symbol: "CPALL", assetType: "THAI_STOCK", minPrice: 40, maxPrice: 80, lastKnownGoodPrice: 62.75 },
  { symbol: "KBANK", assetType: "THAI_STOCK", minPrice: 100, maxPrice: 200, lastKnownGoodPrice: 142.5 },

  // Thai Gold
  { symbol: "GOLD96.5", assetType: "THAI_GOLD", minPrice: 30000, maxPrice: 80000, lastKnownGoodPrice: 51140 },
]

export function validatePrice(
  symbol: string,
  price: number,
  assetType: string,
): {
  isValid: boolean
  warning?: string
  suggestion?: number
} {
  const rule = PRICE_VALIDATION_RULES.find((r) => r.symbol === symbol && r.assetType === assetType)

  if (!rule) {
    // Generic validation for unknown assets
    if (price <= 0) {
      return { isValid: false, warning: "Price must be greater than 0" }
    }

    // Asset type specific generic validation
    switch (assetType) {
      case "CRYPTO":
        if (price > 100000) return { isValid: false, warning: "Price seems unusually high for crypto" }
        break
      case "STOCK":
        if (price > 10000) return { isValid: false, warning: "Price seems unusually high for US stock" }
        break
      case "THAI_STOCK":
        if (price > 2000) return { isValid: false, warning: "Price seems unusually high for Thai stock" }
        break
      case "THAI_GOLD":
        if (price < 30000 || price > 80000) {
          return { isValid: false, warning: "Thai Gold price should be between ฿30,000-80,000 per gram" }
        }
        break
    }

    return { isValid: true }
  }

  // Specific validation based on rules
  if (price < rule.minPrice || price > rule.maxPrice) {
    return {
      isValid: false,
      warning: `${symbol} price ${price} is outside expected range ${rule.minPrice}-${rule.maxPrice}`,
      suggestion: rule.lastKnownGoodPrice,
    }
  }

  // Check if price deviates significantly from last known good price
  if (rule.lastKnownGoodPrice) {
    const deviation = Math.abs(price - rule.lastKnownGoodPrice) / rule.lastKnownGoodPrice
    if (deviation > 0.5) {
      // 50% deviation threshold
      return {
        isValid: true,
        warning: `${symbol} price ${price} deviates significantly from recent price ${rule.lastKnownGoodPrice}`,
        suggestion: rule.lastKnownGoodPrice,
      }
    }
  }

  return { isValid: true }
}

export function logPriceValidation(symbol: string, price: number, assetType: string, source: string) {
  const validation = validatePrice(symbol, price, assetType)

  if (!validation.isValid || validation.warning) {
    console.warn(`Price validation for ${symbol} from ${source}:`, {
      price,
      assetType,
      validation,
      timestamp: new Date().toISOString(),
    })
  }

  return validation
}

// Function to update validation rules (should be called periodically with real market data)
export function updateValidationRules(updates: Partial<PriceValidationRule>[]) {
  updates.forEach((update) => {
    const index = PRICE_VALIDATION_RULES.findIndex(
      (rule) => rule.symbol === update.symbol && rule.assetType === update.assetType,
    )

    if (index !== -1) {
      PRICE_VALIDATION_RULES[index] = { ...PRICE_VALIDATION_RULES[index], ...update }
    } else if (update.symbol && update.assetType && update.minPrice && update.maxPrice) {
      PRICE_VALIDATION_RULES.push(update as PriceValidationRule)
    }
  })
}

// Recommendations for preventing data accuracy issues in the future
export const DATA_ACCURACY_RECOMMENDATIONS = {
  "Use Multiple Data Sources":
    "Implement fallback to multiple APIs (Alpha Vantage, Finnhub, Yahoo Finance) to cross-validate prices",
  "Implement Price Validation": "Add validation rules for each asset type to detect obviously incorrect prices",
  "Cache with Expiration": "Use intelligent caching that expires based on market hours and volatility",
  "Real-time Monitoring": "Set up alerts for price deviations beyond expected ranges",
  "Regular Data Updates": "Update mock data and validation rules monthly with current market prices",
  "User Feedback System": "Allow users to report incorrect prices for manual verification",
  "Market Hours Awareness": "Different refresh rates for market hours vs after-hours",
  "Currency Conversion": "Use real-time exchange rates for multi-currency portfolios",
}
