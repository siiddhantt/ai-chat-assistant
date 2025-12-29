<script lang="ts">
  import { currentTenant } from "$lib/auth";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { ExternalLink, Copy, Check } from "lucide-svelte";

  let copied = $state(false);

  const chatUrl = $derived(
    typeof window !== "undefined"
      ? `${window.location.origin}/chat/${$currentTenant?.slug}`
      : ""
  );

  async function copyToClipboard() {
    await navigator.clipboard.writeText(chatUrl);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
    <p class="text-muted-foreground">Configure your business chat</p>
  </div>

  <Card.Root>
    <Card.Header>
      <Card.Title>Business Information</Card.Title>
      <Card.Description>Your business details</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="space-y-2">
        <label for="business-name" class="text-sm font-medium"
          >Business Name</label
        >
        <Input id="business-name" value={$currentTenant?.name || ""} disabled />
      </div>
      <div class="space-y-2">
        <label for="chat-slug" class="text-sm font-medium">Chat Slug</label>
        <Input id="chat-slug" value={$currentTenant?.slug || ""} disabled />
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Title>Chat Widget</Card.Title>
      <Card.Description>Share this link with your customers</Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="flex gap-2">
        <Input value={chatUrl} readonly class="font-mono text-sm" />
        <Button variant="outline" size="icon" onclick={copyToClipboard}>
          {#if copied}
            <Check class="size-4 text-green-500" />
          {:else}
            <Copy class="size-4" />
          {/if}
        </Button>
        <Button variant="outline" size="icon" href={chatUrl} target="_blank">
          <ExternalLink class="size-4" />
        </Button>
      </div>
    </Card.Content>
  </Card.Root>
</div>
