<script lang="ts">
  import { chatStore, refreshConversationList } from "$lib/stores";
  import { sendMessage, APIError } from "$lib/api";
  import ChatMessage from "./ChatMessage.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { Menu, Send, AlertCircle } from "lucide-svelte";
  import { cn } from "$lib/utils";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte";

  let inputValue = $state("");
  let messagesContainer: HTMLDivElement | null = $state(null);
  const mobile = new IsMobile();

  $effect(() => {
    if ($chatStore.messages.length > 0 || $chatStore.loading) {
      scrollToBottom();
    }
  });

  async function handleSendMessage() {
    if (!inputValue.trim()) return;

    const userMessage = inputValue;
    const isFirstMessage = !$chatStore.conversationId;
    inputValue = "";

    chatStore.addMessage({
      id: `msg-${Date.now()}`,
      conversationId: $chatStore.conversationId || "",
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    });

    scrollToBottom();
    chatStore.setLoading(true);
    chatStore.setError(null);

    try {
      const response = await sendMessage(
        $chatStore.conversationId,
        userMessage
      );
      chatStore.addMessage(response.message);

      if (isFirstMessage) {
        refreshConversationList();
      }
    } catch (error) {
      const message =
        error instanceof APIError
          ? error.message
          : error instanceof Error
            ? error.message
            : "An unexpected error occurred";
      chatStore.setError(message);
    } finally {
      chatStore.setLoading(false);
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 0);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }
</script>

<div class="flex flex-1 flex-col bg-background min-w-0 relative">
  <header
    class="flex items-center gap-4 px-6 py-5 border-b border-border shrink-0"
  >
    <Sidebar.Trigger class="md:hidden">
      <Menu class="size-4" />
    </Sidebar.Trigger>
    <div class="flex-1 min-w-0">
      <h1 class="text-xl font-semibold tracking-tight">Chat Agent</h1>
      <p class="text-xs text-muted-foreground font-mono mt-1">
        ID: {$chatStore.conversationId || "New Conversation"}
      </p>
    </div>
  </header>

  <div
    class={cn(
      "flex-1 overflow-y-auto p-6 flex flex-col gap-4",
      mobile.current && "pb-40"
    )}
    bind:this={messagesContainer}
  >
    {#if $chatStore.messages.length === 0}
      <div class="flex items-center justify-center h-full">
        <p class="text-muted-foreground text-sm">
          Start a conversation by typing a message below
        </p>
      </div>
    {:else}
      {#each $chatStore.messages as message (message.id)}
        <ChatMessage {message} />
      {/each}
    {/if}

    {#if $chatStore.error}
      <Alert variant="destructive">
        <AlertCircle class="size-4" />
        <AlertDescription>{$chatStore.error}</AlertDescription>
      </Alert>
    {/if}

    {#if $chatStore.loading}
      <div class="flex gap-1.5 items-center justify-start px-4 py-3">
        <span
          class="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]"
        ></span>
        <span
          class="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]"
        ></span>
        <span
          class="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]"
        ></span>
      </div>
    {/if}
  </div>

  <div
    class={cn(
      "sticky bottom-0 p-4 md:px-6 border-t border-border bg-background/95 backdrop-blur-sm z-50 shrink-0",
      mobile.current && "fixed bottom-0 left-0 right-0"
    )}
  >
    <div class="flex gap-3 items-stretch">
      <Textarea
        bind:value={inputValue}
        placeholder={mobile.current
          ? "Type your message..."
          : "Type your message... (Shift+Enter for new line)"}
        disabled={$chatStore.loading}
        onkeydown={handleKeydown}
        class="min-h-11 max-h-11 resize-none"
      />
      <Button
        onclick={handleSendMessage}
        disabled={!inputValue.trim() || $chatStore.loading}
        size="icon"
        class="shrink-0 h-11 w-11"
      >
        <Send class="size-4" />
      </Button>
    </div>
  </div>
</div>
