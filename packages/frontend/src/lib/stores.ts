import { writable } from "svelte/store";
import type { Message } from "./api";

export interface ChatState {
  conversationId: string | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
}

export const conversationListRefresh = writable<number>(Date.now());

function createChatStore() {
  const initialState: ChatState = {
    conversationId: null,
    messages: [],
    loading: false,
    error: null,
  };

  const { subscribe, set, update } = writable<ChatState>(initialState);

  return {
    subscribe,
    addMessage(message: Message) {
      update((state) => ({
        ...state,
        messages: [...state.messages, message],
        conversationId: state.conversationId || message.conversationId,
      }));
    },
    setLoading(loading: boolean) {
      update((state) => ({ ...state, loading }));
    },
    setError(error: string | null) {
      update((state) => ({ ...state, error }));
    },
    setMessages(messages: Message[]) {
      update((state) => ({ ...state, messages }));
    },
    setConversationId(conversationId: string | null) {
      update((state) => ({ ...state, conversationId }));
    },
    loadConversation(conversationId: string, messages: Message[]) {
      update(() => ({
        conversationId,
        messages,
        loading: false,
        error: null,
      }));
    },
    startNew() {
      set(initialState);
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
