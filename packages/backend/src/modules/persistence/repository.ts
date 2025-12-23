import { getDb } from "../../config/database.js";
import { Conversation, Message } from "../../types/index.js";

export class ConversationRepository {
  async createConversation(): Promise<Conversation> {
    const db = getDb();
    const result = await db<Conversation[]>`
      INSERT INTO conversations (created_at, updated_at)
      VALUES (NOW(), NOW())
      RETURNING id, created_at, updated_at
    `;

    return result[0];
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const db = getDb();
    const result = await db<Conversation[]>`
      SELECT id, created_at, updated_at
      FROM conversations
      WHERE id = ${id}
    `;

    return result[0] || null;
  }

  async getConversationWithMessages(id: string): Promise<Conversation | null> {
    const db = getDb();
    const conversation = await this.getConversation(id);

    if (!conversation) {
      return null;
    }

    const messages = await db<Message[]>`
      SELECT id, conversation_id as "conversationId", sender, text, created_at as "createdAt"
      FROM messages
      WHERE conversation_id = ${id}
      ORDER BY created_at ASC
    `;

    return {
      ...conversation,
      messages,
    };
  }

  async updateConversationTimestamp(id: string): Promise<void> {
    const db = getDb();
    await db`
      UPDATE conversations
      SET updated_at = NOW()
      WHERE id = ${id}
    `;
  }

  async getAllConversations(): Promise<Conversation[]> {
    const db = getDb();
    const rows = await db`
      SELECT id, created_at, updated_at
      FROM conversations
      ORDER BY updated_at DESC
      LIMIT 50
    `;
    return rows.map((row: any) => ({
      id: row.id,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
  }

  async deleteConversation(id: string): Promise<void> {
    const db = getDb();
    await db`
      DELETE FROM conversations
      WHERE id = ${id}
    `;
  }
}

export class MessageRepository {
  async createMessage(
    conversationId: string,
    role: "user" | "assistant",
    content: string
  ): Promise<Message> {
    const db = getDb();
    const dbRole = role === "assistant" ? "ai" : "user";
    const result = await db`
      INSERT INTO messages (conversation_id, sender, text, created_at)
      VALUES (${conversationId}, ${dbRole}, ${content}, NOW())
      RETURNING id, conversation_id as "conversationId", sender, text, created_at
    `;

    const row = result[0] as any;
    return {
      id: row.id,
      conversationId: row.conversationId,
      role: row.sender === "ai" ? "assistant" : "user",
      content: row.text,
      timestamp: new Date(row.created_at).toISOString(),
    };
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    const db = getDb();
    const rows = await db`
      SELECT id, conversation_id as "conversationId", sender, text, created_at
      FROM messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at ASC
    `;

    return rows.map((row: any) => ({
      id: row.id,
      conversationId: row.conversationId,
      role: row.sender === "ai" ? ("assistant" as const) : ("user" as const),
      content: row.text,
      timestamp: new Date(row.created_at).toISOString(),
    }));
  }
}
