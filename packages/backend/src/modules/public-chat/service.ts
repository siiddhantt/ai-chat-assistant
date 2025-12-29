import {
  AppError,
  ChatResponse,
  Message,
  PublicChatRequest,
} from "../../types/index.js";
import { RedisService } from "../cache/service.js";
import { LLMService } from "../llm/service.js";
import {
  ConversationRepository,
  MessageRepository,
} from "../persistence/repository.js";
import {
  CustomerRepository,
  TenantRepository,
} from "../persistence/tenant.repository.js";
import { StructuredLLMResponse } from "../tools/index.js";

export class PublicChatService {
  private tenantRepo: TenantRepository;
  private customerRepo: CustomerRepository;
  private conversationRepo: ConversationRepository;
  private messageRepo: MessageRepository;
  private llmService: LLMService;
  private redisService: RedisService;

  constructor() {
    this.tenantRepo = new TenantRepository();
    this.customerRepo = new CustomerRepository();
    this.conversationRepo = new ConversationRepository();
    this.messageRepo = new MessageRepository();
    this.llmService = new LLMService();
    this.redisService = new RedisService();
  }

  private validateMessage(text: string): void {
    if (!text || typeof text !== "string") {
      throw new AppError(400, "Message is required", "INVALID_MESSAGE");
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      throw new AppError(400, "Message cannot be empty", "EMPTY_MESSAGE");
    }

    if (trimmed.length > 5000) {
      throw new AppError(
        400,
        "Message exceeds maximum length of 5000 characters",
        "MESSAGE_TOO_LONG"
      );
    }
  }

  async processMessage(
    slug: string,
    request: PublicChatRequest
  ): Promise<ChatResponse> {
    this.validateMessage(request.message);

    const tenant = await this.tenantRepo.findBySlug(slug);
    if (!tenant) {
      throw new AppError(404, "Business not found", "TENANT_NOT_FOUND");
    }

    const customer = await this.customerRepo.findOrCreate(
      tenant.id,
      request.visitorId
    );

    let conversation;
    let isNewConversation = false;

    if (request.conversationId) {
      conversation = await this.conversationRepo.getConversation(
        request.conversationId
      );
      if (!conversation) {
        throw new AppError(
          404,
          "Conversation not found",
          "CONVERSATION_NOT_FOUND"
        );
      }
      if (
        conversation.tenantId !== tenant.id ||
        conversation.customerId !== customer.id
      ) {
        throw new AppError(403, "Access denied", "FORBIDDEN");
      }
    } else {
      conversation = await this.conversationRepo.findByTenantAndCustomer(
        tenant.id,
        customer.id
      );
      if (!conversation) {
        conversation = await this.conversationRepo.createConversation({
          tenantId: tenant.id,
          customerId: customer.id,
          isLead: true,
        });
        isNewConversation = true;
      }
    }

    const rateLimitKey = `${tenant.id}:${customer.id}`;
    const allowed = await this.redisService.checkRateLimit(
      rateLimitKey,
      10,
      60000
    );
    if (!allowed) {
      throw new AppError(
        429,
        "Too many messages. Please wait a moment before sending another message.",
        "RATE_LIMIT_EXCEEDED"
      );
    }

    await this.messageRepo.createMessage(
      conversation.id,
      "user",
      request.message.trim()
    );

    const conversationMessages = await this.messageRepo.getConversationMessages(
      conversation.id
    );

    let llmResponse: StructuredLLMResponse;
    try {
      llmResponse = await this.llmService.generateReply(
        conversationMessages,
        request.message.trim(),
        { maxTokens: 1000, temperature: 0.7 }
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        500,
        "Failed to generate response from AI",
        "LLM_GENERATION_FAILED"
      );
    }

    const aiMessage = await this.messageRepo.createMessage(
      conversation.id,
      "assistant",
      llmResponse.answer
    );
    await this.conversationRepo.updateConversationTimestamp(conversation.id);

    return {
      message: {
        ...aiMessage,
        proposedActions: llmResponse.proposedActions,
      },
      conversationId: conversation.id,
      isNewConversation,
      proposedActions: llmResponse.proposedActions,
      toolCalls: llmResponse.toolCalls?.map((tc) => ({
        name: tc.name,
        arguments: tc.arguments,
      })),
    };
  }

  async getConversationHistory(
    slug: string,
    conversationId: string,
    customerId: string
  ): Promise<Message[]> {
    const tenant = await this.tenantRepo.findBySlug(slug);
    if (!tenant) {
      throw new AppError(404, "Business not found", "TENANT_NOT_FOUND");
    }

    const customer = await this.customerRepo.findByVisitorId(
      tenant.id,
      customerId
    );
    if (!customer) {
      throw new AppError(404, "Customer not found", "CUSTOMER_NOT_FOUND");
    }

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

    if (
      conversation.tenantId !== tenant.id ||
      conversation.customerId !== customer.id
    ) {
      throw new AppError(403, "Access denied", "FORBIDDEN");
    }

    return this.messageRepo.getConversationMessages(conversationId);
  }

  async getTenantPublicInfo(slug: string): Promise<{
    name: string;
    slug: string;
    welcomeMessage?: string;
    brandColor?: string;
  }> {
    const tenant = await this.tenantRepo.findBySlug(slug);
    if (!tenant) {
      throw new AppError(404, "Business not found", "TENANT_NOT_FOUND");
    }

    return {
      name: tenant.name,
      slug: tenant.slug,
      welcomeMessage: tenant.settings.welcomeMessage,
      brandColor: tenant.settings.brandColor,
    };
  }

  async getVisitorConversations(
    slug: string,
    visitorId: string
  ): Promise<{ id: string; createdAt: string; updatedAt: string }[]> {
    const tenant = await this.tenantRepo.findBySlug(slug);
    if (!tenant) {
      throw new AppError(404, "Business not found", "TENANT_NOT_FOUND");
    }

    const customer = await this.customerRepo.findByVisitorId(
      tenant.id,
      visitorId
    );
    if (!customer) {
      return [];
    }

    const conversations = await this.conversationRepo.findByCustomerId(
      customer.id
    );
    return conversations.map((c) => ({
      id: c.id,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }
}
