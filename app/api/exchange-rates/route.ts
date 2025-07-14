import { type NextRequest, NextResponse } from "next/server"
import { getExchangeRate, getMultipleExchangeRates, preloadCommonExchangeRates } from "@/lib/exchange-rates"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    if (!from || !to) {
      return NextResponse.json({ error: "Missing 'from' or 'to' currency parameters" }, { status: 400 })
    }

    console.log(`📡 Exchange Rate API: Fetching ${from}/${to}...`)
    const startTime = Date.now()

    const exchangeRate = await getExchangeRate(from, to)

    const endTime = Date.now()
    console.log(`⚡ Exchange Rate API: Completed in ${endTime - startTime}ms`)

    return NextResponse.json({
      exchangeRate,
      metadata: {
        duration: endTime - startTime,
        cached: exchangeRate.cached,
        source: exchangeRate.source,
      },
    })
  } catch (error) {
    console.error("Error fetching exchange rate:", error)
    return NextResponse.json({ error: "Failed to fetch exchange rate" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { pairs } = await request.json()

    if (!pairs || !Array.isArray(pairs)) {
      return NextResponse.json({ error: "Invalid pairs array" }, { status: 400 })
    }

    console.log(`📡 Exchange Rate API: Fetching ${pairs.length} exchange rates...`)
    const startTime = Date.now()

    const exchangeRates = await getMultipleExchangeRates(pairs)

    const endTime = Date.now()
    console.log(`⚡ Exchange Rate API: Completed ${exchangeRates.length} rates in ${endTime - startTime}ms`)

    return NextResponse.json({
      exchangeRates,
      metadata: {
        requested: pairs.length,
        successful: exchangeRates.length,
        duration: endTime - startTime,
      },
    })
  } catch (error) {
    console.error("Error fetching multiple exchange rates:", error)
    return NextResponse.json({ error: "Failed to fetch exchange rates" }, { status: 500 })
  }
}

// Preload common exchange rates on server startup
export async function OPTIONS() {
  try {
    await preloadCommonExchangeRates()
    return NextResponse.json({ message: "Exchange rates preloaded successfully" })
  } catch (error) {
    console.error("Error preloading exchange rates:", error)
    return NextResponse.json({ error: "Failed to preload exchange rates" }, { status: 500 })
  }
}
