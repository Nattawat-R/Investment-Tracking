"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search } from "lucide-react"
import { addTransaction } from "@/app/actions/transactions"
import type { StockInfo } from "@/lib/financial-api"
import { getAssetTypeBadge } from "@/lib/financial-api"

export default function AddTransactionForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<StockInfo[]>([])
  const [selectedStock, setSelectedStock] = useState<StockInfo | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const handleStockSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/search-stocks?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      setSearchResults(data.results || [])
    } catch (error) {
      console.error("Error searching stocks:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    try {
      const result = await addTransaction(formData)
      if (result.success) {
        setIsOpen(false)
        setSelectedStock(null)
        setSearchQuery("")
        setSearchResults([])
      } else {
        console.error("Error adding transaction:", result.error)
      }
    } catch (error) {
      console.error("Error submitting transaction:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#0A84FF] hover:bg-[#0056CC] text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Transaction</DialogTitle>
          <DialogDescription className="text-gray-400">
            Record a new buy, sell, or dividend transaction for your portfolio.
            <br />
            <span className="text-xs text-gray-500">
              Supports US stocks, Thai stocks (SET), cryptocurrencies, and Thai Gold
            </span>
            <br />
            <span className="text-xs text-yellow-400">
              💡 Prices should be entered in the asset's native currency (USD for US stocks/crypto, THB for Thai assets)
            </span>
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          {/* Stock Search */}
          <div className="space-y-2">
            <Label htmlFor="stock-search" className="text-gray-300">
              Search Asset
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
              <Input
                id="stock-search"
                placeholder="Search stocks, crypto, Thai stocks, or Thai Gold (e.g., AAPL, BTC, PTT, GOLD96.5)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  handleStockSearch(e.target.value)
                }}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 hover:border-gray-600 transition-colors"
              />
            </div>

            {isSearching && (
              <div className="text-xs text-gray-400 px-3 py-2">
                Searching across US stocks, Thai stocks, cryptocurrencies, and Thai Gold...
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="max-h-60 overflow-y-auto bg-gray-800 border border-gray-700 rounded-md">
                {searchResults.map((stock, index) => {
                  const badgeProps = getAssetTypeBadge(stock.assetType)
                  return (
                    <button
                      key={`${stock.symbol}-${index}`}
                      type="button"
                      onClick={() => {
                        setSelectedStock(stock)
                        setSearchQuery(`${stock.symbol} - ${stock.name}`)
                        setSearchResults([])
                      }}
                      className="w-full text-left p-3 hover:bg-gray-700 hover:border-gray-600 border-b border-gray-700 last:border-b-0 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white">{stock.symbol}</div>
                          <div className="text-sm text-gray-400">{stock.name}</div>
                          <div className="text-xs text-gray-500">
                            {stock.exchange} • {stock.currency}
                          </div>
                        </div>
                        <Badge variant="outline" className={badgeProps.className}>
                          {badgeProps.label}
                        </Badge>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Selected Asset Info */}
          {selectedStock && (
            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{selectedStock.symbol}</div>
                  <div className="text-sm text-gray-400">{selectedStock.name}</div>
                  <div className="text-xs text-gray-500">
                    {selectedStock.exchange} •{" "}
                    <span className="font-medium text-blue-400">{selectedStock.currency}</span>
                  </div>
                </div>
                <Badge variant="outline" className={getAssetTypeBadge(selectedStock.assetType).className}>
                  {getAssetTypeBadge(selectedStock.assetType).label}
                </Badge>
              </div>
            </div>
          )}

          {/* Hidden inputs for selected stock */}
          <input type="hidden" name="symbol" value={selectedStock?.symbol || ""} />
          <input type="hidden" name="companyName" value={selectedStock?.name || ""} />
          <input type="hidden" name="assetType" value={selectedStock?.assetType || ""} />
          <input type="hidden" name="currency" value={selectedStock?.currency || ""} />
          <input type="hidden" name="exchange" value={selectedStock?.exchange || ""} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transactionType" className="text-gray-300">
                Transaction Type
              </Label>
              <Select name="transactionType" required>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white hover:border-gray-600 focus:border-blue-500 transition-colors">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="BUY" className="text-white hover:bg-gray-700 focus:bg-gray-700 transition-colors">
                    Buy
                  </SelectItem>
                  <SelectItem value="SELL" className="text-white hover:bg-gray-700 focus:bg-gray-700 transition-colors">
                    Sell
                  </SelectItem>
                  <SelectItem
                    value="DIVIDEND"
                    className="text-white hover:bg-gray-700 focus:bg-gray-700 transition-colors"
                  >
                    Dividend
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transactionDate" className="text-gray-300">
                Date
              </Label>
              <Input
                id="transactionDate"
                name="transactionDate"
                type="date"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shares" className="text-gray-300">
                {selectedStock?.assetType === "CRYPTO"
                  ? "Amount"
                  : selectedStock?.assetType === "THAI_GOLD"
                    ? "Weight (grams)"
                    : "Shares"}
              </Label>
              <Input
                id="shares"
                name="shares"
                type="number"
                step="0.0001"
                min="0"
                required
                placeholder="0.00"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricePerShare" className="text-gray-300">
                Price per{" "}
                {selectedStock?.assetType === "CRYPTO"
                  ? "Unit"
                  : selectedStock?.assetType === "THAI_GOLD"
                    ? "Gram"
                    : "Share"}{" "}
                <span className="font-semibold text-blue-400">({selectedStock?.currency || "USD"})</span>
              </Label>
              <Input
                id="pricePerShare"
                name="pricePerShare"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder={`0.00 ${selectedStock?.currency || "USD"}`}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-300">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Add any notes about this transaction..."
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 hover:border-gray-600 transition-colors"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !selectedStock}
              className="bg-[#0A84FF] hover:bg-[#0056CC] text-white"
            >
              {isLoading ? "Adding..." : "Add Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
