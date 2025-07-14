// Optimized API service for 10 users with smart caching and batching

interface CachedQuote {
  data: any
  timestamp: number
  userId?: string
}

interface UserQuoteRequest {
  userId: string
  symbols: string[]
  priority: "high" | "normal" | "low"
}

class OptimizedAPIService {
  private cache = new Map<string, CachedQuote>()
  private requestQueue: UserQuoteRequest[] = []
  private isProcessing = false
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly BATCH_SIZE = 20 // Process 20 symbols at once
  private readonly USER_RATE_LIMIT = 3 // Max 3 requests per user per hour
  private userRequestCounts = new Map<string, { count: number; resetTime: number }>()

  // Check if user can make request (rate limiting)
  canUserMakeRequest(userId: string): boolean {
    const now = Date.now()
    const userLimit = this.userRequestCounts.get(userId) || { count: 0, resetTime: now + 60 * 60 * 1000 }

    if (now > userLimit.resetTime) {
      userLimit.count = 0
      userLimit.resetTime = now + 60 * 60 * 1000
    }

    if (userLimit.count >= this.USER_RATE_LIMIT) {
      return false
    }

    userLimit.count++
    this.userRequestCounts.set(userId, userLimit)
    return true
  }

  // Get cached quote if available and fresh
  getCachedQuote(symbol: string): any | null {
    const cached = this.cache.get(symbol)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }
    return null
  }

  // Set cached quote
  setCachedQuote(symbol: string, data: any, userId?: string): void {
    this.cache.set(symbol, {
      data,
      timestamp: Date.now(),
      userId,
    })
  }

  // Add request to queue with priority
  async queueRequest(
    userId: string,
    symbols: string[],
    priority: "high" | "normal" | "low" = "normal",
  ): Promise<any[]> {
    // Check rate limiting
    if (!this.canUserMakeRequest(userId)) {
      throw new Error("Rate limit exceeded. Please wait before refreshing again.")
    }

    // Filter out symbols that are already cached
    const uncachedSymbols = symbols.filter((symbol) => !this.getCachedQuote(symbol))

    // Return cached data immediately for cached symbols
    const cachedResults = symbols
      .filter((symbol) => this.getCachedQuote(symbol))
      .map((symbol) => this.getCachedQuote(symbol))

    if (uncachedSymbols.length === 0) {
      return symbols.map((symbol) => this.getCachedQuote(symbol))
    }

    // Add to queue for uncached symbols
    const request: UserQuoteRequest = {
      userId,
      symbols: uncachedSymbols,
      priority,
    }

    this.requestQueue.push(request)
    this.processQueue()

    // Wait for processing and return results
    return new Promise((resolve) => {
      const checkResults = () => {
        const allResults = symbols.map((symbol) => this.getCachedQuote(symbol))
        if (allResults.every((result) => result !== null)) {
          resolve(allResults)
        } else {
          setTimeout(checkResults, 100)
        }
      }
      checkResults()
    })
  }

  // Process the request queue
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return
    }

    this.isProcessing = true

    try {
      // Sort queue by priority
      this.requestQueue.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })

      // Collect all unique symbols from queue
      const allSymbols = new Set<string>()
      this.requestQueue.forEach((request) => {
        request.symbols.forEach((symbol) => allSymbols.add(symbol))
      })

      // Process in batches
      const symbolArray = Array.from(allSymbols)
      const batches = []
      for (let i = 0; i < symbolArray.length; i += this.BATCH_SIZE) {
        batches.push(symbolArray.slice(i, i + this.BATCH_SIZE))
      }

      for (const batch of batches) {
        try {
          console.log(`🔄 Processing batch of ${batch.length} symbols...`)

          const response = await fetch("/api/stock-quotes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbols: batch }),
          })

          if (response.ok) {
            const data = await response.json()
            const quotes = data.quotes || []

            // Cache all results
            quotes.forEach((quote: any) => {
              this.setCachedQuote(quote.symbol, quote)
            })

            console.log(`✅ Cached ${quotes.length} quotes`)
          }

          // Small delay between batches to respect API limits
          await new Promise((resolve) => setTimeout(resolve, 200))
        } catch (error) {
          console.error("Error processing batch:", error)
        }
      }

      // Clear the queue
      this.requestQueue = []
    } finally {
      this.isProcessing = false
    }
  }

  // Get cache statistics
  getCacheStats(): { size: number; hitRate: number; oldestEntry: number } {
    const now = Date.now()
    let oldestEntry = now
    let validEntries = 0

    this.cache.forEach((cached) => {
      if (now - cached.timestamp < this.CACHE_DURATION) {
        validEntries++
        oldestEntry = Math.min(oldestEntry, cached.timestamp)
      }
    })

    return {
      size: validEntries,
      hitRate: validEntries / Math.max(this.cache.size, 1),
      oldestEntry: now - oldestEntry,
    }
  }

  // Clear expired cache entries
  cleanupCache(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    this.cache.forEach((cached, key) => {
      if (now - cached.timestamp >= this.CACHE_DURATION) {
        expiredKeys.push(key)
      }
    })

    expiredKeys.forEach((key) => this.cache.delete(key))
    console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`)
  }
}

// Export singleton instance
export const apiService = new OptimizedAPIService()

// Cleanup cache every 10 minutes
setInterval(
  () => {
    apiService.cleanupCache()
  },
  10 * 60 * 1000,
)
