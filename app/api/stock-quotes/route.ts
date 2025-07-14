import { type NextRequest, NextResponse } from "next/server"
import { getMultipleQuotes } from "@/lib/financial-api"

export async function POST(request: NextRequest) {
  try {
    const { symbols } = await request.json()

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({ error: "Invalid symbols array" }, { status: 400 })
    }

    console.log(`📡 API: Starting to fetch ${symbols.length} quotes...`)
    const startTime = Date.now()

    const quotes = await getMultipleQuotes(symbols)

    const endTime = Date.now()
    console.log(
      `⚡ API: Completed in ${endTime - startTime}ms with ${quotes.length}/${symbols.length} successful quotes`,
    )

    return NextResponse.json({
      quotes,
      metadata: {
        requested: symbols.length,
        successful: quotes.length,
        duration: endTime - startTime,
      },
    })
  } catch (error) {
    console.error("Error fetching stock quotes:", error)
    return NextResponse.json({ error: "Failed to fetch stock quotes" }, { status: 500 })
  }
}
