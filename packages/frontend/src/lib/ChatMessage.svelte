<script lang="ts">
  import type { Message } from "$lib/types";
  import { Button } from "$lib/components/ui/button";
  import { createEventDispatcher } from "svelte";
  import { cn } from "$lib/utils";

  interface Props {
    message: Message;
    showActions?: boolean;
  }

  let { message, showActions = false }: Props = $props();

  const dispatch = createEventDispatcher<{
    quickSend: string;
    quickEdit: string;
  }>();

  const isUser = $derived(message.role === "user");
  const time = $derived(
    new Date(message.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );

  let pressTimer: number | null = null;
  let longPressed = false;

  function startPress(_e: PointerEvent, action: string) {
    longPressed = false;
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = window.setTimeout(() => {
      longPressed = true;
      dispatch("quickEdit", action);
    }, 500);
  }

  function endPress(e: PointerEvent, _action: string) {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    if (longPressed) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function cancelPress() {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }

  function handleChipClick(e: MouseEvent, action: string) {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault();
      dispatch("quickEdit", action);
    } else {
      dispatch("quickSend", action);
    }
  }
</script>

<div
  class={cn(
    "flex animate-in slide-in-from-bottom-2 duration-300",
    isUser ? "justify-end" : "justify-start"
  )}
>
  <div
    class={cn(
      "max-w-[75%] rounded-lg px-3.5 py-2.5 overflow-wrap-anywhere",
      isUser
        ? "bg-primary text-primary-foreground"
        : "bg-card text-card-foreground border border-border"
    )}
  >
    <p class="text-sm leading-relaxed">{message.content}</p>
    <span class="block text-xs mt-1.5 opacity-50">{time}</span>
  </div>
</div>

{#if !isUser && showActions && message.proposedActions && message.proposedActions.length}
  <div class="flex justify-start mt-1 pl-2">
    <div class="flex flex-wrap gap-2">
      {#each message.proposedActions.slice(0, 5) as action (action)}
        <div
          onpointerdown={(e) => startPress(e, action)}
          onpointerup={(e) => endPress(e, action)}
          onpointerleave={cancelPress}
          onpointercancel={cancelPress}
        >
          <Button
            size="sm"
            variant="secondary"
            class="rounded-full h-7 px-3 text-xs"
            title="Click to send • Shift/⌘ to edit before send"
            onclick={(e) => handleChipClick(e as MouseEvent, action)}
          >
            {action}
          </Button>
        </div>
      {/each}
    </div>
  </div>
{/if}
