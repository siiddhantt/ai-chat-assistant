export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  proposedActions?: string[];
}

export interface Conversation {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  message: Message;
  conversationId: string;
  isNewConversation?: boolean;
  proposedActions?: string[];
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }>;
}

export interface LLMGenerateOptions {
  maxTokens?: number;
  temperature?: number;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = "INTERNAL_ERROR"
  ) {
    super(message);
    this.name = "AppError";
  }
}
