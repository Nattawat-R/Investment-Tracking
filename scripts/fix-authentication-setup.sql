-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    preferred_currency TEXT DEFAULT 'USD' CHECK (preferred_currency IN ('USD', 'THB')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add user_id column to transactions if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'user_id') THEN
        ALTER TABLE transactions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable RLS on both tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for transactions (only after user_id column exists)
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
    FOR DELETE USING (auth.uid() = user_id);

-- Create or replace the trigger function for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't prevent user creation
        RAISE WARNING 'Failed to create user profile for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update the portfolio_holdings view to include user_id
DROP VIEW IF EXISTS portfolio_holdings;
CREATE VIEW portfolio_holdings AS
SELECT 
    t.user_id,
    t.symbol,
    t.company_name,
    SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.shares
             WHEN t.transaction_type = 'SELL' THEN -t.shares
             ELSE 0 END) as total_shares,
    CASE 
        WHEN SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.shares
                      WHEN t.transaction_type = 'SELL' THEN -t.shares
                      ELSE 0 END) > 0
        THEN SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.total_amount
                      WHEN t.transaction_type = 'SELL' THEN -t.total_amount
                      ELSE 0 END) / SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.shares
                                             WHEN t.transaction_type = 'SELL' THEN -t.shares
                                             ELSE 0 END)
        ELSE 0 
    END as avg_cost_basis,
    SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.total_amount
             WHEN t.transaction_type = 'SELL' THEN -t.total_amount
             ELSE 0 END) as total_invested
FROM transactions t
WHERE t.user_id IS NOT NULL
GROUP BY t.user_id, t.symbol, t.company_name
HAVING SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.shares
                WHEN t.transaction_type = 'SELL' THEN -t.shares
                ELSE 0 END) > 0;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON transactions TO authenticated;
GRANT SELECT ON portfolio_holdings TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_symbol ON transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
