import { getDb } from "../../config/database.js";
import {
  Conversation,
  ConversationFilters,
  ConversationStatus,
  Message,
} from "../../types/index.js";

export class ConversationRepository {
  async createConversation(data?: {
    tenantId?: string;
    customerId?: string;
    isLead?: boolean;
  }): Promise<Conversation> {
    const db = getDb();
    const result = await db`
      INSERT INTO conversations (tenant_id, customer_id, is_lead, status, metadata, created_at, updated_at)
      VALUES (
        ${data?.tenantId ?? null}, 
        ${data?.customerId ?? null}, 
        ${data?.isLead ?? true},
        'active',
        '{}',
        NOW(), 
        NOW()
      )
      RETURNING 
        id, 
        tenant_id as "tenantId",
        customer_id as "customerId",
        status,
        is_lead as "isLead",
        lead_converted_at as "leadConvertedAt",
        metadata,
        created_at as "createdAt", 
        updated_at as "updatedAt"
    `;
    return this.mapRowToConversation(result[0]);
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const db = getDb();
    const result = await db`
      SELECT 
        id, 
        tenant_id as "tenantId",
        customer_id as "customerId",
        status,
        is_lead as "isLead",
        lead_converted_at as "leadConvertedAt",
        metadata,
        created_at as "createdAt", 
        updated_at as "updatedAt"
      FROM conversations
      WHERE id = ${id}
    `;
    if (!result[0]) return null;
    return this.mapRowToConversation(result[0]);
  }

  async getConversationWithCustomer(id: string): Promise<Conversation | null> {
    const db = getDb();
    const result = await db`
      SELECT 
        c.id, 
        c.tenant_id as "tenantId",
        c.customer_id as "customerId",
        c.status,
        c.is_lead as "isLead",
        c.lead_converted_at as "leadConvertedAt",
        c.metadata,
        c.created_at as "createdAt", 
        c.updated_at as "updatedAt",
        cu.id as "customer_id_col",
        cu.visitor_id as "customer_visitorId",
        cu.email as "customer_email",
        cu.name as "customer_name",
        cu.metadata as "customer_metadata",
        cu.created_at as "customer_createdAt",
        cu.updated_at as "customer_updatedAt"
      FROM conversations c
      LEFT JOIN customers cu ON c.customer_id = cu.id
      WHERE c.id = ${id}
    `;
    if (!result[0]) return null;

    const row = result[0] as Record<string, unknown>;
    const conversation = this.mapRowToConversation(row);

    if (row.customer_id_col) {
      conversation.customer = {
        id: row.customer_id_col as string,
        tenantId: conversation.tenantId || "",
        visitorId: row.customer_visitorId as string,
        email: row.customer_email as string | undefined,
        name: row.customer_name as string | undefined,
        metadata: (row.customer_metadata || {}) as Record<string, unknown>,
        createdAt: new Date(row.customer_createdAt as string).toISOString(),
        updatedAt: new Date(row.customer_updatedAt as string).toISOString(),
      };
    }

    return conversation;
  }

  async findByTenantAndCustomer(
    tenantId: string,
    customerId: string
  ): Promise<Conversation | null> {
    const db = getDb();
    const result = await db`
      SELECT 
        id, 
        tenant_id as "tenantId",
        customer_id as "customerId",
        status,
        is_lead as "isLead",
        lead_converted_at as "leadConvertedAt",
        metadata,
        created_at as "createdAt", 
        updated_at as "updatedAt"
      FROM conversations
      WHERE tenant_id = ${tenantId} 
        AND customer_id = ${customerId}
        AND status = 'active'
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    if (!result[0]) return null;
    return this.mapRowToConversation(result[0]);
  }

  async findByCustomerId(customerId: string): Promise<Conversation[]> {
    const db = getDb();
    const result = await db`
      SELECT 
        id, 
        tenant_id as "tenantId",
        customer_id as "customerId",
        status,
        is_lead as "isLead",
        lead_converted_at as "leadConvertedAt",
        metadata,
        created_at as "createdAt", 
        updated_at as "updatedAt"
      FROM conversations
      WHERE customer_id = ${customerId}
      ORDER BY updated_at DESC
    `;
    return result.map((row: Record<string, unknown>) =>
      this.mapRowToConversation(row)
    );
  }

  async findByVisitorIdAcrossTenants(
    visitorId: string,
    limit = 5
  ): Promise<
    {
      id: string;
      tenantSlug: string;
      tenantName: string;
      updatedAt: string;
    }[]
  > {
    const db = getDb();
    const result = await db`
      SELECT 
        c.id,
        t.slug as "tenantSlug",
        t.name as "tenantName",
        c.updated_at as "updatedAt"
      FROM conversations c
      INNER JOIN customers cu ON c.customer_id = cu.id
      INNER JOIN tenants t ON c.tenant_id = t.id
      WHERE cu.visitor_id = ${visitorId}
        AND c.status = 'active'
      ORDER BY c.updated_at DESC
      LIMIT ${limit}
    `;
    return result.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      tenantSlug: row.tenantSlug as string,
      tenantName: row.tenantName as string,
      updatedAt: new Date(row.updatedAt as string).toISOString(),
    }));
  }

  async deleteConversationByVisitor(
    id: string,
    visitorId: string
  ): Promise<boolean> {
    const db = getDb();
    const result = await db`
      DELETE FROM conversations c
      USING customers cu
      WHERE c.id = ${id}
        AND c.customer_id = cu.id
        AND cu.visitor_id = ${visitorId}
    `;
    return result.count > 0;
  }

  async getConversationWithMessages(id: string): Promise<Conversation | null> {
    const conversation = await this.getConversation(id);
    if (!conversation) return null;

    const db = getDb();
    const messages = await db`
      SELECT 
        id, 
        conversation_id as "conversationId", 
        sender, 
        text, 
        created_at as "createdAt"
      FROM messages
      WHERE conversation_id = ${id}
      ORDER BY created_at ASC
    `;

    return {
      ...conversation,
      messages: messages.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        conversationId: row.conversationId as string,
        role:
          (row.sender as string) === "ai"
            ? ("assistant" as const)
            : ("user" as const),
        content: row.text as string,
        timestamp: new Date(row.createdAt as string).toISOString(),
      })),
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

  async updateConversationStatus(
    id: string,
    status: ConversationStatus
  ): Promise<Conversation | null> {
    const db = getDb();
    const result = await db`
      UPDATE conversations
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING 
        id, 
        tenant_id as "tenantId",
        customer_id as "customerId",
        status,
        is_lead as "isLead",
        lead_converted_at as "leadConvertedAt",
        metadata,
        created_at as "createdAt", 
        updated_at as "updatedAt"
    `;
    if (!result[0]) return null;
    return this.mapRowToConversation(result[0]);
  }

  async convertLead(id: string): Promise<Conversation | null> {
    const db = getDb();
    const result = await db`
      UPDATE conversations
      SET is_lead = false, lead_converted_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
      RETURNING 
        id, 
        tenant_id as "tenantId",
        customer_id as "customerId",
        status,
        is_lead as "isLead",
        lead_converted_at as "leadConvertedAt",
        metadata,
        created_at as "createdAt", 
        updated_at as "updatedAt"
    `;
    if (!result[0]) return null;
    return this.mapRowToConversation(result[0]);
  }

  async getConversationsByTenant(
    tenantId: string,
    filters?: ConversationFilters
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const db = getDb();
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    let conversations: Conversation[];
    let total: number;

    if (filters?.status !== undefined && filters?.isLead !== undefined) {
      const countResult = await db`
        SELECT COUNT(*)::int as count
        FROM conversations
        WHERE tenant_id = ${tenantId}
          AND status = ${filters.status}
          AND is_lead = ${filters.isLead}
      `;
      total = countResult[0].count;

      const rows = await db`
        SELECT 
          c.id, 
          c.tenant_id as "tenantId",
          c.customer_id as "customerId",
          c.status,
          c.is_lead as "isLead",
          c.lead_converted_at as "leadConvertedAt",
          c.metadata,
          c.created_at as "createdAt", 
          c.updated_at as "updatedAt",
          cu.email as "customer_email",
          cu.name as "customer_name",
          cu.visitor_id as "customer_visitorId"
        FROM conversations c
        LEFT JOIN customers cu ON c.customer_id = cu.id
        WHERE c.tenant_id = ${tenantId}
          AND c.status = ${filters.status}
          AND c.is_lead = ${filters.isLead}
        ORDER BY c.updated_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
      conversations = rows.map((row: Record<string, unknown>) =>
        this.mapRowWithCustomerPreview(row)
      );
    } else if (filters?.status !== undefined) {
      const countResult = await db`
        SELECT COUNT(*)::int as count
        FROM conversations
        WHERE tenant_id = ${tenantId}
          AND status = ${filters.status}
      `;
      total = countResult[0].count;

      const rows = await db`
        SELECT 
          c.id, 
          c.tenant_id as "tenantId",
          c.customer_id as "customerId",
          c.status,
          c.is_lead as "isLead",
          c.lead_converted_at as "leadConvertedAt",
          c.metadata,
          c.created_at as "createdAt", 
          c.updated_at as "updatedAt",
          cu.email as "customer_email",
          cu.name as "customer_name",
          cu.visitor_id as "customer_visitorId"
        FROM conversations c
        LEFT JOIN customers cu ON c.customer_id = cu.id
        WHERE c.tenant_id = ${tenantId}
          AND c.status = ${filters.status}
        ORDER BY c.updated_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
      conversations = rows.map((row: Record<string, unknown>) =>
        this.mapRowWithCustomerPreview(row)
      );
    } else if (filters?.isLead !== undefined) {
      const countResult = await db`
        SELECT COUNT(*)::int as count
        FROM conversations
        WHERE tenant_id = ${tenantId}
          AND is_lead = ${filters.isLead}
      `;
      total = countResult[0].count;

      const rows = await db`
        SELECT 
          c.id, 
          c.tenant_id as "tenantId",
          c.customer_id as "customerId",
          c.status,
          c.is_lead as "isLead",
          c.lead_converted_at as "leadConvertedAt",
          c.metadata,
          c.created_at as "createdAt", 
          c.updated_at as "updatedAt",
          cu.email as "customer_email",
          cu.name as "customer_name",
          cu.visitor_id as "customer_visitorId"
        FROM conversations c
        LEFT JOIN customers cu ON c.customer_id = cu.id
        WHERE c.tenant_id = ${tenantId}
          AND c.is_lead = ${filters.isLead}
        ORDER BY c.updated_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
      conversations = rows.map((row: Record<string, unknown>) =>
        this.mapRowWithCustomerPreview(row)
      );
    } else {
      const countResult = await db`
        SELECT COUNT(*)::int as count
        FROM conversations
        WHERE tenant_id = ${tenantId}
      `;
      total = countResult[0].count;

      const rows = await db`
        SELECT 
          c.id, 
          c.tenant_id as "tenantId",
          c.customer_id as "customerId",
          c.status,
          c.is_lead as "isLead",
          c.lead_converted_at as "leadConvertedAt",
          c.metadata,
          c.created_at as "createdAt", 
          c.updated_at as "updatedAt",
          cu.email as "customer_email",
          cu.name as "customer_name",
          cu.visitor_id as "customer_visitorId"
        FROM conversations c
        LEFT JOIN customers cu ON c.customer_id = cu.id
        WHERE c.tenant_id = ${tenantId}
        ORDER BY c.updated_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
      conversations = rows.map((row: Record<string, unknown>) =>
        this.mapRowWithCustomerPreview(row)
      );
    }

    return { conversations, total };
  }

  async getAllConversations(): Promise<Conversation[]> {
    const db = getDb();
    const rows = await db`
      SELECT 
        id, 
        tenant_id as "tenantId",
        customer_id as "customerId",
        status,
        is_lead as "isLead",
        lead_converted_at as "leadConvertedAt",
        metadata,
        created_at as "createdAt", 
        updated_at as "updatedAt"
      FROM conversations
      ORDER BY updated_at DESC
      LIMIT 50
    `;
    return rows.map((row: Record<string, unknown>) =>
      this.mapRowToConversation(row)
    );
  }

  async deleteConversation(id: string): Promise<void> {
    const db = getDb();
    await db`
      DELETE FROM conversations
      WHERE id = ${id}
    `;
  }

  private mapRowToConversation(row: Record<string, unknown>): Conversation {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string | undefined,
      customerId: row.customerId as string | undefined,
      status: (row.status as ConversationStatus) || "active",
      isLead: (row.isLead as boolean) ?? true,
      leadConvertedAt: row.leadConvertedAt
        ? new Date(row.leadConvertedAt as string).toISOString()
        : undefined,
      metadata: (row.metadata || {}) as Record<string, unknown>,
      createdAt: new Date(row.createdAt as string).toISOString(),
      updatedAt: new Date(row.updatedAt as string).toISOString(),
    };
  }

  private mapRowWithCustomerPreview(
    row: Record<string, unknown>
  ): Conversation {
    const conversation = this.mapRowToConversation(row);
    if (row.customerId) {
      conversation.customer = {
        id: row.customerId as string,
        tenantId: conversation.tenantId || "",
        visitorId: row.customer_visitorId as string,
        email: row.customer_email as string | undefined,
        name: row.customer_name as string | undefined,
        metadata: {},
        createdAt: "",
        updatedAt: "",
      };
    }
    return conversation;
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

    const row = result[0] as Record<string, unknown>;
    return {
      id: row.id as string,
      conversationId: row.conversationId as string,
      role: row.sender === "ai" ? "assistant" : "user",
      content: row.text as string,
      timestamp: new Date(row.created_at as string).toISOString(),
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

    return rows.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      conversationId: row.conversationId as string,
      role: row.sender === "ai" ? ("assistant" as const) : ("user" as const),
      content: row.text as string,
      timestamp: new Date(row.created_at as string).toISOString(),
    }));
  }

  async getLastMessage(conversationId: string): Promise<Message | null> {
    const db = getDb();
    const result = await db`
      SELECT id, conversation_id as "conversationId", sender, text, created_at
      FROM messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!result[0]) return null;

    const row = result[0] as Record<string, unknown>;
    return {
      id: row.id as string,
      conversationId: row.conversationId as string,
      role: row.sender === "ai" ? "assistant" : "user",
      content: row.text as string,
      timestamp: new Date(row.created_at as string).toISOString(),
    };
  }
}
