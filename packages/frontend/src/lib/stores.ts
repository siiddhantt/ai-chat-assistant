import { writable } from "svelte/store";
import type { Message } from "./types";

export interface ChatState {
  tenantSlug: string | null;
  conversationId: string | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  lastAssistantId?: string | null;
}

export const conversationListRefresh = writable<number>(Date.now());

function createChatStore() {
  const initialState: ChatState = {
    tenantSlug: null,
    conversationId: null,
    messages: [],
    loading: false,
    error: null,
  };

  const { subscribe, set, update } = writable<ChatState>(initialState);

  return {
    subscribe,
    setTenant(slug: string) {
      update((state) => ({ ...state, tenantSlug: slug }));
    },
    addMessage(message: Message) {
      update((state) => ({
        ...state,
        messages: [...state.messages, message],
        conversationId: state.conversationId || message.conversationId,
        lastAssistantId:
          message.role === "assistant"
            ? message.id
            : state.lastAssistantId ?? null,
      }));
    },
    setLoading(loading: boolean) {
      update((state) => ({ ...state, loading }));
    },
    setError(error: string | null) {
      update((state) => ({ ...state, error }));
    },
    setMessages(messages: Message[]) {
      update((state) => ({
        ...state,
        messages,
        lastAssistantId:
          messages && messages.length
            ? (() => {
                for (let i = messages.length - 1; i >= 0; i--) {
                  if (messages[i].role === "assistant") return messages[i].id;
                }
                return null;
              })()
            : null,
      }));
    },
    setConversationId(conversationId: string | null) {
      update((state) => ({ ...state, conversationId }));
    },
    loadConversation(conversationId: string, messages: Message[]) {
      update((state) => ({
        ...state,
        conversationId,
        messages,
        loading: false,
        error: null,
        lastAssistantId:
          messages && messages.length
            ? (() => {
                for (let i = messages.length - 1; i >= 0; i--) {
                  if (messages[i].role === "assistant") return messages[i].id;
                }
                return null;
              })()
            : null,
      }));
    },
    startNew() {
      update((state) => ({
        ...initialState,
        tenantSlug: state.tenantSlug,
        lastAssistantId: null,
      }));
    },
    reset() {
      set(initialState);
    },
  };
}

export const chatStore = createChatStore();

export function refreshConversationList() {
  conversationListRefresh.set(Date.now());
}
