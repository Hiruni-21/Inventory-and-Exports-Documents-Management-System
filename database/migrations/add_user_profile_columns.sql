-- Migration: Add profile support columns to users table
-- This adds department and profile_photo columns to support the user profile feature

ALTER TABLE users
ADD COLUMN IF NOT EXISTS department VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(255) NULL;
