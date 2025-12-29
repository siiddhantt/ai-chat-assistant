import { browser } from "$app/environment";
import type {
  AuthResponse,
  ChatResponse,
  Conversation,
  DashboardStats,
  Message,
  TenantInfo,
} from "../types";

const API_BASE = browser
  ? (import.meta.env.VITE_API_URL || "http://localhost:3000") + "/api"
  : "";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  if (!browser) return null;
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.code || "ERROR",
      data.error || "Request failed"
    );
  }

  return data as T;
}

export const auth = {
  ownerRegister: (data: {
    email: string;
    password: string;
    name: string;
    businessName: string;
    businessSlug: string;
  }) =>
    request<AuthResponse>("/auth/owner/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  ownerLogin: (email: string, password: string) =>
    request<AuthResponse>("/auth/owner/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  customerRegister: (data: {
    email: string;
    password: string;
    name: string;
    visitorId: string;
  }) =>
    request<AuthResponse>("/auth/customer/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  customerLogin: (email: string, password: string) =>
    request<AuthResponse>("/auth/customer/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () =>
    request<{ user: AuthResponse["user"]; tenant?: AuthResponse["tenant"] }>(
      "/auth/me"
    ),
};

export const owner = {
  getLeads: (limit = 50, offset = 0) =>
    request<{ conversations: Conversation[]; total: number }>(
      `/owner/leads?limit=${limit}&offset=${offset}`
    ),

  getConversations: (limit = 50, offset = 0) =>
    request<{ conversations: Conversation[]; total: number }>(
      `/owner/conversations?limit=${limit}&offset=${offset}`
    ),

  getConversation: (id: string) =>
    request<{ conversation: Conversation; messages: Message[] }>(
      `/owner/conversations/${id}`
    ),

  updateStatus: (id: string, status: Conversation["status"]) =>
    request<Conversation>(`/owner/conversations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  convertLead: (id: string) =>
    request<Conversation>(`/owner/conversations/${id}/convert`, {
      method: "POST",
    }),

  getStats: () => request<DashboardStats>("/owner/dashboard/stats"),
};

export const publicChat = {
  getInfo: (slug: string) => request<TenantInfo>(`/chat/${slug}/info`),

  sendMessage: (
    slug: string,
    message: string,
    visitorId: string,
    conversationId?: string
  ) =>
    request<ChatResponse>(`/chat/${slug}/message`, {
      method: "POST",
      body: JSON.stringify({ message, visitorId, conversationId }),
    }),

  getConversation: (slug: string, conversationId: string, visitorId: string) =>
    request<{ messages: Message[] }>(
      `/chat/${slug}/conversations/${conversationId}?visitorId=${visitorId}`
    ),

  getConversations: (slug: string, visitorId: string) =>
    request<{
      conversations: { id: string; createdAt: string; updatedAt: string }[];
    }>(`/chat/${slug}/conversations?visitorId=${visitorId}`),
};

export interface RecentConversation {
  id: string;
  tenantSlug: string;
  tenantName: string;
  updatedAt: string;
}

export const visitor = {
  getRecentConversations: (visitorId: string, limit = 5) =>
    request<{ conversations: RecentConversation[] }>(
      `/visitor/conversations?visitorId=${visitorId}&limit=${limit}`
    ),

  deleteConversation: (conversationId: string, visitorId: string) =>
    request<{ success: boolean }>(
      `/visitor/conversations/${conversationId}?visitorId=${visitorId}`,
      { method: "DELETE" }
    ),
};
