-- Migration: Add Repair Cost & Payment tracking to support_tickets table
-- Run this in your Supabase SQL Editor

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS repair_cost INTEGER DEFAULT 0;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
