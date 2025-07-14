-- Update Supabase Auth settings for OTP verification
-- Run this in your Supabase SQL Editor

-- Enable email confirmations
UPDATE auth.config 
SET 
  enable_signup = true,
  enable_confirmations = true,
  email_confirm_change_enabled = true,
  email_double_confirm_change_enabled = false
WHERE id = 1;

-- Set OTP expiry to 10 minutes (600 seconds)
UPDATE auth.config 
SET otp_exp = 600
WHERE id = 1;

-- Ensure email templates are properly configured
-- You may need to customize these in your Supabase dashboard under Authentication > Email Templates

-- Optional: Add a function to clean up expired OTP codes
CREATE OR REPLACE FUNCTION auth.cleanup_expired_otp()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth.otp 
  WHERE created_at < NOW() - INTERVAL '10 minutes';
END;
$$;

-- Create a scheduled job to clean up expired OTP codes (optional)
-- This requires the pg_cron extension to be enabled
-- SELECT cron.schedule('cleanup-expired-otp', '*/5 * * * *', 'SELECT auth.cleanup_expired_otp();');
