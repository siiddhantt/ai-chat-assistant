import { getDb } from "../../config/database.js";
import {
  AppError,
  Conversation,
  ConversationFilters,
  ConversationStatus,
  Message,
} from "../../types/index.js";
import {
  ConversationRepository,
  MessageRepository,
} from "../persistence/repository.js";

interface DashboardStats {
  totalConversations: number;
  activeLeads: number;
  convertedLeads: number;
  resolvedConversations: number;
  recentActivity: Array<{
    conversationId: string;
    customerName?: string;
    lastMessage: string;
    timestamp: string;
  }>;
}

export class OwnerService {
  private conversationRepo: ConversationRepository;
  private messageRepo: MessageRepository;

  constructor() {
    this.conversationRepo = new ConversationRepository();
    this.messageRepo = new MessageRepository();
  }

  async getConversations(
    tenantId: string,
    filters?: ConversationFilters
  ): Promise<{ conversations: Conversation[]; total: number }> {
    return this.conversationRepo.getConversationsByTenant(tenantId, filters);
  }

  async getConversationDetails(
    tenantId: string,
    conversationId: string
  ): Promise<{ conversation: Conversation; messages: Message[] }> {
    const conversation =
      await this.conversationRepo.getConversationWithCustomer(conversationId);

    if (!conversation) {
      throw new AppError(
        404,
        "Conversation not found",
        "CONVERSATION_NOT_FOUND"
      );
    }

    if (conversation.tenantId !== tenantId) {
      throw new AppError(403, "Access denied", "FORBIDDEN");
    }

    const messages = await this.messageRepo.getConversationMessages(
      conversationId
    );

    return { conversation, messages };
  }

  async updateConversationStatus(
    tenantId: string,
    conversationId: string,
    status: ConversationStatus
  ): Promise<Conversation> {
    const conversation = await this.conversationRepo.getConversation(
      conversationId
    );

    if (!conversation) {
      throw new AppError(
        404,
        "Conversation not found",
        "CONVERSATION_NOT_FOUND"
      );
    }

    if (conversation.tenantId !== tenantId) {
      throw new AppError(403, "Access denied", "FORBIDDEN");
    }

    const updated = await this.conversationRepo.updateConversationStatus(
      conversationId,
      status
    );
    if (!updated) {
      throw new AppError(500, "Failed to update conversation", "UPDATE_FAILED");
    }

    return updated;
  }

  async convertLead(
    tenantId: string,
    conversationId: string
  ): Promise<Conversation> {
    const conversation = await this.conversationRepo.getConversation(
      conversationId
    );

    if (!conversation) {
      throw new AppError(
        404,
        "Conversation not found",
        "CONVERSATION_NOT_FOUND"
      );
    }

    if (conversation.tenantId !== tenantId) {
      throw new AppError(403, "Access denied", "FORBIDDEN");
    }

    if (!conversation.isLead) {
      throw new AppError(400, "Conversation is not a lead", "NOT_A_LEAD");
    }

    const updated = await this.conversationRepo.convertLead(conversationId);
    if (!updated) {
      throw new AppError(500, "Failed to convert lead", "CONVERSION_FAILED");
    }

    return updated;
  }

  async getDashboardStats(tenantId: string): Promise<DashboardStats> {
    const db = getDb();

    const statsResult = await db`
      SELECT
        COUNT(*)::int as "totalConversations",
        COUNT(*) FILTER (WHERE is_lead = true AND status = 'active')::int as "activeLeads",
        COUNT(*) FILTER (WHERE is_lead = false AND lead_converted_at IS NOT NULL)::int as "convertedLeads",
        COUNT(*) FILTER (WHERE status = 'resolved')::int as "resolvedConversations"
      FROM conversations
      WHERE tenant_id = ${tenantId}
    `;

    const stats = statsResult[0] as {
      totalConversations: number;
      activeLeads: number;
      convertedLeads: number;
      resolvedConversations: number;
    };

    const recentActivityResult = await db`
      SELECT 
        c.id as "conversationId",
        cu.name as "customerName",
        m.text as "lastMessage",
        m.created_at as "timestamp"
      FROM conversations c
      LEFT JOIN customers cu ON c.customer_id = cu.id
      LEFT JOIN LATERAL (
        SELECT text, created_at
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) m ON true
      WHERE c.tenant_id = ${tenantId}
      ORDER BY COALESCE(m.created_at, c.updated_at) DESC
      LIMIT 10
    `;

    const recentActivity = recentActivityResult.map(
      (row: Record<string, unknown>) => ({
        conversationId: row.conversationId as string,
        customerName: row.customerName as string | undefined,
        lastMessage: (row.lastMessage as string) || "",
        timestamp: row.timestamp
          ? new Date(row.timestamp as string).toISOString()
          : new Date().toISOString(),
      })
    );

    return {
      ...stats,
      recentActivity,
    };
  }
}
