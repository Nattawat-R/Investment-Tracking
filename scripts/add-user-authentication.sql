-- Enable Row Level Security (RLS) for user data isolation
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Add user_id column to transactions table
ALTER TABLE transactions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance with user queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_symbol ON transactions(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date DESC);

-- Update the portfolio_holdings view to be user-specific
DROP VIEW IF EXISTS portfolio_holdings;

CREATE OR REPLACE VIEW portfolio_holdings AS
SELECT 
  user_id,
  symbol,
  company_name,
  SUM(CASE 
    WHEN transaction_type = 'BUY' THEN shares 
    WHEN transaction_type = 'SELL' THEN -shares 
    ELSE 0 
  END) as total_shares,
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
GROUP BY user_id, symbol, company_name
HAVING SUM(CASE 
  WHEN transaction_type = 'BUY' THEN shares 
  WHEN transaction_type = 'SELL' THEN -shares 
  ELSE 0 
END) > 0.0001;

-- Create Row Level Security policies
CREATE POLICY "Users can only see their own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Create user profiles table for additional user data
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  preferred_currency TEXT DEFAULT 'USD' CHECK (preferred_currency IN ('USD', 'THB')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
