<script lang="ts">
  import { Skeleton } from "$lib/components/ui/skeleton";
</script>

<div class="flex h-screen flex-col bg-background min-w-0 relative">
  <header
    class="flex items-center gap-4 px-6 py-5 border-b border-border shrink-0"
  >
    <div class="md:hidden h-6 w-6 rounded-md bg-muted"></div>
    <div class="flex items-center gap-3 min-w-0 h-12">
      <Skeleton class="h-8 w-8 rounded-full" />
      <div class="space-y-1 min-w-0">
        <Skeleton class="h-5 w-40" />
        <Skeleton class="h-3 w-56" />
      </div>
    </div>
  </header>

  <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-4"></div>

  <div
    class="sticky bottom-0 p-4 md:px-6 border-t border-border bg-background/95 backdrop-blur-sm z-50 shrink-0"
  >
    <div class="flex gap-3 items-stretch">
      <Skeleton class="h-11 w-full rounded-md" />
      <Skeleton class="h-11 w-11 rounded-md" />
    </div>
  </div>
</div>
