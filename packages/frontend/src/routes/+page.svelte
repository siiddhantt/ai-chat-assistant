<script lang="ts">
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { MessageSquare, ArrowRight, Users } from "lucide-svelte";
</script>

<div class="min-h-screen bg-background flex items-center justify-center p-4">
  <div class="max-w-lg w-full space-y-8 text-center">
    <div>
      <h1 class="text-4xl font-bold tracking-tight mb-2">Spur Chat</h1>
      <p class="text-muted-foreground">
        Multi-tenant chat platform for your business
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <Card.Root class="text-left">
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Users class="size-5" />
            Business Owner
          </Card.Title>
          <Card.Description>
            Manage your leads and conversations
          </Card.Description>
        </Card.Header>
        <Card.Footer>
          <Button class="w-full" onclick={() => goto("/auth")}>
            Go to Dashboard
            <ArrowRight class="size-4" />
          </Button>
        </Card.Footer>
      </Card.Root>

      <Card.Root class="text-left">
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <MessageSquare class="size-5" />
            Customer
          </Card.Title>
          <Card.Description>
            Chat with a business at /chat/[slug]
          </Card.Description>
        </Card.Header>
        <Card.Footer>
          <Button
            variant="outline"
            class="w-full"
            onclick={() => goto("/chat/demo")}
          >
            Try Demo Chat
            <ArrowRight class="size-4" />
          </Button>
        </Card.Footer>
      </Card.Root>
    </div>
  </div>
</div>
