-- Add AI BYOK columns to users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "ai_provider" text,
  ADD COLUMN IF NOT EXISTS "ai_api_key_encrypted" text;
