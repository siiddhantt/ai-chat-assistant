<script lang="ts">
  import type { Message } from "$lib/types";
  import { cn } from "$lib/utils";

  interface Props {
    message: Message;
  }

  let { message }: Props = $props();

  const isUser = $derived(message.role === "user");
  const time = $derived(
    new Date(message.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
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
