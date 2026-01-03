-- ============================================
-- Absensi App Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_first_login BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Attendance Table
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('checkin', 'checkout')),
  photo_url TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON attendance(created_at);
CREATE INDEX IF NOT EXISTS idx_attendance_user_type_date ON attendance(user_id, type, created_at);

-- ============================================
-- Leaves Table (Izin/Cuti)
-- ============================================
CREATE TABLE IF NOT EXISTS leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('izin', 'sakit', 'cuti', 'dinas')),
  reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_leaves_user_date ON leaves(user_id, date);
CREATE INDEX IF NOT EXISTS idx_leaves_date ON leaves(date);

-- ============================================
-- Config Table
-- ============================================
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default office location (Jakarta)
INSERT INTO config (key, value) VALUES 
('office_location', '{"latitude": -6.2088, "longitude": 106.8456, "radius_meters": 300, "name": "Kantor Pusat"}')
ON CONFLICT (key) DO NOTHING;

-- Insert default work hours
INSERT INTO config (key, value) VALUES 
('work_hours', '{"start_time": "08:00", "end_time": "17:00", "late_threshold": "09:00"}')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- Create Default Admin User
-- Email: admin@company.com
-- Password: admin123
-- ============================================
INSERT INTO users (name, email, password_hash, role, is_first_login, status) VALUES 
('Admin', 'admin@company.com', '$2b$10$cZe2oy69N6FgHYGIYrRZuOZ7UduaApQUUQ1wp/meJ9fj/0gJG3bdO', 'admin', true, 'active')
ON CONFLICT (email) DO NOTHING;
