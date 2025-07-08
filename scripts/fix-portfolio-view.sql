-- Add additional debugging and ensure absolutely correct share calculations
DROP VIEW IF EXISTS portfolio_holdings;

-- Create corrected holdings view with explicit share calculation debugging
CREATE OR REPLACE VIEW portfolio_holdings AS
SELECT 
  symbol,
  company_name,
  -- Explicit share calculation with detailed logic
  SUM(CASE 
    WHEN transaction_type = 'BUY' THEN shares 
    WHEN transaction_type = 'SELL' THEN -shares 
    ELSE 0 
  END) as total_shares,
  -- Debug: Show buy shares separately
  SUM(CASE WHEN transaction_type = 'BUY' THEN shares ELSE 0 END) as total_buy_shares,
  -- Debug: Show sell shares separately  
  SUM(CASE WHEN transaction_type = 'SELL' THEN shares ELSE 0 END) as total_sell_shares,
  -- Calculate average cost basis only for BUY transactions
  CASE 
    WHEN SUM(CASE WHEN transaction_type = 'BUY' THEN shares ELSE 0 END) > 0 
    THEN SUM(CASE WHEN transaction_type = 'BUY' THEN shares * price_per_share ELSE 0 END) / 
         SUM(CASE WHEN transaction_type = 'BUY' THEN shares ELSE 0 END)
    ELSE 0 
  END as avg_cost_basis,
  -- Calculate total invested (net of sells)
  SUM(CASE 
    WHEN transaction_type = 'BUY' THEN total_amount 
    WHEN transaction_type = 'SELL' THEN -total_amount 
    ELSE 0 
  END) as total_invested
FROM transactions 
WHERE transaction_type IN ('BUY', 'SELL')
GROUP BY symbol, company_name
HAVING SUM(CASE 
  WHEN transaction_type = 'BUY' THEN shares 
  WHEN transaction_type = 'SELL' THEN -shares 
  ELSE 0 
END) > 0.0001; -- Use small threshold to handle floating point precision

-- Add debugging query to check USDT specifically
-- This will help identify the issue
CREATE OR REPLACE VIEW transaction_debug AS
SELECT 
  symbol,
  transaction_type,
  shares,
  price_per_share,
  total_amount,
  transaction_date,
  CASE 
    WHEN transaction_type = 'BUY' THEN shares 
    WHEN transaction_type = 'SELL' THEN -shares 
    ELSE 0 
  END as net_shares
FROM transactions 
WHERE symbol = 'USDT'
ORDER BY transaction_date;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_symbol_type ON transactions(symbol, transaction_type);
