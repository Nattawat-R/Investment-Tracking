import { type NextRequest, NextResponse } from "next/server"
import { searchStocks } from "@/lib/financial-api"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
    }

    const results = await searchStocks(query)

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Error searching stocks:", error)
    return NextResponse.json({ error: "Failed to search stocks" }, { status: 500 })
  }
}
