<script lang="ts">
  import { page } from "$app/state";
  import { publicChat, ApiError } from "$lib/api/client";
  import {
    getVisitorId,
    getStoredConversationId,
    storeConversationId,
  } from "$lib/visitor";
  import { chatStore, refreshConversationList } from "$lib/stores";
  import type { TenantInfo } from "$lib/types";
  import ChatWidget from "$lib/ChatWidget.svelte";
  import ChatSkeleton from "$lib/ChatSkeleton.svelte";
  import ConversationList from "$lib/ConversationList.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { CircleAlert } from "lucide-svelte";

  let tenant = $state<TenantInfo | null>(null);
  let loading = $state(true);
  let hasMounted = $state(false);
  let error = $state<string | null>(null);

  const slug = $derived(page.params.slug ?? "");
  const visitorId = $derived(getVisitorId());

  $effect(() => {
    (async () => {
      if (!slug) return;
      loading = true;
      error = null;
      chatStore.startNew();
      chatStore.setError(null);
      chatStore.setLoading(true);
      chatStore.setTenant(slug);

      try {
        tenant = await publicChat.getInfo(slug);

        const storedConvId = getStoredConversationId(slug);
        if (storedConvId) {
          try {
            const res = await publicChat.getConversation(
              slug,
              storedConvId,
              visitorId
            );
            chatStore.loadConversation(storedConvId, res.messages);
          } catch {
            await loadMostRecentConversation();
          }
        } else {
          await loadMostRecentConversation();
        }

        refreshConversationList();
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          error = "Business not found";
        } else {
          error = "Failed to load chat";
        }
      } finally {
        chatStore.setLoading(false);
        loading = false;
        hasMounted = true;
      }
    })();
  });

  async function loadMostRecentConversation() {
    try {
      const convRes = await publicChat.getConversations(slug, visitorId);
      if (convRes.conversations.length > 0) {
        const mostRecent = convRes.conversations[0];
        const res = await publicChat.getConversation(
          slug,
          mostRecent.id,
          visitorId
        );
        chatStore.loadConversation(mostRecent.id, res.messages);
        storeConversationId(slug, mostRecent.id);
      }
    } catch {
      // No conversations yet, start fresh
    }
  }
</script>

{#if error}
  <div class="min-h-screen flex items-center justify-center p-4">
    <Alert variant="destructive" class="max-w-sm">
      <CircleAlert class="size-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  </div>
{:else}
  <Sidebar.Provider>
    <ConversationList />
    <Sidebar.Inset class="flex flex-col h-screen overflow-hidden">
      {#if loading}
        <ChatSkeleton />
      {:else if tenant}
        <ChatWidget tenantName={tenant.name} />
      {/if}
    </Sidebar.Inset>
  </Sidebar.Provider>
{/if}
