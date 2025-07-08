-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  company_name VARCHAR(255),
  transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('BUY', 'SELL', 'DIVIDEND')),
  shares DECIMAL(10,4) NOT NULL,
  price_per_share DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  transaction_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create holdings view (calculated from transactions)
CREATE OR REPLACE VIEW portfolio_holdings AS
SELECT 
  symbol,
  company_name,
  SUM(CASE WHEN transaction_type = 'BUY' THEN shares ELSE -shares END) as total_shares,
  AVG(CASE WHEN transaction_type = 'BUY' THEN price_per_share END) as avg_cost_basis,
  SUM(CASE WHEN transaction_type = 'BUY' THEN total_amount ELSE -total_amount END) as total_invested
FROM transactions 
WHERE transaction_type IN ('BUY', 'SELL')
GROUP BY symbol, company_name
HAVING SUM(CASE WHEN transaction_type = 'BUY' THEN shares ELSE -shares END) > 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_symbol ON transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
