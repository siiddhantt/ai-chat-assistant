<script lang="ts">
  import { onMount } from "svelte";
  import { chatStore, conversationListRefresh } from "$lib/stores";
  import {
    getConversations,
    getConversationHistory,
    deleteConversation,
    type Conversation,
  } from "$lib/api";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { Button } from "$lib/components/ui/button";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Plus, Trash2, MessageSquare, Loader2 } from "lucide-svelte";
  import { cn } from "$lib/utils";

  let conversations: Conversation[] = $state([]);
  let loading = $state(false);
  let error: string | null = $state(null);
  let deleteConfirmId: string | null = $state(null);

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
      const response = await getConversations();
      conversations = response.conversations;
    } catch (err) {
      error =
        err instanceof Error ? err.message : "Failed to load conversations";
    } finally {
      loading = false;
    }
  }

  async function loadConversation(id: string) {
    try {
      chatStore.setLoading(true);
      const history = await getConversationHistory(id);
      chatStore.loadConversation(id, history.messages);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load conversation";
      chatStore.setError(message);
    } finally {
      chatStore.setLoading(false);
    }
  }

  function startNewConversation() {
    chatStore.startNew();
  }

  async function confirmDelete() {
    if (!deleteConfirmId) return;

    try {
      await deleteConversation(deleteConfirmId);
      conversations = conversations.filter((c) => c.id !== deleteConfirmId);
      if ($chatStore.conversationId === deleteConfirmId) {
        chatStore.startNew();
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to delete conversation"
      );
    } finally {
      deleteConfirmId = null;
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
    <div class="flex items-center justify-between">
      <h2 class="text-base font-semibold">Conversations</h2>
      <Button variant="ghost" size="icon-sm" onclick={startNewConversation}>
        <Plus class="size-4" />
      </Button>
    </div>
  </Sidebar.Header>

  <Sidebar.Content>
    <ScrollArea class="flex-1">
      <Sidebar.Group class="p-2">
        <Sidebar.GroupContent>
          {#if loading}
            <div
              class="flex items-center justify-center py-8 text-muted-foreground"
            >
              <Loader2 class="size-4 animate-spin mr-2" />
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
                    class="h-auto py-2.5 pr-10"
                  >
                    {#snippet child({ props })}
                      <button
                        {...props}
                        onclick={() => loadConversation(conv.id)}
                      >
                        <MessageSquare class="size-4 shrink-0" />
                        <div
                          class="flex flex-col items-start gap-1 min-w-0 overflow-hidden"
                        >
                          <span
                            class="text-xs font-mono truncate w-full text-left"
                          >
                            {conv.id.slice(0, 16)}...
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
                  <Sidebar.MenuAction
                    class="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity top-1/2! -translate-y-1/2! w-6! p-1!"
                  >
                    {#snippet child({ props })}
                      <button
                        {...props}
                        onclick={(e) => {
                          e.stopPropagation();
                          deleteConfirmId = conv.id;
                        }}
                      >
                        <Trash2 class="size-3.5 text-destructive" />
                      </button>
                    {/snippet}
                  </Sidebar.MenuAction>
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

<AlertDialog.Root
  open={deleteConfirmId !== null}
  onOpenChange={(open) => !open && (deleteConfirmId = null)}
>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete conversation?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete this
        conversation.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={confirmDelete}>Delete</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
