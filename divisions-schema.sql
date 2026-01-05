-- Division Management Schema
-- Run this in Supabase SQL Editor

-- Create divisions table
CREATE TABLE IF NOT EXISTS divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add division_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_division ON users(division_id);

-- Sample divisions (optional)
-- INSERT INTO divisions (name, description) VALUES
-- ('IT', 'Information Technology'),
-- ('Marketing', 'Marketing & Communications'),
-- ('Finance', 'Finance & Accounting'),
-- ('HR', 'Human Resources');
