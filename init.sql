
-- Initialize the QualityBytes database
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The application will handle table creation through Drizzle migrations
-- This file is mainly for any initial setup or seed data

-- You can add any initial seed data here if needed
-- For example:
-- INSERT INTO users (username, email, password) VALUES ('admin', 'admin@example.com', 'hashed_password');
