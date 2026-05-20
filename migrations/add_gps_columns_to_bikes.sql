-- Migration: Add GPS coordinate columns to bikes table
-- Run this in your Supabase SQL Editor

ALTER TABLE bikes ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION;
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS last_lng DOUBLE PRECISION;
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS last_gps_updated_at TIMESTAMPTZ;
