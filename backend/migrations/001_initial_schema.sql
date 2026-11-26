
BEGIN;
-- practice table 

CREATE TABLE Products  (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    price INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    image VARCHAR(255) NOT NULL,
    category FOREIGN KEY REFERENCES Categories(id) VARCHAR(255) NOT NULL,
    brand FOREIGN KEY REFERENCES Brands(id) VARCHAR(255) NOT NULL,
    stock INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- 1. Companies
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. User accounts
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX users_email_unique_idx
ON users (LOWER(email));

-- 3. Organization branches
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_branches_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_branch_id_organization
        UNIQUE (id, organization_id),

    CONSTRAINT uq_branch_name_per_organization
        UNIQUE (organization_id, name)
);

-- 4. System roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    role_key VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- 5. Organization memberships
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    branch_id UUID,

    status VARCHAR(20) NOT NULL DEFAULT 'active',

    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_members_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_members_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_members_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id),

    CONSTRAINT fk_members_branch
        FOREIGN KEY (branch_id, organization_id)
        REFERENCES branches(id, organization_id),

    CONSTRAINT uq_user_per_organization
        UNIQUE (organization_id, user_id),

    CONSTRAINT chk_member_status
        CHECK (status IN ('active', 'inactive', 'pending'))
);

-- Initial system roles
INSERT INTO roles (name, role_key, description)
VALUES
    ('Owner', 'owner', 'Organization owner'),
    ('Admin', 'admin', 'Organization administrator'),
    ('Manager', 'manager', 'Operations manager'),
    ('Dispatcher', 'dispatcher', 'Manages job assignments'),
    ('Technician', 'technician', 'Performs field service jobs');

-- Useful indexes
CREATE INDEX branches_organization_id_idx
ON branches (organization_id);

CREATE INDEX members_user_id_idx
ON organization_members (user_id);

CREATE INDEX members_organization_id_idx
ON organization_members (organization_id);

CREATE INDEX members_role_id_idx
ON organization_members (role_id);

COMMIT;
