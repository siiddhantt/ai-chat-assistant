<script lang="ts">
  import { onMount } from "svelte";
  import { owner, ApiError } from "$lib/api/client";
  import type { Conversation } from "$lib/types";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { MessageSquare, CircleAlert, Loader2, Clock } from "lucide-svelte";
  import { cn } from "$lib/utils";

  let conversations = $state<Conversation[]>([]);
  let total = $state(0);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(() => loadConversations());

  async function loadConversations() {
    loading = true;
    error = null;
    try {
      const res = await owner.getConversations();
      conversations = res.conversations;
      total = res.total;
    } catch (err) {
      error =
        err instanceof ApiError ? err.message : "Failed to load conversations";
    } finally {
      loading = false;
    }
  }

  function formatTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Conversations</h1>
      <p class="text-muted-foreground">All customer conversations</p>
    </div>
    <Button variant="outline" onclick={loadConversations} disabled={loading}>
      {#if loading}
        <Loader2 class="size-4 animate-spin" />
      {/if}
      Refresh
    </Button>
  </div>

  {#if error}
    <Alert variant="destructive">
      <CircleAlert class="size-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  {/if}

  {#if loading}
    <div class="space-y-2">
      {#each Array(5) as _}
        <Card.Root>
          <Card.Content class="p-4 flex items-center gap-4">
            <Skeleton class="size-10 rounded-full shrink-0" />
            <div class="flex-1 space-y-2">
              <Skeleton class="h-4 w-32" />
              <Skeleton class="h-3 w-48" />
            </div>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {:else if conversations.length === 0}
    <Card.Root>
      <Card.Content class="flex flex-col items-center justify-center py-16">
        <MessageSquare class="size-12 text-muted-foreground mb-4" />
        <h3 class="text-lg font-medium mb-1">No conversations</h3>
        <p class="text-sm text-muted-foreground">
          Conversations will appear here when customers chat
        </p>
      </Card.Content>
    </Card.Root>
  {:else}
    <div class="text-sm text-muted-foreground mb-4">
      Showing {conversations.length} of {total} conversations
    </div>

    <div class="space-y-2">
      {#each conversations as conv}
        <a href="/dashboard/conversations/{conv.id}">
          <Card.Root class="hover:bg-muted/50 transition-colors">
            <Card.Content class="p-4 flex items-center gap-4">
              <div
                class="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0"
              >
                {conv.customer?.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium">
                    {conv.customer?.name || "Anonymous"}
                  </span>
                  {#if conv.isLead}
                    <span
                      class="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full"
                    >
                      Lead
                    </span>
                  {/if}
                  <span
                    class={cn(
                      "size-2 rounded-full ml-auto",
                      conv.status === "active" && "bg-green-500",
                      conv.status === "resolved" && "bg-blue-500",
                      conv.status === "archived" && "bg-gray-500"
                    )}
                  ></span>
                </div>
                <div
                  class="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  {#if conv.customer?.email}
                    <span class="truncate">{conv.customer.email}</span>
                  {:else}
                    <span class="font-mono text-xs">
                      {conv.customer?.visitorId?.slice(0, 16)}...
                    </span>
                  {/if}
                  <span
                    class="text-xs flex items-center gap-1 ml-auto shrink-0"
                  >
                    <Clock class="size-3" />
                    {formatTime(conv.updatedAt)}
                  </span>
                </div>
              </div>
            </Card.Content>
          </Card.Root>
        </a>
      {/each}
    </div>
  {/if}
</div>
