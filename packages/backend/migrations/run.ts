import { closeDb, getDb } from "../src/config/database.js";

async function runMigrations(): Promise<void> {
  const db = getDb();

  try {
    await db`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'ai')),
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await db`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`;
    await db`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`;
    await db`CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at)`;

    console.log("✓ Database migrations completed successfully");
  } catch (error) {
    console.error("✗ Migration failed:", error);
    throw error;
  } finally {
    await closeDb();
  }
}

runMigrations().catch((error) => {
  console.error("Fatal migration error:", error);
  process.exit(1);
});
