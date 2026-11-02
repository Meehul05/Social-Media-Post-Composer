-- ============================================================================
-- V2__seed_data.sql
-- Initial Roles and Default Admin Account for Post Composer Studio
-- Default Admin Password: AdminPassword123! (BCrypt hashed)
-- ============================================================================

INSERT IGNORE INTO roles (id, name) VALUES
(1, 'ROLE_USER'),
(2, 'ROLE_ADMIN');

INSERT IGNORE INTO users (id, email, password_hash, display_name, timezone, active)
VALUES (
    1,
    'admin@example.com',
    '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a',
    'Admin',
    'UTC',
    TRUE
);

INSERT IGNORE INTO user_roles (user_id, role_id) VALUES
(1, 1),
(1, 2);
