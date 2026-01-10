-- Supabase PostgreSQL Schema for Pure Price Press
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Monitor Targets Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS monitor_targets (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100),
    category VARCHAR(100),
    interval_minutes INTEGER DEFAULT 5 NOT NULL,
    threshold_percent FLOAT DEFAULT 5.0 NOT NULL,
    direction VARCHAR(20) DEFAULT 'both' NOT NULL,
    conditions_json JSONB,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_price FLOAT,
    last_check_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_monitor_targets_symbol ON monitor_targets(symbol);
CREATE INDEX IF NOT EXISTS idx_monitor_targets_category ON monitor_targets(category);

-- ============================================================================
-- Alert History Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS alert_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    price_before FLOAT NOT NULL,
    price_after FLOAT NOT NULL,
    change_rate FLOAT NOT NULL,
    change_amount FLOAT NOT NULL,
    ai_analysis_text TEXT,
    alert_type VARCHAR(20) DEFAULT 'volatility' NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    notified BOOLEAN DEFAULT FALSE NOT NULL,
    notification_error TEXT,
    volume FLOAT,
    market_cap FLOAT,
    news_headlines TEXT
);

CREATE INDEX IF NOT EXISTS idx_alert_history_symbol ON alert_history(symbol);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at ON alert_history(triggered_at);

-- ============================================================================
-- System Config Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);

-- ============================================================================
-- Push Subscriptions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- ============================================================================
-- Raw News Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS raw_news (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    url VARCHAR(2000) UNIQUE NOT NULL,
    source VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    summary TEXT,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    batch_id VARCHAR(36) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_raw_news_source ON raw_news(source);
CREATE INDEX IF NOT EXISTS idx_raw_news_region ON raw_news(region);
CREATE INDEX IF NOT EXISTS idx_raw_news_category ON raw_news(category);
CREATE INDEX IF NOT EXISTS idx_raw_news_published_at ON raw_news(published_at);
CREATE INDEX IF NOT EXISTS idx_raw_news_batch_id ON raw_news(batch_id);

-- ============================================================================
-- Merged News Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS merged_news (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    url VARCHAR(2000) NOT NULL,
    source VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    summary TEXT,
    related_sources JSONB,
    source_count INTEGER DEFAULT 1 NOT NULL,
    importance_boost FLOAT DEFAULT 1.0 NOT NULL,
    embedding_vector JSONB,
    batch_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_merged_news_source ON merged_news(source);
CREATE INDEX IF NOT EXISTS idx_merged_news_region ON merged_news(region);
CREATE INDEX IF NOT EXISTS idx_merged_news_category ON merged_news(category);
CREATE INDEX IF NOT EXISTS idx_merged_news_published_at ON merged_news(published_at);
CREATE INDEX IF NOT EXISTS idx_merged_news_batch_id ON merged_news(batch_id);

-- ============================================================================
-- Daily Digest Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_digest (
    id SERIAL PRIMARY KEY,
    digest_date TIMESTAMP WITH TIME ZONE UNIQUE NOT NULL,
    total_raw_news INTEGER DEFAULT 0 NOT NULL,
    total_merged_news INTEGER DEFAULT 0 NOT NULL,
    total_curated_news INTEGER DEFAULT 0 NOT NULL,
    processing_time_seconds FLOAT,
    llm_cost_estimate FLOAT,
    regional_distribution JSONB,
    category_distribution JSONB,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_digest_date ON daily_digest(digest_date);
CREATE INDEX IF NOT EXISTS idx_daily_digest_status ON daily_digest(status);

-- ============================================================================
-- Curated News Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS curated_news (
    id SERIAL PRIMARY KEY,
    merged_news_id VARCHAR(36) NOT NULL,
    digest_date TIMESTAMP WITH TIME ZONE NOT NULL,
    title VARCHAR(500) NOT NULL,
    url VARCHAR(2000) NOT NULL,
    source VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    published_at TIMESTAMP WITH TIME ZONE,
    source_count INTEGER DEFAULT 1 NOT NULL,
    related_sources JSONB,
    importance_score FLOAT NOT NULL,
    relevance_reason TEXT NOT NULL,
    ai_summary TEXT,
    affected_symbols JSONB,
    symbol_impacts JSONB,
    predicted_impact TEXT,
    impact_direction VARCHAR(20),
    supply_chain_impact TEXT,
    competitor_impact TEXT,
    verification_passed BOOLEAN DEFAULT TRUE NOT NULL,
    verification_details JSONB,
    analysis_stage_1 JSONB,
    analysis_stage_2 JSONB,
    analysis_stage_3 JSONB,
    analysis_stage_4 JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_curated_news_merged_id ON curated_news(merged_news_id);
CREATE INDEX IF NOT EXISTS idx_curated_news_digest_date ON curated_news(digest_date);
CREATE INDEX IF NOT EXISTS idx_curated_news_published_at ON curated_news(published_at);
CREATE INDEX IF NOT EXISTS idx_curated_news_importance ON curated_news(importance_score);

-- ============================================================================
-- Verification Log Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS verification_log (
    id SERIAL PRIMARY KEY,
    curated_news_id INTEGER NOT NULL,
    predicted_symbols JSONB,
    predicted_direction VARCHAR(20),
    actual_symbols_moved JSONB,
    actual_direction VARCHAR(20),
    prediction_accuracy FLOAT,
    verification_notes TEXT,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_log_news_id ON verification_log(curated_news_id);

-- ============================================================================
-- Auto-update updated_at trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_monitor_targets_updated_at
    BEFORE UPDATE ON monitor_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS) - Optional, for public access
-- ============================================================================
-- Enable if you want to allow public read access
-- ALTER TABLE monitor_targets ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public read" ON monitor_targets FOR SELECT USING (true);
