<script lang="ts">
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/auth";
  import { auth, ApiError } from "$lib/api/client";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Card from "$lib/components/ui/card";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { CircleAlert, Loader2 } from "lucide-svelte";

  let mode: "login" | "register" = $state("login");
  let loading = $state(false);
  let error = $state<string | null>(null);

  let email = $state("");
  let password = $state("");
  let name = $state("");
  let businessName = $state("");
  let slug = $state("");

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleBusinessNameChange() {
    if (mode === "register" && !slug) {
      slug = generateSlug(businessName);
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = null;
    loading = true;

    try {
      if (mode === "login") {
        const res = await auth.ownerLogin(email, password);
        authStore.setAuth(res.token, res.user, res.tenant);
      } else {
        const res = await auth.ownerRegister({
          email,
          password,
          name,
          businessName,
          businessSlug: slug || generateSlug(businessName),
        });
        authStore.setAuth(res.token, res.user, res.tenant);
      }
      goto("/dashboard");
    } catch (err) {
      error = err instanceof ApiError ? err.message : "Something went wrong";
    } finally {
      loading = false;
    }
  }

  function toggleMode() {
    mode = mode === "login" ? "register" : "login";
    error = null;
  }
</script>

<div class="min-h-screen flex items-center justify-center p-4 bg-background">
  <Card.Root class="w-full max-w-md">
    <Card.Header>
      <Card.Title class="text-2xl">
        {mode === "login" ? "Welcome back" : "Create your business"}
      </Card.Title>
      <Card.Description>
        {mode === "login"
          ? "Sign in to your owner dashboard"
          : "Set up your business chat in minutes"}
      </Card.Description>
    </Card.Header>

    <Card.Content>
      {#if error}
        <Alert variant="destructive" class="mb-4">
          <CircleAlert class="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      {/if}

      <form onsubmit={handleSubmit} class="space-y-4">
        {#if mode === "register"}
          <div class="space-y-2">
            <label for="name" class="text-sm font-medium">Your Name</label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              bind:value={name}
              required
            />
          </div>

          <div class="space-y-2">
            <label for="businessName" class="text-sm font-medium"
              >Business Name</label
            >
            <Input
              id="businessName"
              type="text"
              placeholder="Acme Inc"
              bind:value={businessName}
              oninput={handleBusinessNameChange}
              required
            />
          </div>

          <div class="space-y-2">
            <label for="slug" class="text-sm font-medium">Chat URL</label>
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">/chat/</span>
              <Input
                id="slug"
                type="text"
                placeholder="acme-inc"
                bind:value={slug}
                required
              />
            </div>
          </div>
        {/if}

        <div class="space-y-2">
          <label for="email" class="text-sm font-medium">Email</label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            bind:value={email}
            required
          />
        </div>

        <div class="space-y-2">
          <label for="password" class="text-sm font-medium">Password</label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            bind:value={password}
            minlength={6}
            required
          />
        </div>

        <Button type="submit" class="w-full" disabled={loading}>
          {#if loading}
            <Loader2 class="size-4 animate-spin" />
          {/if}
          {mode === "login" ? "Sign In" : "Create Account"}
        </Button>
      </form>
    </Card.Content>

    <Card.Footer class="justify-center">
      <button
        type="button"
        class="text-sm text-muted-foreground hover:text-foreground"
        onclick={toggleMode}
      >
        {mode === "login"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </Card.Footer>
  </Card.Root>
</div>
