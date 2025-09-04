-- Secure Asset Portal Database Schema
-- PostgreSQL version

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    two_factor_secret VARCHAR(255),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'advisor', 'admin')),
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Asset categories lookup table
CREATE TABLE asset_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default asset categories
INSERT INTO asset_categories (name, description, icon) VALUES
    ('real_estate', 'Properties, land, commercial real estate', 'home'),
    ('investment_account', '401k, IRA, brokerage accounts', 'trending-up'),
    ('bank_account', 'Checking, savings, CDs, money market', 'credit-card'),
    ('cryptocurrency', 'Digital assets and wallets', 'bitcoin'),
    ('physical_asset', 'Precious metals, collectibles, vehicles', 'package'),
    ('business_interest', 'Partnerships, private equity, business ownership', 'briefcase'),
    ('insurance', 'Life insurance policies with cash value', 'shield');

-- Assets table
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES asset_categories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    current_value DECIMAL(15, 2) NOT NULL CHECK (current_value >= 0),
    purchase_value DECIMAL(15, 2),
    purchase_date DATE,
    currency VARCHAR(3) DEFAULT 'USD',
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Asset value history for tracking changes
CREATE TABLE asset_value_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    value DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Advisor-client relationships
CREATE TABLE advisor_client_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advisor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
    permissions JSONB DEFAULT '{"view_assets": true, "view_reports": true}',
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    UNIQUE(advisor_id, client_id)
);

-- Audit log for security and compliance
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Session management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_assets_user_id ON assets(user_id);
CREATE INDEX idx_assets_category_id ON assets(category_id);
CREATE INDEX idx_asset_value_history_asset_id ON asset_value_history(asset_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_value_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_client_relationships ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own assets
CREATE POLICY assets_user_policy ON assets
    USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- Policy: Users can only see value history for their own assets
CREATE POLICY asset_history_user_policy ON asset_value_history
    USING (asset_id IN (
        SELECT id FROM assets 
        WHERE user_id = current_setting('app.current_user_id', true)::uuid
    ));

-- Views for common queries
CREATE VIEW user_asset_summary AS
SELECT 
    u.id as user_id,
    u.email,
    COUNT(a.id) as total_assets,
    COALESCE(SUM(a.current_value), 0) as total_value,
    COUNT(DISTINCT a.category_id) as categories_used,
    MAX(a.updated_at) as last_asset_update
FROM users u
LEFT JOIN assets a ON u.id = a.user_id AND a.is_active = true
GROUP BY u.id, u.email;

CREATE VIEW asset_category_summary AS
SELECT 
    u.id as user_id,
    ac.name as category,
    ac.description,
    COUNT(a.id) as asset_count,
    COALESCE(SUM(a.current_value), 0) as category_value
FROM users u
CROSS JOIN asset_categories ac
LEFT JOIN assets a ON u.id = a.user_id 
    AND ac.id = a.category_id 
    AND a.is_active = true
GROUP BY u.id, ac.id, ac.name, ac.description
ORDER BY u.id, category_value DESC;

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with security features';
COMMENT ON TABLE assets IS 'User financial assets with tracking';
COMMENT ON TABLE audit_logs IS 'Security and compliance audit trail';
COMMENT ON TABLE advisor_client_relationships IS 'Advisor access to client portfolios';
