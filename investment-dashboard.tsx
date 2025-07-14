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
  RefreshCw,
  Globe,
  Trash2,
  Edit,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts"
import { ChartTooltip } from "@/components/ui/chart"
import AddTransactionForm from "@/components/add-transaction-form"
import { getTransactions, getHoldings, deleteTransaction, updateTransaction } from "@/app/actions/transactions"
import type { Transaction } from "@/lib/supabase"
import type { StockQuote } from "@/lib/financial-api"
import { formatCurrency, getAssetTypeBadge, convertCurrencySync } from "@/lib/financial-api"
import type { EnrichedHolding, PortfolioSummary } from "@/lib/portfolio-calculations"
import {
  calculatePortfolioSummary,
  enrichHoldingsWithMarketData,
  calculateAssetAllocation,
  generatePortfolioHistory,
} from "@/lib/portfolio-calculations"

/*
=== DATA SOURCE INFORMATION FOR EACH ASSET TYPE ===

🇺🇸 **US STOCKS** (AAPL, GOOGL, MSFT, AMZN, TSLA, META, NVDA, etc.):
- Primary: Yahoo Finance API (https://query1.finance.yahoo.com/v8/finance/chart/)
- Secondary: Alpha Vantage API (https://www.alphavantage.co/documentation/)
- Alternative: Finnhub API (https://finnhub.io/docs/api)
- Backup: IEX Cloud (https://iexcloud.io/docs/api/)

🇹🇭 **THAI STOCKS** (PTT, CPALL, KBANK, SCB, BBL, ADVANC, AOT, etc.):
- Primary: SET Market Data Center API (https://www.set.or.th/en/market/market-data)
- Secondary: Settrade API (https://www.settrade.com/api)
- Alternative: InvestorHub Thailand API
- Backup: Yahoo Finance Thailand (https://th.finance.yahoo.com/)

💰 **CRYPTOCURRENCIES** (BTC, ETH, SOL, ADA, XRP, DOGE, etc.):
- Primary: CoinGecko API (https://www.coingecko.com/en/api/documentation)
- Secondary: CoinMarketCap API (https://coinmarketcap.com/api/documentation/v1/)
- Alternative: Binance API (https://binance-docs.github.io/apidocs/spot/en/)
- Backup: CryptoCompare API (https://min-api.cryptocompare.com/documentation)

🥇 **THAI GOLD** (GOLD96.5, GOLD, XAU, THGOLD):
- Primary: Gold Traders Association Thailand (https://www.goldtraders.or.th/)
- Secondary: YLG (Hua Seng Heng) API (https://www.ylg.co.th/gold-price)
- Alternative: Aurora Gold API
- Backup: Goldspot.com API

📊 **EXCHANGE RATES** (USD/THB conversion):
- Primary: Bank of Thailand API (https://www.bot.or.th/english/statistics/financialmarkets/exchangerate/)
- Secondary: XE.com API (https://www.xe.com/xecurrencydata/)
- Alternative: Fixer.io API (https://fixer.io/documentation)
*/

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
  const [displayCurrency, setDisplayCurrency] = useState<"USD" | "THB">("USD")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null)
  const [editFormData, setEditFormData] = useState({
    transaction_type: "",
    shares: "",
    price_per_share: "",
    transaction_date: "",
    notes: "",
  })
  const [exchangeRate, setExchangeRate] = useState<{ rate: number; source: string; lastUpdated: string } | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load transactions and holdings first (fast database queries)
      const [transactionsData, holdingsData] = await Promise.all([getTransactions(), getHoldings()])

      setTransactions(transactionsData)

      if (holdingsData.length > 0) {
        // Show holdings immediately with cached/previous prices
        const enrichedHoldingsWithOldPrices = enrichHoldingsWithMarketData(holdingsData, [])
        setHoldings(enrichedHoldingsWithOldPrices)

        // Calculate summary with old prices first
        const preliminarySummary = calculatePortfolioSummary(enrichedHoldingsWithOldPrices, displayCurrency)
        setPortfolioSummary(preliminarySummary)

        // Then fetch fresh market prices in the background
        const symbols = holdingsData.map((h) => h.symbol)
        console.log(`🔄 Fetching fresh prices for ${symbols.length} symbols...`)

        const quotesResponse = await fetch("/api/stock-quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols }),
        })

        if (quotesResponse.ok) {
          const quotesData = await quotesResponse.json()
          const quotes: StockQuote[] = quotesData.quotes || []

          // Update with fresh prices
          const enrichedHoldings = enrichHoldingsWithMarketData(holdingsData, quotes)
          setHoldings(enrichedHoldings)

          // Recalculate summary with fresh prices
          const summary = calculatePortfolioSummary(enrichedHoldings, displayCurrency)
          setPortfolioSummary(summary)

          console.log(`✅ Updated ${quotes.length} fresh prices`)
        }
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

      // Fetch current USD/THB exchange rate for display
      try {
        const exchangeResponse = await fetch("/api/exchange-rates?from=USD&to=THB")
        if (exchangeResponse.ok) {
          const exchangeData = await exchangeResponse.json()
          setExchangeRate({
            rate: exchangeData.exchangeRate.rate,
            source: exchangeData.exchangeRate.source,
            lastUpdated: exchangeData.exchangeRate.timestamp,
          })
        }
      } catch (error) {
        console.error("Error fetching exchange rate:", error)
      }

      setLastUpdated(new Date())
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return

    try {
      const result = await deleteTransaction(transactionToDelete.id)
      if (result.success) {
        await loadData() // Reload data after deletion
        setDeleteDialogOpen(false)
        setTransactionToDelete(null)
      } else {
        console.error("Failed to delete transaction:", result.error)
      }
    } catch (error) {
      console.error("Error deleting transaction:", error)
    }
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setTransactionToEdit(transaction)
    setEditFormData({
      transaction_type: transaction.transaction_type,
      shares: transaction.shares.toString(),
      price_per_share: transaction.price_per_share.toString(),
      transaction_date: transaction.transaction_date,
      notes: transaction.notes || "",
    })
    setEditDialogOpen(true)
  }

  const handleEditSubmit = async () => {
    if (!transactionToEdit) return

    try {
      const result = await updateTransaction(transactionToEdit.id, editFormData)
      if (result.success) {
        await loadData() // Reload data after successful update
        setEditDialogOpen(false)
        setTransactionToEdit(null)
      } else {
        console.error("Failed to update transaction:", result.error)
      }
    } catch (error) {
      console.error("Error updating transaction:", error)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Recalculate summary when currency changes
  useEffect(() => {
    if (holdings.length > 0) {
      const summary = calculatePortfolioSummary(holdings, displayCurrency)
      setPortfolioSummary(summary)
    }
  }, [displayCurrency, holdings])

  const filteredHoldings = holdings.filter(
    (holding) =>
      holding.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (holding.company_name && holding.company_name.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Replace the sortedHoldings calculation with this improved version:
  const sortedHoldings = [...filteredHoldings].sort((a, b) => {
    const aValue = a.currentValue || 0
    const bValue = b.currentValue || 0

    // Convert to display currency for comparison
    const aConverted = convertCurrencySync(aValue, a.currency || "USD", displayCurrency)
    const bConverted = convertCurrencySync(bValue, b.currency || "USD", displayCurrency)

    return bConverted - aConverted
  })

  // Sort transactions by date (newest to oldest)
  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
  })

  // Generate 1-year portfolio history data based on actual transactions
  const portfolioData = generatePortfolioHistory(
    portfolioSummary.totalValue,
    portfolioSummary.totalGainLoss,
    transactions,
  )

  // Calculate individual asset allocation for pie chart
  const assetAllocation = calculateAssetAllocation(holdings, displayCurrency)

  // Helper function to format symbol to maximum 4 characters
  const formatSymbol = (symbol: string): string => {
    return symbol.length > 4 ? symbol.substring(0, 4) : symbol
  }

  return (
    <div className="min-h-screen bg-gray-950 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Investment Portfolio</h1>
            <p className="text-sm text-gray-400 mt-1 flex flex-col sm:flex-row sm:items-center gap-2">
              <span>Track your investments and portfolio performance</span>
              {exchangeRate && (
                <span className="flex items-center gap-2">
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400 text-xs">
                    <Globe className="w-3 h-3" />
                    USD/THB: {exchangeRate.rate.toFixed(2)}
                    <span className="text-blue-300/70">({exchangeRate.source})</span>
                  </span>
                </span>
              )}
              {lastUpdated && (
                <span className="flex items-center gap-1">
                  <span className="hidden sm:inline">•</span>
                  <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            {/* Currency Selector - IMPROVED CONTRAST */}
            <Select value={displayCurrency} onValueChange={(value: "USD" | "THB") => setDisplayCurrency(value)}>
              <SelectTrigger className="w-24 bg-gray-900 border-gray-700 text-white hover:bg-gray-800 hover:border-gray-600 focus:border-blue-500 transition-all duration-200">
                <Globe className="w-4 h-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem
                  value="USD"
                  className="text-white hover:bg-gray-700 focus:bg-gray-700 hover:text-white focus:text-white transition-colors cursor-pointer"
                >
                  USD
                </SelectItem>
                <SelectItem
                  value="THB"
                  className="text-white hover:bg-gray-700 focus:bg-gray-700 hover:text-white focus:text-white transition-colors cursor-pointer"
                >
                  THB
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={loadData}
              disabled={isLoading}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-600 bg-transparent transition-all duration-200"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Updating..." : "Refresh"}
            </Button>
            <AddTransactionForm />
          </div>
        </div>

        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-gray-800 bg-gray-900 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium text-gray-400">Total Portfolio Value</CardTitle>
              <Wallet className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl sm:text-2xl font-bold text-white">
                {formatCurrency(portfolioSummary.totalValue, displayCurrency)}
              </div>
              <div
                className={`flex items-center text-xs mt-1 ${portfolioSummary.dayChange >= 0 ? "text-[#30D158]" : "text-[#FF453A]"}`}
              >
                {portfolioSummary.dayChange >= 0 ? (
                  <ArrowUp className="w-3 h-3 mr-1" />
                ) : (
                  <ArrowDown className="w-3 h-3 mr-1" />
                )}
                {formatCurrency(Math.abs(portfolioSummary.dayChange), displayCurrency)} (
                {portfolioSummary.dayChangePercent.toFixed(2)}%)
              </div>
              <p className="text-xs text-gray-500 mt-1">Today's change</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-800 bg-gray-900 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium text-gray-400">Total Gain/Loss</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div
                className={`text-xl sm:text-2xl font-bold ${portfolioSummary.totalGainLoss >= 0 ? "text-[#30D158]" : "text-[#FF453A]"}`}
              >
                {formatCurrency(portfolioSummary.totalGainLoss, displayCurrency)}
              </div>
              <div
                className={`text-xs mt-1 ${portfolioSummary.totalGainLoss >= 0 ? "text-[#30D158]" : "text-[#FF453A]"}`}
              >
                {portfolioSummary.totalGainLossPercent >= 0 ? "+" : ""}
                {portfolioSummary.totalGainLossPercent.toFixed(2)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">Total return</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-800 bg-gray-900 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium text-gray-400">Total Invested</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl sm:text-2xl font-bold text-white">
                {formatCurrency(portfolioSummary.totalCost, displayCurrency)}
              </div>
              <div className="text-xs text-[#0A84FF] mt-1">Cost basis</div>
              <p className="text-xs text-gray-500 mt-1">Total invested</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-800 bg-gray-900 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium text-gray-400">Holdings</CardTitle>
              <PieChart className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl sm:text-2xl font-bold text-white">{holdings.length}</div>
              <div className="text-xs text-[#0A84FF] mt-1">Positions</div>
              <p className="text-xs text-gray-500 mt-1">Active holdings</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs - IMPROVED SIZE AND ALIGNMENT */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-gray-900 border border-gray-800 h-12">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300 hover:text-gray-100 hover:bg-gray-800 text-sm py-3 px-4 h-full flex items-center justify-center transition-all duration-200"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="holdings"
              className="data-[state=active]:bg-[#0A84FF] data-[state=active]:text-white text-gray-300 hover:text-gray-100 hover:bg-gray-800 text-sm py-3 px-4 h-full flex items-center justify-center transition-all duration-200"
            >
              Holdings
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="data-[state=active]:bg-[#0A84FF] data-[state=active]:text-white text-gray-300 hover:text-gray-100 hover:bg-gray-800 text-sm py-3 px-4 h-full flex items-center justify-center transition-all duration-200"
            >
              Transactions
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-[#0A84FF] data-[state=active]:text-white text-gray-300 hover:text-gray-100 hover:bg-gray-800 text-sm py-3 px-4 h-full flex items-center justify-center transition-all duration-200"
            >
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Portfolio Allocation - BIGGER PIE CHART & MOBILE OPTIMIZED */}
            <Card className="border border-gray-800 bg-gray-900 shadow-xl">
              <CardHeader className="px-6 py-4">
                <CardTitle className="text-lg font-semibold text-white">Portfolio Allocation</CardTitle>
                <CardDescription className="text-sm text-gray-400">Asset distribution and performance</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {assetAllocation.length > 0 ? (
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Pie Chart - BIGGER SIZE */}
                    <div className="w-full lg:w-[450px] flex-shrink-0 flex items-center justify-center h-[350px] lg:h-[450px]">
                      <div className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={assetAllocation}
                              cx="50%"
                              cy="50%"
                              innerRadius={80}
                              outerRadius={160}
                              paddingAngle={2}
                              dataKey="percentage"
                            >
                              {assetAllocation.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <ChartTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload
                                  return (
                                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
                                      <p className="text-white text-sm font-semibold">{data.symbol}</p>
                                      <p className="text-gray-300 text-xs">{data.name}</p>
                                      <p className="text-white text-sm">
                                        {formatCurrency(data.value, displayCurrency)}
                                      </p>
                                      <p className="text-gray-400 text-xs">{data.percentage.toFixed(1)}%</p>
                                      <div className="flex items-center gap-1 mt-1">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                                        <span className="text-xs" style={{ color: data.color }}>
                                          {getAssetTypeBadge(data.assetType).label}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                }
                                return null
                              }}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Asset Details Table - MOBILE OPTIMIZED */}
                    <div className="flex-1 flex flex-col min-w-0">
                      {/* Desktop Table Header */}
                      {/* Desktop Table Header - IMPROVED EVEN SPACING */}
                      <div className="hidden lg:grid grid-cols-10 gap-3 py-3 px-4 border-b border-gray-700 bg-gray-800/50 rounded-t-lg">
                        <div className="col-span-1 flex justify-center">
                          <span className="text-gray-300 font-medium text-xs uppercase tracking-wide">•</span>
                        </div>
                        <div className="col-span-3">
                          <span className="text-gray-300 font-medium text-xs uppercase tracking-wide">Asset Name</span>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-gray-300 font-medium text-xs uppercase tracking-wide">Allocation</span>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-gray-300 font-medium text-xs uppercase tracking-wide">Value</span>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-gray-300 font-medium text-xs uppercase tracking-wide">Gain/Loss</span>
                        </div>
                      </div>

                      {/* Mobile Table Header */}
                      <div className="lg:hidden grid grid-cols-8 gap-2 py-3 px-4 border-b border-gray-700 bg-gray-800/50 rounded-t-lg">
                        <div className="col-span-1 flex justify-center">
                          <span className="text-gray-300 font-medium text-xs uppercase tracking-wide">•</span>
                        </div>
                        <div className="col-span-5">
                          <span className="text-gray-300 font-medium text-xs uppercase tracking-wide">Asset Name</span>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-gray-300 font-medium text-xs uppercase tracking-wide">Allocation</span>
                        </div>
                      </div>

                      {/* Scrollable Asset List */}
                      <div className="flex-1 overflow-y-auto">
                        {assetAllocation.slice(0, 10).map((asset, index) => {
                          const badgeProps = getAssetTypeBadge(asset.assetType)
                          return (
                            <div key={index}>
                              {/* Desktop Row */}
                              {/* Desktop Row */}
                              <div className="hidden lg:grid grid-cols-10 gap-3 py-3 px-4 hover:bg-gray-800/50 transition-colors border-b border-gray-800/50 last:border-b-0">
                                {/* Color Dot */}
                                <div className="col-span-1 flex justify-center items-center">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: asset.color }} />
                                </div>

                                {/* Asset Name */}
                                <div className="col-span-3 flex flex-col justify-center min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white font-medium text-sm truncate">{asset.symbol}</span>
                                    <Badge
                                      variant="outline"
                                      className={`${badgeProps.className} text-xs py-0 px-1 flex-shrink-0 border-opacity-50 hover:border-opacity-75 transition-colors`}
                                    >
                                      {badgeProps.label}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-400 truncate hover:text-gray-300 transition-colors">
                                    {asset.name}
                                  </p>
                                </div>

                                {/* Allocation */}
                                <div className="col-span-2 flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">{asset.percentage.toFixed(1)}%</span>
                                </div>

                                {/* Value - ONE DECIMAL PLACE */}
                                <div className="col-span-2 flex items-center justify-end">
                                  <span className="text-white text-sm font-medium">
                                    {displayCurrency === "USD"
                                      ? `$${(asset.value).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
                                      : `฿${(asset.value).toLocaleString("th-TH", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                                  </span>
                                </div>

                                {/* Gain/Loss - TWO LINES WITH ONE DECIMAL PLACE */}
                                <div className="col-span-2 flex flex-col items-end justify-center">
                                  <span
                                    className={`text-sm font-medium ${asset.gainLoss >= 0 ? "text-green-400 hover:text-green-300" : "text-red-400 hover:text-red-300"} transition-colors`}
                                  >
                                    {asset.gainLoss >= 0 ? "+" : ""}
                                    {displayCurrency === "USD"
                                      ? `$${Math.abs(asset.gainLoss).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
                                      : `฿${Math.abs(asset.gainLoss).toLocaleString("th-TH", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                                  </span>
                                  <span
                                    className={`text-xs ${asset.gainLoss >= 0 ? "text-green-400/80" : "text-red-400/80"}`}
                                  >
                                    {asset.gainLossPercent >= 0 ? "+" : ""}
                                    {asset.gainLossPercent.toFixed(1)}%
                                  </span>
                                </div>
                              </div>

                              {/* Mobile Row - SIMPLIFIED */}
                              <div className="lg:hidden grid grid-cols-8 gap-2 py-3 px-4 hover:bg-gray-800/50 transition-colors border-b border-gray-800/50 last:border-b-0">
                                {/* Color Dot */}
                                <div className="col-span-1 flex justify-center items-center">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: asset.color }} />
                                </div>

                                {/* Asset Name */}
                                <div className="col-span-5 flex flex-col justify-center min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white font-medium text-sm truncate">{asset.symbol}</span>
                                    <Badge
                                      variant="outline"
                                      className="text-xs py-0 px-1 flex-shrink-0 border-opacity-50"
                                      style={{
                                        color: badgeProps.color,
                                        borderColor: badgeProps.color + "50",
                                        backgroundColor: badgeProps.color + "10",
                                      }}
                                    >
                                      {badgeProps.label.split(" ")[0]}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-400 truncate">{asset.name}</p>
                                </div>

                                {/* Allocation */}
                                <div className="col-span-2 flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">{asset.percentage.toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-12">
                    <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No holdings to display</p>
                    <p className="text-xs mt-1">Add your first transaction to see allocation</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Portfolio Performance Chart */}
            <Card className="border border-gray-800 bg-gray-900 shadow-xl">
              <CardHeader className="px-6 py-4">
                <CardTitle className="text-lg font-semibold text-white">Portfolio Performance (1 Year)</CardTitle>
                <CardDescription className="text-sm text-gray-400">
                  12-month portfolio value trend in {displayCurrency}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={portfolioData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#9CA3AF", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickMargin={8}
                      />
                      <YAxis
                        tick={{ fill: "#9CA3AF", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) =>
                          displayCurrency === "USD"
                            ? `$${(value / 1000).toFixed(0)}k`
                            : `฿${(value / 1000).toFixed(0)}k`
                        }
                        width={50}
                      />
                      <ChartTooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
                                <p className="text-gray-300 text-sm font-medium">{`${label}`}</p>
                                <p className="text-[#0A84FF] font-semibold">
                                  {`Portfolio: ${formatCurrency(payload[0].value as number, displayCurrency)}`}
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
                        activeDot={{ r: 4, fill: "#0A84FF", stroke: "#1F2937", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="holdings" className="space-y-4">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  placeholder="Search holdings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border border-gray-800 bg-gray-900 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 hover:border-gray-700 transition-colors"
                />
              </div>
              <Button
                variant="outline"
                className="border-gray-800 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-600 transition-all duration-200"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>

            {/* Holdings Table */}
            <Card className="border border-gray-800 bg-gray-900 shadow-xl">
              <CardHeader className="px-6 py-4">
                <CardTitle className="text-lg font-semibold text-white">Holdings</CardTitle>
                <CardDescription className="text-gray-400">Your investment positions sorted by value</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {sortedHoldings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No holdings found. Add your first transaction to get started!</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table - IMPROVED EVEN SPACING */}
                    <div className="hidden lg:block overflow-x-auto">
                      {/* Desktop Table Header - EVENLY SPACED 6 COLUMNS */}
                      <div className="grid grid-cols-6 gap-4 py-4 px-4 border-b border-gray-700 bg-gray-800/30 rounded-t-lg text-sm font-medium text-gray-300">
                        <div className="flex items-center justify-center">Symbol & Name</div>
                        <div className="flex items-center justify-center">Shares</div>
                        <div className="flex items-center justify-center">Avg Cost</div>
                        <div className="flex items-center justify-center">Current</div>
                        <div className="flex items-center justify-center">Market Value</div>
                        <div className="flex items-center justify-center">Gain/Loss</div>
                      </div>

                      {/* Desktop Table Rows - EVENLY SPACED 6 COLUMNS */}
                      <div className="divide-y divide-gray-800">
                        {sortedHoldings.map((holding) => {
                          const badgeProps = getAssetTypeBadge(holding.assetType)
                          // In the holdings table, replace the conversion calls with this pattern:
                          const convertedCurrentValue = convertCurrencySync(
                            holding.currentValue || 0,
                            holding.currency || "USD",
                            displayCurrency,
                          )
                          const convertedCurrentPrice = convertCurrencySync(
                            holding.currentPrice || 0,
                            holding.currency || "USD",
                            displayCurrency,
                          )
                          const convertedAvgCost = convertCurrencySync(
                            holding.avg_cost_basis || 0,
                            holding.currency || "USD",
                            displayCurrency,
                          )
                          const convertedTotalInvested = convertCurrencySync(
                            holding.total_invested || 0,
                            holding.currency || "USD",
                            displayCurrency,
                          )
                          const convertedGainLoss = convertCurrencySync(
                            holding.gainLoss || 0,
                            holding.currency || "USD",
                            displayCurrency,
                          )

                          // Make sure all these values are valid numbers before displaying
                          const safeCurrentValue = isNaN(convertedCurrentValue) ? 0 : convertedCurrentValue
                          const safeCurrentPrice = isNaN(convertedCurrentPrice) ? 0 : convertedCurrentPrice
                          const safeAvgCost = isNaN(convertedAvgCost) ? 0 : convertedAvgCost
                          const safeTotalInvested = isNaN(convertedTotalInvested) ? 0 : convertedTotalInvested
                          const safeGainLoss = isNaN(convertedGainLoss) ? 0 : convertedGainLoss

                          return (
                            <div
                              key={holding.symbol}
                              className="grid grid-cols-6 gap-4 py-4 px-4 hover:bg-gray-800/30 transition-colors text-sm"
                            >
                              {/* Symbol & Name - 1 column */}
                              <div className="flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-1">
                                  <div
                                    className="w-8 h-6 rounded flex items-center justify-center text-xs font-bold"
                                    style={{
                                      backgroundColor: badgeProps.color + "20",
                                      color: badgeProps.color,
                                    }}
                                  >
                                    {formatSymbol(holding.symbol)}
                                  </div>
                                  <Badge variant="outline" className={`${badgeProps.className} text-xs py-0 px-1`}>
                                    {badgeProps.label.split(" ")[0]}
                                  </Badge>
                                </div>
                                <p className="font-medium text-white truncate text-xs">{holding.symbol}</p>
                                <p className="text-xs text-gray-400 truncate">{holding.company_name}</p>
                              </div>

                              {/* Shares - 1 column */}
                              <div className="flex items-center justify-center">
                                <span className="text-white font-medium">{holding.total_shares.toLocaleString()}</span>
                              </div>

                              {/* Avg Cost - 1 column */}
                              <div className="flex items-center justify-center">
                                <span className="text-white">{formatCurrency(safeAvgCost, displayCurrency)}</span>
                              </div>

                              {/* Current Price - 1 column */}
                              <div className="flex items-center justify-center">
                                <span className="text-white">{formatCurrency(safeCurrentPrice, displayCurrency)}</span>
                              </div>

                              {/* Market Value - 1 column */}
                              <div className="flex items-center justify-center">
                                <span className="text-white font-medium">
                                  {formatCurrency(safeCurrentValue, displayCurrency)}
                                </span>
                              </div>

                              {/* Gain/Loss - 1 column */}
                              <div className="flex flex-col items-center justify-center">
                                <div
                                  className={`flex items-center ${holding.gainLoss >= 0 ? "text-green-400" : "text-red-400"}`}
                                >
                                  {holding.gainLoss >= 0 ? (
                                    <ArrowUp className="w-3 h-3 mr-1" />
                                  ) : (
                                    <ArrowDown className="w-3 h-3 mr-1" />
                                  )}
                                  <span className="font-medium text-xs">
                                    {formatCurrency(Math.abs(safeGainLoss), displayCurrency)}
                                  </span>
                                </div>
                                <div className={`text-xs ${holding.gainLoss >= 0 ? "text-green-400" : "text-red-400"}`}>
                                  {holding.gainLossPercent >= 0 ? "+" : ""}
                                  {holding.gainLossPercent.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Mobile Table with Horizontal Scroll - IMPROVED LAYOUT */}
                    <div className="lg:hidden">
                      <div className="flex border border-gray-800 rounded-lg overflow-hidden">
                        {/* Frozen Left Column - Asset Symbols Only */}
                        <div className="flex-shrink-0 w-20 bg-gray-800/50">
                          {/* Header */}
                          <div className="h-12 flex items-center justify-center border-b border-gray-700 bg-gray-800">
                            <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">Asset</span>
                          </div>
                          {/* Rows */}
                          <div className="divide-y divide-gray-700">
                            {sortedHoldings.map((holding) => {
                              const badgeProps = getAssetTypeBadge(holding.assetType)
                              return (
                                <div
                                  key={holding.symbol}
                                  className="h-16 flex flex-col items-center justify-center px-2"
                                >
                                  <div
                                    className="w-8 h-6 rounded flex items-center justify-center text-xs font-bold mb-1"
                                    style={{
                                      backgroundColor: badgeProps.color + "20",
                                      color: badgeProps.color,
                                    }}
                                  >
                                    {formatSymbol(holding.symbol)}
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="text-xs py-0 px-1"
                                    style={{
                                      color: badgeProps.color,
                                      borderColor: badgeProps.color + "50",
                                      backgroundColor: badgeProps.color + "10",
                                    }}
                                  >
                                    {badgeProps.label.split(" ")[0]}
                                  </Badge>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Scrollable Right Section */}
                        <div className="flex-1 overflow-x-auto">
                          <div className="min-w-[700px]">
                            {/* Header */}
                            <div className="h-12 grid grid-cols-6 gap-3 px-3 border-b border-gray-700 bg-gray-800/30 text-xs font-medium text-gray-300 uppercase tracking-wide">
                              <div className="flex items-center justify-center">Shares</div>
                              <div className="flex items-center justify-end">Avg Cost</div>
                              <div className="flex items-center justify-end">Current</div>
                              <div className="flex items-center justify-end">Cost Basis</div>
                              <div className="flex items-center justify-end">Market Value</div>
                              <div className="flex items-center justify-end">Gain/Loss</div>
                            </div>
                            {/* Rows */}
                            <div className="divide-y divide-gray-700">
                              {sortedHoldings.map((holding) => {
                                // In the holdings table, replace the conversion calls with this pattern:
                                const convertedCurrentValue = convertCurrencySync(
                                  holding.currentValue || 0,
                                  holding.currency || "USD",
                                  displayCurrency,
                                )
                                const convertedCurrentPrice = convertCurrencySync(
                                  holding.currentPrice || 0,
                                  holding.currency || "USD",
                                  displayCurrency,
                                )
                                const convertedAvgCost = convertCurrencySync(
                                  holding.avg_cost_basis || 0,
                                  holding.currency || "USD",
                                )
                                const convertedTotalInvested = convertCurrencySync(
                                  holding.total_invested || 0,
                                  holding.currency || "USD",
                                )
                                const convertedGainLoss = convertCurrencySync(
                                  holding.gainLoss || 0,
                                  holding.currency || "USD",
                                )

                                // Make sure all these values are valid numbers before displaying
                                const safeCurrentValue = isNaN(convertedCurrentValue) ? 0 : convertedCurrentValue
                                const safeCurrentPrice = isNaN(convertedCurrentPrice) ? 0 : convertedCurrentPrice
                                const safeAvgCost = isNaN(convertedAvgCost) ? 0 : convertedAvgCost
                                const safeTotalInvested = isNaN(convertedTotalInvested) ? 0 : convertedTotalInvested
                                const safeGainLoss = isNaN(convertedGainLoss) ? 0 : convertedGainLoss

                                return (
                                  <div key={holding.symbol} className="h-16 grid grid-cols-6 gap-3 px-3 text-sm">
                                    {/* Shares */}
                                    <div className="flex items-center justify-center text-white font-medium">
                                      {holding.total_shares.toLocaleString()}
                                    </div>
                                    {/* Avg Cost */}
                                    <div className="flex items-center justify-end text-white">
                                      {formatCurrency(safeAvgCost, displayCurrency)}
                                    </div>
                                    {/* Current Price */}
                                    <div className="flex items-center justify-end text-white">
                                      {formatCurrency(safeCurrentPrice, displayCurrency)}
                                    </div>
                                    {/* Cost Basis */}
                                    <div className="flex items-center justify-end text-white">
                                      {formatCurrency(safeTotalInvested, displayCurrency)}
                                    </div>
                                    {/* Market Value */}
                                    <div className="flex items-center justify-end text-white font-medium">
                                      {formatCurrency(safeCurrentValue, displayCurrency)}
                                    </div>
                                    {/* Gain/Loss */}
                                    <div className="flex flex-col items-end justify-center">
                                      <div
                                        className={`flex items-center ${holding.gainLoss >= 0 ? "text-green-400" : "text-red-400"}`}
                                      >
                                        {holding.gainLoss >= 0 ? (
                                          <ArrowUp className="w-3 h-3 mr-1" />
                                        ) : (
                                          <ArrowDown className="w-3 h-3 mr-1" />
                                        )}
                                        <span className="font-medium text-xs">
                                          {formatCurrency(Math.abs(safeGainLoss), displayCurrency)}
                                        </span>
                                      </div>
                                      <div
                                        className={`text-xs ${holding.gainLoss >= 0 ? "text-green-400" : "text-red-400"}`}
                                      >
                                        {holding.gainLossPercent >= 0 ? "+" : ""}
                                        {holding.gainLossPercent.toFixed(1)}%
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-center">← Swipe left to see more details</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card className="border border-gray-800 bg-gray-900 shadow-xl">
              <CardHeader className="px-6 py-4">
                <CardTitle className="text-lg font-semibold text-white">Recent Transactions</CardTitle>
                <CardDescription className="text-gray-400">
                  Your latest investment activities (sorted by date)
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="space-y-3">
                  {sortedTransactions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No transactions yet. Add your first transaction to get started!</p>
                    </div>
                  ) : (
                    sortedTransactions.slice(0, 10).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border border-gray-800 rounded-lg hover:bg-gray-800/70 hover:border-gray-700 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3 flex-1">
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
                                ? "bg-[#0A84FF] hover:bg-[#0056CC] text-white"
                                : transaction.transaction_type === "SELL"
                                  ? "bg-[#FF453A] hover:bg-[#D70015] text-white"
                                  : "bg-gray-600 hover:bg-gray-700 text-white"
                            }
                          >
                            {transaction.transaction_type}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-semibold text-white">{transaction.symbol}</p>
                            <p className="text-sm text-gray-400">
                              {transaction.shares} {transaction.symbol.includes("GOLD") ? "grams" : "shares"} @{" "}
                              {formatCurrency(transaction.price_per_share, displayCurrency)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold text-white">
                              {formatCurrency(transaction.total_amount, displayCurrency)}
                            </p>
                            <p className="text-sm text-gray-400">{transaction.transaction_date}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTransaction(transaction)}
                              className="hover:bg-blue-900/30 text-blue-400 hover:text-blue-300 transition-all duration-200"
                              title="Edit transaction"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setTransactionToDelete(transaction)
                                setDeleteDialogOpen(true)
                              }}
                              className="hover:bg-red-900/30 text-red-400 hover:text-red-300 transition-all duration-200"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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
                <CardHeader className="px-6 py-4">
                  <CardTitle className="text-lg font-semibold text-white">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-4">
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
                    <span className="font-semibold text-white">
                      {formatCurrency(portfolioSummary.totalCost, displayCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Current Value</span>
                    <span className="font-semibold text-white">
                      {formatCurrency(portfolioSummary.totalValue, displayCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Number of Holdings</span>
                    <span className="font-semibold text-white">{holdings.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-800 bg-gray-900 shadow-xl">
                <CardHeader className="px-6 py-4">
                  <CardTitle className="text-lg font-semibold text-white">Today's Performance</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Day Change</span>
                    <span
                      className={`font-semibold ${portfolioSummary.dayChange >= 0 ? "text-[#30D158]" : "text-[#FF453A]"}`}
                    >
                      {portfolioSummary.dayChange >= 0 ? "+" : ""}
                      {formatCurrency(portfolioSummary.dayChange, displayCurrency)}
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

        {/* Delete Transaction Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Are you sure you want to delete this transaction? This action cannot be undone.
              </AlertDialogDescription>
              {transactionToDelete && (
                <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                  <div className="text-white font-medium">
                    {transactionToDelete.transaction_type} {transactionToDelete.shares} shares of{" "}
                    {transactionToDelete.symbol}
                  </div>
                  <div className="text-gray-400 text-sm">
                    @ {formatCurrency(transactionToDelete.price_per_share, displayCurrency)} on{" "}
                    {transactionToDelete.transaction_date}
                  </div>
                </div>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTransaction} className="bg-red-600 hover:bg-red-700 text-white">
                Delete Transaction
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Transaction Dialog */}
        <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <AlertDialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Transaction</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Modify the transaction details below.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {transactionToEdit && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300 block mb-2">Type</label>
                    <select
                      value={editFormData.transaction_type}
                      onChange={(e) => setEditFormData({ ...editFormData, transaction_type: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm hover:border-gray-600 focus:border-blue-500 transition-colors"
                    >
                      <option value="BUY">Buy</option>
                      <option value="SELL">Sell</option>
                      <option value="DIVIDEND">Dividend</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 block mb-2">Date</label>
                    <input
                      type="date"
                      value={editFormData.transaction_date}
                      onChange={(e) => setEditFormData({ ...editFormData, transaction_date: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm hover:border-gray-600 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300 block mb-2">Shares</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={editFormData.shares}
                      onChange={(e) => setEditFormData({ ...editFormData, shares: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm hover:border-gray-600 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 block mb-2">Price per Share</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.price_per_share}
                      onChange={(e) => setEditFormData({ ...editFormData, price_per_share: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm hover:border-gray-600 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 block mb-2">Notes</label>
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm hover:border-gray-600 focus:border-blue-500 transition-colors"
                    rows={2}
                  />
                </div>

                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="text-white font-medium text-sm">{transactionToEdit.symbol}</div>
                  <div className="text-gray-400 text-xs">
                    Total:{" "}
                    {formatCurrency(
                      Number.parseFloat(editFormData.shares || "0") *
                        Number.parseFloat(editFormData.price_per_share || "0"),
                      displayCurrency,
                    )}
                  </div>
                </div>
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleEditSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">
                Save Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
