<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { authStore, isOwner } from "$lib/auth";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { Button } from "$lib/components/ui/button";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import {
    LayoutDashboard,
    Users,
    MessageSquare,
    Settings,
    LogOut,
    ChevronRight,
  } from "lucide-svelte";

  let { children } = $props();

  onMount(() => {
    authStore.init();
  });

  $effect(() => {
    if ($authStore.initialized && !$authStore.user) {
      goto("/auth");
    }
    if ($authStore.initialized && $authStore.user && !$isOwner) {
      goto("/");
    }
  });

  function handleLogout() {
    authStore.logout();
    goto("/auth");
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/leads", label: "Leads", icon: Users },
    {
      href: "/dashboard/conversations",
      label: "Conversations",
      icon: MessageSquare,
    },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  function isActive(href: string) {
    if (href === "/dashboard") {
      return page.url.pathname === "/dashboard";
    }
    return page.url.pathname.startsWith(href);
  }
</script>

{#if !$authStore.initialized}
  <div class="min-h-screen flex items-center justify-center">
    <div class="space-y-4 w-64">
      <Skeleton class="h-8 w-full" />
      <Skeleton class="h-4 w-3/4" />
    </div>
  </div>
{:else if $authStore.user && $isOwner}
  <Sidebar.Provider>
    <Sidebar.Root collapsible="icon">
      <Sidebar.Header class="p-4 border-b border-sidebar-border">
        <div
          class="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
        >
          <div
            class="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0"
          >
            {$authStore.tenant?.name?.[0]?.toUpperCase() || "B"}
          </div>
          <div class="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p class="text-sm font-medium truncate">
              {$authStore.tenant?.name}
            </p>
            <p class="text-xs text-muted-foreground truncate">
              /{$authStore.tenant?.slug}
            </p>
          </div>
        </div>
      </Sidebar.Header>

      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.GroupContent>
            <Sidebar.Menu>
              {#each navItems as item}
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton isActive={isActive(item.href)}>
                    {#snippet child({ props })}
                      <a {...props} href={item.href}>
                        <item.icon class="size-4" />
                        <span>{item.label}</span>
                      </a>
                    {/snippet}
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              {/each}
            </Sidebar.Menu>
          </Sidebar.GroupContent>
        </Sidebar.Group>
      </Sidebar.Content>

      <Sidebar.Footer class="p-4 border-t border-sidebar-border">
        <div
          class="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
        >
          <div
            class="size-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0"
          >
            {$authStore.user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div class="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p class="text-sm font-medium truncate">{$authStore.user?.name}</p>
            <p class="text-xs text-muted-foreground truncate">
              {$authStore.user?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            class="shrink-0 group-data-[collapsible=icon]:hidden"
            onclick={handleLogout}
          >
            <LogOut class="size-4" />
          </Button>
        </div>
      </Sidebar.Footer>
    </Sidebar.Root>

    <Sidebar.Inset class="flex flex-col min-h-screen">
      <header
        class="flex items-center gap-2 px-6 py-4 border-b border-border shrink-0"
      >
        <Sidebar.Trigger>
          <ChevronRight class="size-4" />
        </Sidebar.Trigger>
        <div class="flex-1"></div>
      </header>
      <main class="flex-1 p-6 overflow-auto">
        {@render children()}
      </main>
    </Sidebar.Inset>
  </Sidebar.Provider>
{/if}
