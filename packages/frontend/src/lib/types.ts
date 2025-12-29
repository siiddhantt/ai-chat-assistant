export type UserRole = "owner" | "admin" | "customer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  tenant?: Tenant;
}

export interface Customer {
  id: string;
  visitorId: string;
  email?: string;
  name?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  tenantId: string;
  customerId: string;
  status: "active" | "archived" | "resolved";
  isLead: boolean;
  leadConvertedAt?: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
}

export interface DashboardStats {
  totalConversations: number;
  activeLeads: number;
  convertedLeads: number;
  resolvedConversations: number;
  recentActivity: {
    conversationId: string;
    customerName?: string;
    lastMessage: string;
    timestamp: string;
  }[];
}

export interface ChatResponse {
  message: Message;
  conversationId: string;
  isNewConversation: boolean;
  proposedActions?: string[];
}

export interface TenantInfo {
  name: string;
  slug: string;
}
