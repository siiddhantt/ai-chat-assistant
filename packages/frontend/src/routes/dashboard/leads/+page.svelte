<script lang="ts">
  import { onMount } from "svelte";
  import { owner, ApiError } from "$lib/api/client";
  import type { Conversation } from "$lib/types";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import {
    Users,
    CircleAlert,
    ArrowRight,
    Mail,
    Clock,
    Loader2,
  } from "lucide-svelte";

  let leads = $state<Conversation[]>([]);
  let total = $state(0);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(() => loadLeads());

  async function loadLeads() {
    loading = true;
    error = null;
    try {
      const res = await owner.getLeads();
      leads = res.conversations;
      total = res.total;
    } catch (err) {
      error = err instanceof ApiError ? err.message : "Failed to load leads";
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
      <h1 class="text-2xl font-semibold tracking-tight">Leads</h1>
      <p class="text-muted-foreground">
        Potential customers who started a conversation
      </p>
    </div>
    <Button variant="outline" onclick={loadLeads} disabled={loading}>
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
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each Array(6) as _}
        <Card.Root>
          <Card.Header>
            <Skeleton class="h-5 w-32" />
            <Skeleton class="h-4 w-24" />
          </Card.Header>
          <Card.Content>
            <Skeleton class="h-4 w-full" />
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {:else if leads.length === 0}
    <Card.Root>
      <Card.Content class="flex flex-col items-center justify-center py-16">
        <Users class="size-12 text-muted-foreground mb-4" />
        <h3 class="text-lg font-medium mb-1">No leads yet</h3>
        <p class="text-sm text-muted-foreground text-center max-w-sm">
          When visitors start conversations on your chat, they'll appear here as
          leads.
        </p>
      </Card.Content>
    </Card.Root>
  {:else}
    <div class="text-sm text-muted-foreground mb-4">
      Showing {leads.length} of {total} leads
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each leads as lead}
        <Card.Root class="group hover:border-primary/50 transition-colors">
          <Card.Header>
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium"
                >
                  {lead.customer?.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <Card.Title class="text-base">
                    {lead.customer?.name || "Anonymous"}
                  </Card.Title>
                  {#if lead.customer?.email}
                    <div
                      class="flex items-center gap-1 text-xs text-muted-foreground"
                    >
                      <Mail class="size-3" />
                      {lead.customer.email}
                    </div>
                  {:else}
                    <div class="text-xs text-muted-foreground font-mono">
                      {lead.customer?.visitorId?.slice(0, 12)}...
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div class="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock class="size-3" />
              Started {formatTime(lead.createdAt)}
            </div>
          </Card.Content>
          <Card.Footer>
            <Button
              variant="ghost"
              size="sm"
              class="w-full group-hover:bg-primary group-hover:text-primary-foreground"
              href="/dashboard/conversations/{lead.id}"
            >
              View Conversation
              <ArrowRight class="size-4" />
            </Button>
          </Card.Footer>
        </Card.Root>
      {/each}
    </div>
  {/if}
</div>
