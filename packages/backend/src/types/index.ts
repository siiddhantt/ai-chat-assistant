export type UserRole = "owner" | "admin" | "customer";

export interface User {
  id: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  name?: string;
  role: UserRole;
  authProvider: AuthProvider;
  authProviderId?: string;
  fingerprintId?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AuthProvider = "credentials" | "google" | "phone" | "anonymous";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  ownerId: string;
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  brandColor?: string;
  welcomeMessage?: string;
  businessHours?: {
    start: string;
    end: string;
    timezone: string;
  };
  messagesPerDay?: number;
}

export interface Customer {
  id: string;
  tenantId: string;
  visitorId: string;
  userId?: string;
  email?: string;
  name?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ConversationStatus = "active" | "archived" | "resolved";

export interface Conversation {
  id: string;
  tenantId?: string;
  customerId?: string;
  status: ConversationStatus;
  isLead: boolean;
  leadConvertedAt?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  customer?: Customer;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  proposedActions?: string[];
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface PublicChatRequest {
  message: string;
  visitorId: string;
  conversationId?: string;
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

export interface AuthPayload {
  userId: string;
  role: UserRole;
  tenantId?: string;
}

export interface ConversationFilters {
  status?: ConversationStatus;
  isLead?: boolean;
  limit?: number;
  offset?: number;
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
