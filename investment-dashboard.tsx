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
  Globe,
  Trash2,
  Edit,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import { formatCurrency, getAssetTypeBadge, convertCurrency } from "@/lib/financial-api"
import {
  type EnrichedHolding,
  type PortfolioSummary,
  calculatePortfolioSummary,
  enrichHoldingsWithMarketData,
  calculateAssetAllocation,
  generatePortfolioHistory,
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
        const summary = calculatePortfolioSummary(enrichedHoldings, displayCurrency)
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

  // Generate 1-year portfolio history data based on actual transactions
  const portfolioData = generatePortfolioHistory(
    portfolioSummary.totalValue,
    portfolioSummary.totalGainLoss,
    transactions,
  )

  // Calculate individual asset allocation for pie chart
  const assetAllocation = calculateAssetAllocation(holdings, displayCurrency)

  return (
    <div className="min-h-screen bg-gray-950 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Investment Portfolio</h1>
            <p className="text-sm text-gray-400 mt-1">
              Track your investments and portfolio performance
              {lastUpdated && <span className="ml-2">• Last updated: {lastUpdated.toLocaleTimeString()}</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            {/* Currency Selector */}
            <Select value={displayCurrency} onValueChange={(value: "USD" | "THB") => setDisplayCurrency(value)}>
              <SelectTrigger className="w-24 bg-gray-900 border-gray-700 text-white">
                <Globe className="w-4 h-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="USD" className="text-white hover:bg-gray-800">
                  USD
                </SelectItem>
                <SelectItem value="THB" className="text-white hover:bg-gray-800">
                  THB
                </SelectItem>
              </SelectContent>
            </Select>
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

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-gray-900 border border-gray-800">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#0A84FF] data-[state=active]:text-white text-gray-400 hover:text-gray-200 text-sm py-2.5"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="holdings"
              className="data-[state=active]:bg-[#0A84FF] data-[state=active]:text-white text-gray-400 hover:text-gray-200 text-sm py-2.5"
            >
              Holdings
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="data-[state=active]:bg-[#0A84FF] data-[state=active]:text-white text-gray-400 hover:text-gray-200 text-sm py-2.5"
            >
              Transactions
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-[#0A84FF] data-[state=active]:text-white text-gray-400 hover:text-gray-200 text-sm py-2.5"
            >
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Portfolio Allocation - Full Width */}
            <Card className="border border-gray-800 bg-gray-900 shadow-xl">
              <CardHeader className="px-6 py-4">
                <CardTitle className="text-lg font-semibold text-white">Portfolio Allocation</CardTitle>
                <CardDescription className="text-sm text-gray-400">Asset distribution and performance</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {assetAllocation.length > 0 ? (
                  <div className="flex gap-6 h-[400px]">
                    {/* Pie Chart - Left Side */}
                    <div className="w-[350px] flex-shrink-0 flex items-center justify-center">
                      <div className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={assetAllocation}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={150}
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

                    {/* Asset Details Table - Right Side */}
                    <div className="flex-1 flex flex-col min-w-0">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-2 py-3 px-4 border-b border-gray-700 bg-gray-800/50 rounded-t-lg">
                        <div className="col-span-1 flex justify-center">
                          <span className="text-gray-400 font-medium text-xs uppercase tracking-wide">•</span>
                        </div>
                        <div className="col-span-4">
                          <span className="text-gray-400 font-medium text-xs uppercase tracking-wide">Asset Name</span>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-gray-400 font-medium text-xs uppercase tracking-wide">Allocation</span>
                        </div>
                        <div className="col-span-3 text-right">
                          <span className="text-gray-400 font-medium text-xs uppercase tracking-wide">Value</span>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-gray-400 font-medium text-xs uppercase tracking-wide">Gain/Loss</span>
                        </div>
                      </div>

                      {/* Scrollable Asset List */}
                      <div className="flex-1 overflow-y-auto">
                        {assetAllocation.slice(0, 10).map((asset, index) => {
                          const badgeProps = getAssetTypeBadge(asset.assetType)
                          return (
                            <div
                              key={index}
                              className="grid grid-cols-12 gap-2 py-3 px-4 hover:bg-gray-800/30 transition-colors border-b border-gray-800/50 last:border-b-0"
                            >
                              {/* Color Dot */}
                              <div className="col-span-1 flex justify-center items-center">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: asset.color }} />
                              </div>

                              {/* Asset Name */}
                              <div className="col-span-4 flex flex-col justify-center min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-white font-medium text-sm truncate">{asset.symbol}</span>
                                  <Badge
                                    variant="outline"
                                    className={`${badgeProps.className} text-xs py-0 px-1 flex-shrink-0`}
                                  >
                                    {badgeProps.label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-500 truncate">{asset.name}</p>
                              </div>

                              {/* Allocation */}
                              <div className="col-span-2 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">{asset.percentage.toFixed(1)}%</span>
                              </div>

                              {/* Value */}
                              <div className="col-span-3 flex items-center justify-end">
                                <span className="text-white text-sm">
                                  {formatCurrency(asset.value, displayCurrency)}
                                </span>
                              </div>

                              {/* Gain/Loss */}
                              <div className="col-span-2 flex items-center justify-end">
                                <span
                                  className={`text-sm ${asset.gainLoss >= 0 ? "text-[#30D158]" : "text-[#FF453A]"}`}
                                >
                                  {asset.gainLoss >= 0 ? "+" : ""}
                                  {formatCurrency(asset.gainLoss, displayCurrency)}
                                </span>
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

            {/* Portfolio Performance Chart - Moved Below */}
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
                  className="pl-10 border border-gray-800 bg-gray-900 text-white placeholder-gray-500 focus:border-[#0A84FF]"
                />
              </div>
              <Button
                variant="outline"
                className="border-gray-800 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>

            {/* Holdings List */}
            <div className="space-y-4">
              {filteredHoldings.length === 0 ? (
                <Card className="border border-gray-800 bg-gray-900 shadow-xl">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-400">No holdings found. Add your first transaction to get started!</p>
                  </CardContent>
                </Card>
              ) : (
                filteredHoldings.map((holding) => {
                  const badgeProps = getAssetTypeBadge(holding.assetType)
                  const convertedCurrentValue = convertCurrency(holding.currentValue, holding.currency, displayCurrency)
                  const convertedCurrentPrice = convertCurrency(holding.currentPrice, holding.currency, displayCurrency)
                  const convertedAvgCost = convertCurrency(holding.avg_cost_basis, holding.currency, displayCurrency)
                  const convertedTotalInvested = convertCurrency(
                    holding.total_invested,
                    holding.currency,
                    displayCurrency,
                  )
                  const convertedGainLoss = convertCurrency(holding.gainLoss, holding.currency, displayCurrency)

                  return (
                    <Card key={holding.symbol} className="border border-gray-800 bg-gray-900 shadow-xl">
                      <CardContent className="p-6">
                        <div className="flex flex-col gap-4">
                          {/* Header Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center border flex-shrink-0"
                                style={{
                                  backgroundColor: badgeProps.color + "20",
                                  borderColor: badgeProps.color + "30",
                                }}
                              >
                                <span className="font-semibold text-sm" style={{ color: badgeProps.color }}>
                                  {holding.symbol.slice(0, 2)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-white text-base">{holding.symbol}</h3>
                                  <Badge variant="outline" className={badgeProps.className}>
                                    {badgeProps.label}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-400 truncate">{holding.company_name}</p>
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
                                <DropdownMenuItem className="hover:bg-gray-800 hover:text-white">
                                  Buy More
                                </DropdownMenuItem>
                                <DropdownMenuItem className="hover:bg-gray-800 hover:text-white">Sell</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Data Grid */}
                          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 text-sm">
                            <div>
                              <p className="text-gray-400 mb-1">
                                {holding.assetType === "THAI_GOLD" ? "Amount" : "Shares"}
                              </p>
                              <p className="font-semibold text-white">{holding.total_shares.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-1">Avg Cost</p>
                              <p className="font-semibold text-white">
                                {formatCurrency(convertedAvgCost, displayCurrency)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-1">Current Price</p>
                              <p className="font-semibold text-white">
                                {formatCurrency(convertedCurrentPrice, displayCurrency)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-1">Cost Basis</p>
                              <p className="font-semibold text-white">
                                {formatCurrency(convertedTotalInvested, displayCurrency)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-1">Market Value</p>
                              <p className="font-semibold text-white">
                                {formatCurrency(convertedCurrentValue, displayCurrency)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-1">Gain/Loss</p>
                              <div className="space-y-1">
                                <div
                                  className={`flex items-center ${holding.gainLoss >= 0 ? "text-[#30D158]" : "text-[#FF453A]"}`}
                                >
                                  {holding.gainLoss >= 0 ? (
                                    <ArrowUp className="w-3 h-3 mr-1" />
                                  ) : (
                                    <ArrowDown className="w-3 h-3 mr-1" />
                                  )}
                                  <span className="font-semibold">
                                    {formatCurrency(Math.abs(convertedGainLoss), displayCurrency)}
                                  </span>
                                </div>
                                <div
                                  className={`text-xs ${holding.gainLoss >= 0 ? "text-[#30D158]" : "text-[#FF453A]"}`}
                                >
                                  {holding.gainLossPercent >= 0 ? "+" : ""}
                                  {holding.gainLossPercent.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card className="border border-gray-800 bg-gray-900 shadow-xl">
              <CardHeader className="px-6 py-4">
                <CardTitle className="text-lg font-semibold text-white">Recent Transactions</CardTitle>
                <CardDescription className="text-gray-400">Your latest investment activities</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No transactions yet. Add your first transaction to get started!</p>
                    </div>
                  ) : (
                    transactions.slice(0, 10).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors"
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
                              className="hover:bg-blue-900/20 text-blue-400 hover:text-blue-300"
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
                              className="hover:bg-red-900/20 text-red-400 hover:text-red-300"
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
              <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</AlertDialogCancel>
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
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
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
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
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
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 block mb-2">Price per Share</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.price_per_share}
                      onChange={(e) => setEditFormData({ ...editFormData, price_per_share: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 block mb-2">Notes</label>
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
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
              <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</AlertDialogCancel>
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
