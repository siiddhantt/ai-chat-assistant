import {
  AppError,
  ChatRequest,
  ChatResponse,
  Message,
} from "../../types/index.js";
import { LLMService } from "../llm/service.js";
import {
  ConversationRepository,
  MessageRepository,
} from "../persistence/repository.js";

export class ChatService {
  private conversationRepo: ConversationRepository;
  private messageRepo: MessageRepository;
  private llmService: LLMService;

  constructor() {
    this.conversationRepo = new ConversationRepository();
    this.messageRepo = new MessageRepository();
    this.llmService = new LLMService();
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

  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    this.validateMessage(request.message);

    let conversationId = request.sessionId;
    if (!conversationId) {
      const conversation = await this.conversationRepo.createConversation();
      conversationId = conversation.id;
    } else {
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
    }

    await this.messageRepo.createMessage(
      conversationId,
      "user",
      request.message.trim()
    );

    const conversationMessages = await this.messageRepo.getConversationMessages(
      conversationId
    );

    let reply: string;
    try {
      reply = await this.llmService.generateReply(
        conversationMessages,
        request.message.trim(),
        { maxTokens: 500, temperature: 0.7 }
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
      conversationId,
      "assistant",
      reply
    );
    await this.conversationRepo.updateConversationTimestamp(conversationId);

    return {
      message: aiMessage,
      conversationId,
    };
  }

  async getConversationHistory(conversationId: string): Promise<Message[]> {
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

    return this.messageRepo.getConversationMessages(conversationId);
  }

  async getAllConversations() {
    return this.conversationRepo.getAllConversations();
  }

  async deleteConversation(conversationId: string): Promise<void> {
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
    await this.conversationRepo.deleteConversation(conversationId);
  }
}
