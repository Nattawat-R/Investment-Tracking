"use client"

import { useState, useEffect } from "react"
import {
  ArrowDown,
  ArrowUp,
  DollarSign,
  PieChart,
  TrendingUp,
  Wallet,
  Search,
  Filter,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartTooltip } from "@/components/ui/chart"
import AddTransactionForm from "@/components/add-transaction-form"
import { getTransactions, getHoldings } from "@/app/actions/transactions"
import type { Transaction } from "@/lib/supabase"
import type { StockQuote } from "@/lib/financial-api"
import {
  type EnrichedHolding,
  type PortfolioSummary,
  calculatePortfolioSummary,
  enrichHoldingsWithMarketData,
} from "@/lib/portfolio-calculations"

export default function Component() {
  const [searchTerm, setSearchTerm] = useState("")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [holdings, setHoldings] = useState<EnrichedHolding[]>([])
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary>({
    totalValue: 0,
    totalCost: 0,
    totalGainLoss: 0,
    totalGainLossPercent: 0,
    dayChange: 0,
    dayChangePercent: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load transactions and holdings
      const [transactionsData, holdingsData] = await Promise.all([getTransactions(), getHoldings()])

      setTransactions(transactionsData)

      if (holdingsData.length > 0) {
        // Get current market prices
        const symbols = holdingsData.map((h) => h.symbol)
        const quotesResponse = await fetch("/api/stock-quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols }),
        })
        const quotesData = await quotesResponse.json()
        const quotes: StockQuote[] = quotesData.quotes || []

        // Enrich holdings with market data
        const enrichedHoldings = enrichHoldingsWithMarketData(holdingsData, quotes)
        setHoldings(enrichedHoldings)

        // Calculate portfolio summary
        const summary = calculatePortfolioSummary(enrichedHoldings)
        setPortfolioSummary(summary)
      } else {
        setHoldings([])
        setPortfolioSummary({
          totalValue: 0,
          totalCost: 0,
          totalGainLoss: 0,
          totalGainLossPercent: 0,
          dayChange: 0,
          dayChangePercent: 0,
        })
      }

      setLastUpdated(new Date())
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredHoldings = holdings.filter(
    (holding) =>
      holding.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (holding.company_name && holding.company_name.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Mock portfolio history data - you can implement real historical calculation
  const portfolioData = [
    { date: "Jan", value: Math.max(0, portfolioSummary.totalValue - 15000) },
    { date: "Feb", value: Math.max(0, portfolioSummary.totalValue - 12000) },
    { date: "Mar", value: Math.max(0, portfolioSummary.totalValue - 8000) },
    { date: "Apr", value: Math.max(0, portfolioSummary.totalValue - 5000) },
    { date: "May", value: Math.max(0, portfolioSummary.totalValue - 2000) },
    { date: "Jun", value: portfolioSummary.totalValue },
  ]

  return (
    <div className="min-h-screen bg-gray-950 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Investment Portfolio</h1>
            <p className="text-sm sm:text-base text-gray-400">
              Track your investments and portfolio performance
              {lastUpdated && <span className="ml-2 text-xs">• Last updated: {lastUpdated.toLocaleTimeString()}</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={loadData}
              disabled={isLoading}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <AddTransactionForm />
          </div>
        </div>

        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border border-gray-800 bg-gray-900 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Total Portfolio Value</CardTitle>
              <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-white">
                $
                {portfolioSummary.totalValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div
                className={`flex items-center text-xs mt-1 ${portfolioSummary.dayChange >= 0 ? "text-[#30D158]" : "text-[#FF453A]"}`}
              >
                {portfolioSummary.dayChange >= 0 ? (
                  <ArrowUp className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                ) : (
                  <ArrowDown className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                )}
                ${Math.abs(portfolioSummary.dayChange).toFixed(2)} ({portfolioSummary.dayChangePercent.toFixed(2)}%)
              </div>
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">Today's change</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-800 bg-gray-900 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Total Gain/Loss</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div
                className={`text-lg sm:text-2xl font-bold ${portfolioSummary.totalGainLoss >= 0 ? "text-[#30D158]" : "text-[#FF453A]"}`}
              >
                $
                {portfolioSummary.totalGainLoss.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div
                className={`text-xs mt-1 ${portfolioSummary.totalGainLoss >= 0 ? "text-[#30D158]" : "text-[#FF453A]"}`}
              >
                {portfolioSummary.totalGainLossPercent >= 0 ? "+" : ""}
                {portfolioSummary.totalGainLossPercent.toFixed(2)}%
              </div>
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">Total return</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-800 bg-gray-900 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Total Invested</CardTitle>
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-white">
                $
                {portfolioSummary.totalCost.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-xs text-[#0A84FF] mt-1">Cost basis</div>
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">Total invested</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-800 bg-gray-900 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-400">Holdings</CardTitle>
              <PieChart className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-white">{holdings.length}</div>
              <div className="text-xs text-[#0A84FF] mt-1">Positions</div>
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">Active holdings</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-gray-900 border border-gray-800 h-auto">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#0A84FF] data-[state=active]:text-white text-gray-400 hover:text-gray-200 text-xs sm:text-sm py-2 sm:py-2.5"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="holdings"
              className="data-[state=active]:bg-[#0A84FF] data-[state=active]:text-white text-gray-400 hover:text-gray-200 text-xs sm:text-sm py-2 sm:py-2.5"
            >
              Holdings
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="data-[state=active]:bg-[#0A84FF] data-[state=active]:text-white text-gray-400 hover:text-gray-200 text-xs sm:text-sm py-2 sm:py-2.5"
            >
              Transactions
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-[#0A84FF] data-[state=active]:text-white text-gray-400 hover:text-gray-200 text-xs sm:text-sm py-2 sm:py-2.5"
            >
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Portfolio Performance Chart */}
              <Card className="lg:col-span-2 border border-gray-800 bg-gray-900 shadow-xl">
                <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
                  <CardTitle className="text-base sm:text-lg font-semibold text-white">Portfolio Performance</CardTitle>
                  <CardDescription className="text-sm text-gray-400">6-month portfolio value trend</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="w-full overflow-hidden">
                    <div className="h-[200px] sm:h-[250px] lg:h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={portfolioData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: "#9CA3AF", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            tickMargin={5}
                            interval={0}
                          />
                          <YAxis
                            tick={{ fill: "#9CA3AF", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                            domain={["dataMin - 2000", "dataMax + 2000"]}
                            width={35}
                          />
                          <ChartTooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg">
                                    <p className="text-gray-300 text-xs">{`${label}`}</p>
                                    <p className="text-[#0A84FF] font-semibold text-xs">
                                      {`Portfolio: $${payload[0].value?.toLocaleString()}`}
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#0A84FF"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 3, fill: "#0A84FF", stroke: "#1F2937", strokeWidth: 1 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Holdings */}
              <Card className="border border-gray-800 bg-gray-900 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-white">Top Holdings</CardTitle>
                  <CardDescription className="text-gray-400">Your largest positions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {holdings.slice(0, 5).map((holding) => (
                      <div key={holding.symbol} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#0A84FF]/20 rounded-lg flex items-center justify-center border border-[#0A84FF]/30">
                            <span className="text-[#0A84FF] font-semibold text-xs">{holding.symbol.slice(0, 2)}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-white text-sm">{holding.symbol}</p>
                            <p className="text-xs text-gray-400">{holding.total_shares} shares</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white text-sm">
                            ${holding.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                          <p className={`text-xs ${holding.gainLoss >= 0 ? "text-[#30D158]" : "text-[#FF453A]"}`}>
                            {holding.gainLoss >= 0 ? "+" : ""}${holding.gainLoss.toFixed(0)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="holdings" className="space-y-4">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  placeholder="Search holdings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border border-gray-800 bg-gray-900 text-white placeholder-gray-500 focus:border-[#0A84FF] h-10 sm:h-auto"
                />
              </div>
              <Button
                variant="outline"
                className="w-full sm:w-auto border-gray-800 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white h-10 sm:h-auto"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>

            {/* Holdings List */}
            <div className="space-y-4">
              {filteredHoldings.length === 0 ? (
                <Card className="border border-gray-800 bg-gray-900 shadow-xl">
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-400">No holdings found. Add your first transaction to get started!</p>
                  </CardContent>
                </Card>
              ) : (
                filteredHoldings.map((holding) => (
                  <Card key={holding.symbol} className="border border-gray-800 bg-gray-900 shadow-xl">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#0A84FF]/20 rounded-lg flex items-center justify-center border border-[#0A84FF]/30">
                              <span className="text-[#0A84FF] font-semibold text-xs sm:text-sm">
                                {holding.symbol.slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-white text-sm sm:text-base">{holding.symbol}</h3>
                              <p className="text-xs sm:text-sm text-gray-400">{holding.company_name}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 text-xs sm:text-sm">
                          <div>
                            <p className="text-gray-400 mb-1">Shares</p>
                            <p className="font-semibold text-white">{holding.total_shares}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Current Price</p>
                            <p className="font-semibold text-white">${holding.currentPrice.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Market Value</p>
                            <p className="font-semibold text-white">${holding.currentValue.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Gain/Loss</p>
                            <div
                              className={`flex items-center ${holding.gainLoss >= 0 ? "text-[#30D158]" : "text-[#FF453A]"}`}
                            >
                              {holding.gainLoss >= 0 ? (
                                <ArrowUp className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                              ) : (
                                <ArrowDown className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                              )}
                              <span className="font-semibold">{holding.gainLossPercent.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-gray-800 text-gray-400 hover:text-white"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-gray-800 bg-gray-900 text-gray-300">
                            <DropdownMenuItem className="hover:bg-gray-800 hover:text-white">
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="hover:bg-gray-800 hover:text-white">Buy More</DropdownMenuItem>
                            <DropdownMenuItem className="hover:bg-gray-800 hover:text-white">Sell</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card className="border border-gray-800 bg-gray-900 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">Recent Transactions</CardTitle>
                <CardDescription className="text-gray-400">Your latest investment activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">
                      No transactions yet. Add your first transaction to get started!
                    </p>
                  ) : (
                    transactions.slice(0, 10).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors gap-3 sm:gap-0"
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              transaction.transaction_type === "BUY"
                                ? "default"
                                : transaction.transaction_type === "SELL"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className={
                              transaction.transaction_type === "BUY"
                                ? "bg-[#0A84FF] hover:bg-[#0056CC] text-white text-xs"
                                : transaction.transaction_type === "SELL"
                                  ? "bg-[#FF453A] hover:bg-[#D70015] text-white text-xs"
                                  : "bg-gray-600 hover:bg-gray-700 text-white text-xs"
                            }
                          >
                            {transaction.transaction_type}
                          </Badge>
                          <div>
                            <p className="font-semibold text-white text-sm sm:text-base">{transaction.symbol}</p>
                            <p className="text-xs sm:text-sm text-gray-400">
                              {transaction.shares} shares @ ${transaction.price_per_share}
                            </p>
                          </div>
                        </div>
                        <div className="text-right sm:text-left">
                          <p className="font-semibold text-white text-sm sm:text-base">
                            ${transaction.total_amount.toLocaleString()}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-400">{transaction.transaction_date}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border border-gray-800 bg-gray-900 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-white">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Return</span>
                    <span
                      className={`font-semibold ${portfolioSummary.totalGainLoss >= 0 ? "text-[#30D158]" : "text-[#FF453A]"}`}
                    >
                      {portfolioSummary.totalGainLossPercent >= 0 ? "+" : ""}
                      {portfolioSummary.totalGainLossPercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Invested</span>
                    <span className="font-semibold text-white">${portfolioSummary.totalCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Current Value</span>
                    <span className="font-semibold text-white">${portfolioSummary.totalValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Number of Holdings</span>
                    <span className="font-semibold text-white">{holdings.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-800 bg-gray-900 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-white">Today's Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Day Change</span>
                    <span
                      className={`font-semibold ${portfolioSummary.dayChange >= 0 ? "text-[#30D158]" : "text-[#FF453A]"}`}
                    >
                      {portfolioSummary.dayChange >= 0 ? "+" : ""}${portfolioSummary.dayChange.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Day Change %</span>
                    <span
                      className={`font-semibold ${portfolioSummary.dayChangePercent >= 0 ? "text-[#30D158]" : "text-[#FF453A]"}`}
                    >
                      {portfolioSummary.dayChangePercent >= 0 ? "+" : ""}
                      {portfolioSummary.dayChangePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Best Performer</span>
                    <span className="font-semibold text-white">
                      {holdings.length > 0
                        ? holdings.reduce((best, current) =>
                            current.gainLossPercent > best.gainLossPercent ? current : best,
                          ).symbol
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Worst Performer</span>
                    <span className="font-semibold text-white">
                      {holdings.length > 0
                        ? holdings.reduce((worst, current) =>
                            current.gainLossPercent < worst.gainLossPercent ? current : worst,
                          ).symbol
                        : "N/A"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
