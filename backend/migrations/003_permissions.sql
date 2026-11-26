BEGIN;

-- 1. Available permissions
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Assign permissions to roles
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,

    PRIMARY KEY (role_id, permission_id),

    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id)
        REFERENCES permissions(id)
        ON DELETE CASCADE
);

-- 3. Seed permissions
INSERT INTO permissions (permission_key, description)
VALUES
    ('users.create', 'Create organization users'),
    ('users.read', 'View organization users'),
    ('users.update', 'Update organization users'),
    ('users.delete', 'Delete organization users'),

    ('reports.read', 'View organization reports'),

    ('jobs.create', 'Create service jobs'),
    ('jobs.read', 'View service jobs'),
    ('jobs.assign', 'Assign jobs to technicians'),
    ('jobs.update_status', 'Update job status'),

    ('organization.update', 'Update organization settings')
ON CONFLICT (permission_key) DO NOTHING;

-- 4. Owner: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_key = 'owner'
ON CONFLICT DO NOTHING;

-- 5. Admin: manage users, jobs and reports
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_key = 'admin'
AND p.permission_key IN (
    'users.create',
    'users.read',
    'users.update',
    'users.delete',
    'reports.read',
    'jobs.create',
    'jobs.read',
    'jobs.assign',
    'jobs.update_status',
    'organization.update'
)
ON CONFLICT DO NOTHING;

-- 6. Manager: reports and job management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_key = 'manager'
AND p.permission_key IN (
    'users.read',
    'reports.read',
    'jobs.create',
    'jobs.read',
    'jobs.assign',
    'jobs.update_status'
)
ON CONFLICT DO NOTHING;

-- 7. Dispatcher: manage job assignments
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_key = 'dispatcher'
AND p.permission_key IN (
    'jobs.read',
    'jobs.assign'
)
ON CONFLICT DO NOTHING;

-- 8. Technician: view jobs and update their status
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_key = 'technician'
AND p.permission_key IN (
    'jobs.read',
    'jobs.update_status'
)
ON CONFLICT DO NOTHING;

COMMIT;