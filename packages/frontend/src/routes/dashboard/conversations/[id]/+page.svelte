<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { owner, ApiError } from "$lib/api/client";
  import type { Conversation, Message } from "$lib/types";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import {
    ArrowLeft,
    CircleAlert,
    CheckCircle,
    Archive,
    TrendingUp,
    Loader2,
    Mail,
    User,
  } from "lucide-svelte";
  import { cn } from "$lib/utils";

  let conversation = $state<Conversation | null>(null);
  let messages = $state<Message[]>([]);
  let loading = $state(true);
  let actionLoading = $state(false);
  let error = $state<string | null>(null);

  const conversationId = $derived(page.params.id ?? "");

  onMount(() => loadConversation());

  async function loadConversation() {
    if (!conversationId) return;
    loading = true;
    error = null;
    try {
      const res = await owner.getConversation(conversationId);
      conversation = res.conversation;
      messages = res.messages;
    } catch (err) {
      error =
        err instanceof ApiError ? err.message : "Failed to load conversation";
    } finally {
      loading = false;
    }
  }

  async function handleConvert() {
    if (!conversation || !conversationId) return;
    actionLoading = true;
    try {
      conversation = await owner.convertLead(conversationId);
    } catch (err) {
      error = err instanceof ApiError ? err.message : "Failed to convert lead";
    } finally {
      actionLoading = false;
    }
  }

  async function handleStatusChange(status: Conversation["status"]) {
    if (!conversation || !conversationId) return;
    actionLoading = true;
    try {
      conversation = await owner.updateStatus(conversationId, status);
    } catch (err) {
      error = err instanceof ApiError ? err.message : "Failed to update status";
    } finally {
      actionLoading = false;
    }
  }

  function formatTime(timestamp: string) {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<div class="space-y-6">
  <div class="flex items-center gap-4">
    <Button
      variant="ghost"
      size="icon"
      onclick={() => goto("/dashboard/leads")}
    >
      <ArrowLeft class="size-4" />
    </Button>
    <div class="flex-1">
      <h1 class="text-xl font-semibold tracking-tight">Conversation</h1>
      <p class="text-sm text-muted-foreground font-mono">{conversationId}</p>
    </div>
  </div>

  {#if error}
    <Alert variant="destructive">
      <CircleAlert class="size-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  {/if}

  {#if loading}
    <div class="grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <Card.Root>
          <Card.Content class="p-6 space-y-4">
            {#each Array(5) as _}
              <Skeleton class="h-16 w-3/4" />
            {/each}
          </Card.Content>
        </Card.Root>
      </div>
      <div>
        <Card.Root>
          <Card.Header>
            <Skeleton class="h-5 w-24" />
          </Card.Header>
          <Card.Content class="space-y-4">
            <Skeleton class="h-10 w-full" />
            <Skeleton class="h-10 w-full" />
          </Card.Content>
        </Card.Root>
      </div>
    </div>
  {:else if conversation}
    <div class="grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <Card.Root>
          <Card.Header class="border-b">
            <div class="flex items-center justify-between">
              <Card.Title>Messages</Card.Title>
              <span class="text-xs text-muted-foreground">
                {messages.length} messages
              </span>
            </div>
          </Card.Header>
          <ScrollArea class="h-125">
            <Card.Content class="p-4 space-y-4">
              {#each messages as message}
                <div
                  class={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    class={cn(
                      "max-w-[80%] rounded-lg px-4 py-3",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p class="text-sm">{message.content}</p>
                    <span class="block text-xs mt-2 opacity-60">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              {/each}
            </Card.Content>
          </ScrollArea>
        </Card.Root>
      </div>

      <div class="space-y-4">
        <Card.Root>
          <Card.Header>
            <Card.Title class="text-base">Customer</Card.Title>
          </Card.Header>
          <Card.Content class="space-y-3">
            <div class="flex items-center gap-3">
              <div
                class="size-12 rounded-full bg-muted flex items-center justify-center text-lg font-medium"
              >
                {conversation.customer?.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p class="font-medium">
                  {conversation.customer?.name || "Anonymous"}
                </p>
                {#if conversation.customer?.email}
                  <p
                    class="text-sm text-muted-foreground flex items-center gap-1"
                  >
                    <Mail class="size-3" />
                    {conversation.customer.email}
                  </p>
                {/if}
              </div>
            </div>
            {#if conversation.customer?.visitorId}
              <div
                class="text-xs text-muted-foreground font-mono p-2 bg-muted rounded"
              >
                Visitor: {conversation.customer.visitorId}
              </div>
            {/if}
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title class="text-base">Status</Card.Title>
          </Card.Header>
          <Card.Content class="space-y-3">
            <div class="flex items-center gap-2">
              <span
                class={cn(
                  "size-2 rounded-full",
                  conversation.status === "active" && "bg-green-500",
                  conversation.status === "resolved" && "bg-blue-500",
                  conversation.status === "archived" && "bg-gray-500"
                )}
              ></span>
              <span class="capitalize">{conversation.status}</span>
              {#if conversation.isLead}
                <span
                  class="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full"
                >
                  Lead
                </span>
              {/if}
            </div>

            {#if conversation.leadConvertedAt}
              <p class="text-xs text-muted-foreground">
                Converted on {formatTime(conversation.leadConvertedAt)}
              </p>
            {/if}
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title class="text-base">Actions</Card.Title>
          </Card.Header>
          <Card.Content class="space-y-2">
            {#if conversation.isLead}
              <Button
                class="w-full"
                onclick={handleConvert}
                disabled={actionLoading}
              >
                {#if actionLoading}
                  <Loader2 class="size-4 animate-spin" />
                {:else}
                  <TrendingUp class="size-4" />
                {/if}
                Convert Lead
              </Button>
            {/if}

            {#if conversation.status === "active"}
              <Button
                variant="outline"
                class="w-full"
                onclick={() => handleStatusChange("resolved")}
                disabled={actionLoading}
              >
                <CheckCircle class="size-4" />
                Mark Resolved
              </Button>
              <Button
                variant="ghost"
                class="w-full"
                onclick={() => handleStatusChange("archived")}
                disabled={actionLoading}
              >
                <Archive class="size-4" />
                Archive
              </Button>
            {:else if conversation.status === "archived"}
              <Button
                variant="outline"
                class="w-full"
                onclick={() => handleStatusChange("active")}
                disabled={actionLoading}
              >
                Reopen
              </Button>
            {/if}
          </Card.Content>
        </Card.Root>
      </div>
    </div>
  {/if}
</div>
