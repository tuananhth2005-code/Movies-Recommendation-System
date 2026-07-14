-- ============================================================================
-- Migration 001: Role-Based Access Control + Review System
-- ----------------------------------------------------------------------------
-- Adds:
--   * users.role            → 'user' (default) | 'admin'
--   * ratings.review_text   → optional review body
--   * ratings.updated_at    → last-edited timestamp
--
-- Safe to run multiple times (IF NOT EXISTS guards).
-- Run on PostgreSQL:  psql -U postgres -d movie_recommendation_db -f 001_add_role_and_reviews.sql
-- ============================================================================

-- 1) Role column on users -----------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

-- 2) Review fields on ratings -------------------------------------------------
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS review_text TEXT;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- 3) Promote the first admin (CHANGE the email to a real account) -------------
-- UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
