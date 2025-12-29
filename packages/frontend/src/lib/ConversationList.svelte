<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { chatStore, conversationListRefresh } from "$lib/stores";
  import {
    visitor,
    publicChat,
    ApiError,
    type RecentConversation,
  } from "$lib/api/client";
  import {
    getVisitorId,
    storeConversationId,
    clearConversationId,
    getStoredConversationId,
  } from "$lib/visitor";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { useSidebar } from "$lib/components/ui/sidebar/context.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import { MessageSquare, LoaderCircle, Trash2 } from "lucide-svelte";

  let conversations: RecentConversation[] = $state([]);
  let loading = $state(false);
  let error: string | null = $state(null);
  let deleteConfirmOpen = $state(false);
  let conversationToDelete: RecentConversation | null = $state(null);

  const sidebar = useSidebar();
  const visitorId = getVisitorId();

  onMount(() => {
    loadConversations();
  });

  $effect(() => {
    if ($conversationListRefresh) {
      loadConversations();
    }
  });

  async function loadConversations() {
    loading = true;
    error = null;
    try {
      const response = await visitor.getRecentConversations(visitorId, {
        limit: 5,
        includeConversationId: $chatStore.conversationId ?? undefined,
      });
      conversations = response.conversations;
    } catch (err) {
      if (err instanceof ApiError && err.status !== 404) {
        error = err.message;
      }
    } finally {
      loading = false;
    }
  }

  async function selectConversation(conv: RecentConversation) {
    const isCurrentTenant = $chatStore.tenantSlug === conv.tenantSlug;

    if (isCurrentTenant) {
      try {
        chatStore.setLoading(true);
        const history = await publicChat.getConversation(
          conv.tenantSlug,
          conv.id,
          visitorId
        );
        chatStore.loadConversation(conv.id, history.messages);
        storeConversationId(conv.tenantSlug, conv.id);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load conversation";
        chatStore.setError(message);
      } finally {
        chatStore.setLoading(false);
      }
    } else {
      storeConversationId(conv.tenantSlug, conv.id);
      goto(`/chat/${conv.tenantSlug}`, { noScroll: true, keepFocus: true });
    }

    if (sidebar.isMobile) {
      sidebar.setOpenMobile(false);
    }
  }

  function openDeleteConfirm(e: MouseEvent, conv: RecentConversation) {
    e.stopPropagation();
    conversationToDelete = conv;
    deleteConfirmOpen = true;
  }

  async function confirmDelete() {
    if (!conversationToDelete) return;

    try {
      const toDelete = conversationToDelete;
      await visitor.deleteConversation(toDelete.id, visitorId);
      conversations = conversations.filter((c) => c.id !== toDelete.id);

      const stored = getStoredConversationId(toDelete.tenantSlug);
      if (stored === toDelete.id) {
        clearConversationId(toDelete.tenantSlug);
      }

      if ($chatStore.conversationId === toDelete.id) {
        chatStore.startNew();
      }

      deleteConfirmOpen = false;
      conversationToDelete = null;
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
</script>

<Sidebar.Root collapsible="offcanvas">
  <Sidebar.Header class="p-4 border-b border-sidebar-border">
    <h2 class="text-base font-semibold">Recent Chats</h2>
  </Sidebar.Header>

  <Sidebar.Content>
    <ScrollArea class="flex-1">
      <Sidebar.Group class="p-2">
        <Sidebar.GroupContent>
          {#if loading && conversations.length === 0}
            <div
              class="flex items-center justify-center py-8 text-muted-foreground"
            >
              <LoaderCircle class="size-4 animate-spin mr-2" />
              <span class="text-sm">Loading...</span>
            </div>
          {:else if error}
            <div class="text-sm text-destructive p-4 text-center">{error}</div>
          {:else if conversations.length === 0}
            <div class="text-sm text-muted-foreground p-4 text-center">
              No conversations yet
            </div>
          {:else}
            <Sidebar.Menu>
              {#each conversations as conv (conv.id)}
                <Sidebar.MenuItem class="group">
                  <Sidebar.MenuButton
                    isActive={$chatStore.conversationId === conv.id}
                    class="h-auto py-2.5"
                  >
                    {#snippet child({ props })}
                      <button
                        {...props}
                        onclick={() => selectConversation(conv)}
                      >
                        <MessageSquare class="size-4 shrink-0" />
                        <div
                          class="flex flex-col items-start gap-0.5 min-w-0 overflow-hidden flex-1"
                        >
                          <span
                            class="text-sm truncate w-full text-left font-medium"
                          >
                            {conv.tenantName}
                          </span>
                          <span
                            class="text-xs text-muted-foreground whitespace-nowrap"
                          >
                            {formatDate(conv.updatedAt)}
                          </span>
                        </div>
                      </button>
                    {/snippet}
                  </Sidebar.MenuButton>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onclick={(e) => openDeleteConfirm(e, conv)}
                  >
                    <Trash2
                      class="size-3.5 text-muted-foreground hover:text-destructive"
                    />
                  </Button>
                </Sidebar.MenuItem>
              {/each}
            </Sidebar.Menu>
          {/if}
        </Sidebar.GroupContent>
      </Sidebar.Group>
    </ScrollArea>
  </Sidebar.Content>

  <Sidebar.Rail />
</Sidebar.Root>

<AlertDialog.Root bind:open={deleteConfirmOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Conversation</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete this conversation with {conversationToDelete?.tenantName}?
        This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDelete}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
