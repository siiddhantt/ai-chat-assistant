<script lang="ts">
  import { onMount } from "svelte";
  import { owner, ApiError } from "$lib/api/client";
  import { currentTenant } from "$lib/auth";
  import type { DashboardStats } from "$lib/types";
  import * as Card from "$lib/components/ui/card";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import {
    Users,
    MessageSquare,
    TrendingUp,
    CheckCircle,
    CircleAlert,
  } from "lucide-svelte";

  let stats = $state<DashboardStats | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      stats = await owner.getStats();
    } catch (err) {
      error =
        err instanceof ApiError ? err.message : "Failed to load dashboard";
    } finally {
      loading = false;
    }
  });

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
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
    <p class="text-muted-foreground">
      Overview of your business at
      <span class="font-mono text-foreground">/chat/{$currentTenant?.slug}</span
      >
    </p>
  </div>

  {#if error}
    <Alert variant="destructive">
      <CircleAlert class="size-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  {/if}

  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {#if loading}
      {#each Array(4) as _}
        <Card.Root>
          <Card.Header class="pb-2">
            <Skeleton class="h-4 w-24" />
          </Card.Header>
          <Card.Content>
            <Skeleton class="h-8 w-16" />
          </Card.Content>
        </Card.Root>
      {/each}
    {:else if stats}
      <Card.Root>
        <Card.Header
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <Card.Title class="text-sm font-medium">Active Leads</Card.Title>
          <Users class="size-4 text-muted-foreground" />
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">{stats.activeLeads}</div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <Card.Title class="text-sm font-medium">Converted</Card.Title>
          <TrendingUp class="size-4 text-muted-foreground" />
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">{stats.convertedLeads}</div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <Card.Title class="text-sm font-medium"
            >Total Conversations</Card.Title
          >
          <MessageSquare class="size-4 text-muted-foreground" />
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">{stats.totalConversations}</div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <Card.Title class="text-sm font-medium">Resolved</Card.Title>
          <CheckCircle class="size-4 text-muted-foreground" />
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">{stats.resolvedConversations}</div>
        </Card.Content>
      </Card.Root>
    {/if}
  </div>

  <Card.Root>
    <Card.Header>
      <Card.Title>Recent Activity</Card.Title>
      <Card.Description
        >Latest messages from your conversations</Card.Description
      >
    </Card.Header>
    <Card.Content>
      {#if loading}
        <div class="space-y-4">
          {#each Array(3) as _}
            <div class="flex items-start gap-4">
              <Skeleton class="size-10 rounded-full shrink-0" />
              <div class="flex-1 space-y-2">
                <Skeleton class="h-4 w-32" />
                <Skeleton class="h-4 w-full" />
              </div>
            </div>
          {/each}
        </div>
      {:else if stats?.recentActivity.length === 0}
        <p class="text-muted-foreground text-sm text-center py-8">
          No recent activity yet
        </p>
      {:else if stats}
        <div class="space-y-4">
          {#each stats.recentActivity as activity}
            <a
              href="/dashboard/conversations/{activity.conversationId}"
              class="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div
                class="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0"
              >
                {activity.customerName?.[0]?.toUpperCase() || "?"}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-sm">
                    {activity.customerName || "Anonymous"}
                  </span>
                  <span class="text-xs text-muted-foreground">
                    {formatTime(activity.timestamp)}
                  </span>
                </div>
                <p class="text-sm text-muted-foreground truncate">
                  {activity.lastMessage}
                </p>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
