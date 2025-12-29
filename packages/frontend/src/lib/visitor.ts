import { browser } from "$app/environment";

const VISITOR_ID_KEY = "visitor_id";

export function getVisitorId(): string {
  if (!browser) return "";

  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

export function getStoredConversationId(slug: string): string | null {
  if (!browser) return null;
  return localStorage.getItem(`conv_${slug}`);
}

export function storeConversationId(
  slug: string,
  conversationId: string
): void {
  if (!browser) return;
  localStorage.setItem(`conv_${slug}`, conversationId);
}

export function clearConversationId(slug: string): void {
  if (!browser) return;
  localStorage.removeItem(`conv_${slug}`);
}
