-- Create test database for integration tests
SELECT 'CREATE DATABASE casting_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'casting_test')\gexec
