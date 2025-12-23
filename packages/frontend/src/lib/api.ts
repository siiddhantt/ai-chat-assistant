const API_BASE = "http://localhost:3000/api";

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  message: Message;
  conversationId: string;
}

export interface ConversationHistory {
  messages: Message[];
}

export interface Conversation {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
}

export class APIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new APIError(
      response.status,
      response.statusText,
      error.error || `HTTP ${response.status}: ${response.statusText}`
    );
  }
  return response.json();
}

export async function sendMessage(
  conversationId: string | null,
  message: string
): Promise<ChatResponse> {
  if (!message || !message.trim()) {
    throw new Error("Message cannot be empty");
  }

  const body: { message: string; sessionId?: string } = {
    message: message.trim(),
  };
  if (conversationId) {
    body.sessionId = conversationId;
  }

  const response = await fetch(`${API_BASE}/chat/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return handleResponse<ChatResponse>(response);
}

export async function getConversationHistory(
  conversationId: string
): Promise<ConversationHistory> {
  if (!conversationId) {
    throw new Error("Conversation ID is required");
  }

  const response = await fetch(`${API_BASE}/chat/history/${conversationId}`);
  return handleResponse<ConversationHistory>(response);
}

export async function getConversations(): Promise<ConversationsResponse> {
  const response = await fetch(`${API_BASE}/chat/conversations`);
  return handleResponse<ConversationsResponse>(response);
}

export async function deleteConversation(
  conversationId: string
): Promise<{ success: boolean }> {
  if (!conversationId) {
    throw new Error("Conversation ID is required");
  }

  const response = await fetch(
    `${API_BASE}/chat/conversations/${conversationId}`,
    {
      method: "DELETE",
    }
  );
  return handleResponse<{ success: boolean }>(response);
}
