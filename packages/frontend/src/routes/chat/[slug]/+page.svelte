<script lang="ts">
  import { onMount } from "svelte";
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
  import ConversationList from "$lib/ConversationList.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { CircleAlert } from "lucide-svelte";

  let tenant = $state<TenantInfo | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  const slug = $derived(page.params.slug ?? "");
  const visitorId = $derived(getVisitorId());

  onMount(async () => {
    if (!slug) return;

    chatStore.reset();
    chatStore.setTenant(slug);

    try {
      tenant = await publicChat.getInfo(slug);

      // Try stored conversation first, then load most recent
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
          // Stored conversation may not exist, try loading most recent
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
      loading = false;
    }
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

{#if loading}
  <div class="min-h-screen flex items-center justify-center">
    <div class="space-y-4 w-64">
      <Skeleton class="h-8 w-full" />
      <Skeleton class="h-4 w-3/4" />
    </div>
  </div>
{:else if error}
  <div class="min-h-screen flex items-center justify-center p-4">
    <Alert variant="destructive" class="max-w-sm">
      <CircleAlert class="size-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  </div>
{:else if tenant}
  <Sidebar.Provider>
    <ConversationList />
    <Sidebar.Inset class="flex flex-col h-screen overflow-hidden">
      <ChatWidget tenantName={tenant.name} />
    </Sidebar.Inset>
  </Sidebar.Provider>
{/if}
