-- Migration: Add password reset support columns to users table
-- This adds reset_token and reset_token_expires columns to support the forgot password feature

ALTER TABLE users
ADD COLUMN reset_token VARCHAR(255) NULL,
ADD COLUMN reset_token_expires DATETIME NULL;
