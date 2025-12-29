import { getDb, closeDb } from "../src/config/database.js";

async function migrate() {
  const db = getDb();

  console.log("Dropping existing tables...");
  await db`DROP TABLE IF EXISTS messages CASCADE`;
  await db`DROP TABLE IF EXISTS conversations CASCADE`;
  await db`DROP TABLE IF EXISTS customers CASCADE`;
  await db`DROP TABLE IF EXISTS tenants CASCADE`;
  await db`DROP TABLE IF EXISTS users CASCADE`;

  console.log("Creating users table...");
  await db`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255),
      phone VARCHAR(50),
      password_hash VARCHAR(255),
      name VARCHAR(255),
      role VARCHAR(50) NOT NULL DEFAULT 'customer',
      auth_provider VARCHAR(50) NOT NULL DEFAULT 'credentials',
      auth_provider_id VARCHAR(255),
      fingerprint_id VARCHAR(255),
      email_verified BOOLEAN DEFAULT FALSE,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  console.log("Creating tenants table...");
  await db`
    CREATE TABLE tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID NOT NULL REFERENCES users(id),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      settings JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  console.log("Creating customers table...");
  await db`
    CREATE TABLE customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      user_id UUID REFERENCES users(id),
      visitor_id VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      name VARCHAR(255),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, visitor_id)
    )
  `;

  console.log("Creating conversations table...");
  await db`
    CREATE TABLE conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      customer_id UUID REFERENCES customers(id),
      status VARCHAR(50) DEFAULT 'active',
      is_lead BOOLEAN DEFAULT FALSE,
      lead_converted_at TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  console.log("Creating messages table...");
  await db`
    CREATE TABLE messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender VARCHAR(50) NOT NULL,
      text TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  console.log("Creating indexes...");
  await db`CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL`;
  await db`CREATE INDEX idx_users_fingerprint ON users(fingerprint_id) WHERE fingerprint_id IS NOT NULL`;
  await db`CREATE INDEX idx_users_auth_provider ON users(auth_provider, auth_provider_id) WHERE auth_provider_id IS NOT NULL`;
  await db`CREATE INDEX idx_tenants_slug ON tenants(slug)`;
  await db`CREATE INDEX idx_tenants_owner ON tenants(owner_id)`;
  await db`CREATE INDEX idx_customers_tenant_visitor ON customers(tenant_id, visitor_id)`;
  await db`CREATE INDEX idx_customers_user ON customers(user_id) WHERE user_id IS NOT NULL`;
  await db`CREATE INDEX idx_conversations_tenant ON conversations(tenant_id)`;
  await db`CREATE INDEX idx_conversations_customer ON conversations(customer_id)`;
  await db`CREATE INDEX idx_conversations_is_lead ON conversations(tenant_id, is_lead) WHERE is_lead = TRUE`;
  await db`CREATE INDEX idx_messages_conversation ON messages(conversation_id)`;
  await db`CREATE INDEX idx_messages_created ON messages(created_at)`;

  console.log("Seeding demo tenant...");
  const [demoOwner] = await db`
    INSERT INTO users (email, name, role, auth_provider)
    VALUES ('demo@techhub.store', 'Demo Owner', 'owner', 'system')
    RETURNING id
  `;

  await db`
    INSERT INTO tenants (owner_id, name, slug, settings)
    VALUES (
      ${demoOwner.id},
      'TechHub Store',
      'demo',
      ${JSON.stringify({
        welcomeMessage: "Welcome to TechHub Store! How can we help you today?",
        businessHours: "Mon-Fri 9am-6pm EST",
      })}
    )
  `;

  console.log("✓ Database initialized successfully");
  await closeDb();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
