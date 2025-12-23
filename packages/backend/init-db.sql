-- Create the chat_user role if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'chat_user') THEN
    CREATE ROLE chat_user WITH LOGIN PASSWORD 'chat_password';
  END IF;
END $$;

-- Grant privileges on the database
GRANT ALL PRIVILEGES ON DATABASE chat_agent TO chat_user;

-- Grant schema permissions  
GRANT ALL PRIVILEGES ON SCHEMA public TO chat_user;

-- Grant default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO chat_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO chat_user;
