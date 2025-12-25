<script lang="ts">
  import ChatWidget from "$lib/ChatWidget.svelte";
  import ConversationList from "$lib/ConversationList.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar";
</script>

<Sidebar.Provider>
  <ConversationList />
  <Sidebar.Inset class="flex flex-col h-screen overflow-hidden">
    <ChatWidget />
  </Sidebar.Inset>
</Sidebar.Provider>
