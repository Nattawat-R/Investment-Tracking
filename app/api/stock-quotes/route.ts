import { type NextRequest, NextResponse } from "next/server"
import { getMultipleQuotes } from "@/lib/financial-api"

export async function POST(request: NextRequest) {
  try {
    const { symbols } = await request.json()

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({ error: "Invalid symbols array" }, { status: 400 })
    }

    const quotes = await getMultipleQuotes(symbols)

    return NextResponse.json({ quotes })
  } catch (error) {
    console.error("Error fetching stock quotes:", error)
    return NextResponse.json({ error: "Failed to fetch stock quotes" }, { status: 500 })
  }
}
