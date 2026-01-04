-- Admin Activity Logs Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);

-- Sample data (optional, for testing)
-- INSERT INTO admin_logs (admin_id, admin_name, action, details)
-- VALUES ('your-admin-uuid', 'Admin Name', 'user_create', '{"user_name": "Test User"}');
