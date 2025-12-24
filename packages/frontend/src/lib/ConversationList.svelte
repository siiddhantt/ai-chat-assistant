<script lang="ts">
	import { onMount } from 'svelte';
	import { chatStore, conversationListRefresh, sidebarCollapsed } from '$lib/stores';
	import { getConversations, getConversationHistory, deleteConversation, type Conversation } from '$lib/api';

	let conversations: Conversation[] = [];
	let loading = false;
	let error: string | null = null;
	let isMobile = false;

	onMount(async () => {
		await loadConversations();
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	});

	function checkMobile() {
		isMobile = window.innerWidth < 768;
		if (isMobile) {
			sidebarCollapsed.set(true);
		}
	}

	$: $conversationListRefresh && loadConversations();

	async function loadConversations() {
		loading = true;
		error = null;
		try {
			const response = await getConversations();
			conversations = response.conversations;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load conversations';
		} finally {
			loading = false;
		}
	}

	async function loadConversation(id: string) {
		try {
			chatStore.setLoading(true);
			const history = await getConversationHistory(id);
			chatStore.loadConversation(id, history.messages);
			if (isMobile) {
				sidebarCollapsed.set(true);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to load conversation';
			chatStore.setError(message);
		} finally {
			chatStore.setLoading(false);
		}
	}

	function startNewConversation() {
		chatStore.startNew();
		if (isMobile) {
			sidebarCollapsed.set(true);
		}
	}

	async function handleDelete(id: string, event: MouseEvent) {
		event.stopPropagation();
		if (!confirm('Delete this conversation?')) return;

		try {
			await deleteConversation(id);
			conversations = conversations.filter(c => c.id !== id);
			if ($chatStore.conversationId === id) {
				chatStore.startNew();
			}
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed to delete conversation');
		}
	}

	function toggleCollapse() {
		sidebarCollapsed.update(v => !v);
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}
</script>

{#if !$sidebarCollapsed && isMobile}
	<div class="backdrop" role="button" tabindex="0" on:click={toggleCollapse} on:keydown={(e) => e.key === 'Escape' && toggleCollapse()}></div>
{/if}

<div class="sidebar" class:collapsed={$sidebarCollapsed} class:mobile={isMobile}>
	{#if !$sidebarCollapsed}
		<div class="sidebar-header">
			<h2>Conversations</h2>
			<div class="header-buttons">
				<button class="new-btn" on:click={startNewConversation}>+ New</button>
				<button class="collapse-btn" on:click={toggleCollapse} title="Collapse sidebar">
					←
				</button>
			</div>
		</div>

		{#if loading}
			<div class="loading">Loading...</div>
		{:else if error}
			<div class="error">{error}</div>
		{:else if conversations.length === 0}
			<div class="empty">No conversations yet</div>
		{:else}
			<div class="conversation-list">
				{#each conversations as conv (conv.id)}
					<div class="conversation-wrapper">
						<button
							class="conversation-item"
							class:active={$chatStore.conversationId === conv.id}
							on:click={() => loadConversation(conv.id)}
						>
							<div class="conv-id">{conv.id.slice(0, 16)}...</div>
							<div class="conv-date">{formatDate(conv.updatedAt)}</div>
						</button>
						<button class="delete-btn" on:click={(e) => handleDelete(conv.id, e)} title="Delete">
							×
						</button>
					</div>
				{/each}
			</div>
		{/if}
	{:else}
		<button class="expand-btn" on:click={toggleCollapse} title="Expand sidebar">
			→
		</button>
	{/if}
</div>

<style>
	.backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		z-index: 998;
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.sidebar {
		width: 280px;
		background: #18181b;
		border-right: 1px solid #27272a;
		display: flex;
		flex-direction: column;
		height: 100vh;
		position: relative;
		transition: all 0.3s ease;
		flex-shrink: 0;
	}

	.sidebar.mobile {
		position: fixed;
		top: 0;
		left: 0;
		z-index: 999;
		box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
	}

	.sidebar.collapsed {
		width: 48px;
	}

	.sidebar.mobile.collapsed {
		transform: translateX(-100%);
		width: 280px;
	}

	@media (max-width: 767px) {
		.sidebar {
			position: fixed;
			top: 0;
			left: 0;
			z-index: 999;
			box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
		}
		
		.sidebar.collapsed {
			transform: translateX(-100%);
		}
	}

	.sidebar-header {
		padding: 20px;
		border-bottom: 1px solid #27272a;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-buttons {
		display: flex;
		gap: 8px;
	}

	.sidebar-header h2 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: #fafafa;
		letter-spacing: -0.02em;
	}

	.new-btn,
	.collapse-btn {
		background: #27272a;
		color: #a1a1aa;
		border: 1px solid #3f3f46;
		padding: 6px 12px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.new-btn:hover,
	.collapse-btn:hover {
		background: #3f3f46;
		border-color: #52525b;
		color: #e4e4e7;
	}

	.expand-btn {
		position: absolute;
		top: 20px;
		left: 50%;
		transform: translateX(-50%);
		background: #27272a;
		color: #a1a1aa;
		border: 1px solid #3f3f46;
		width: 32px;
		height: 32px;
		border-radius: 6px;
		font-size: 14px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.sidebar.mobile.collapsed .expand-btn {
		display: none;
	}

	.expand-btn:hover {
		background: #3f3f46;
		border-color: #52525b;
		color: #e4e4e7;
	}

	.conversation-list {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
	}

	.conversation-wrapper {
		position: relative;
		margin-bottom: 6px;
	}

	.conversation-item {
		width: 100%;
		background: transparent;
		border: 1px solid #27272a;
		padding: 12px;
		padding-right: 36px;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
		color: #fafafa;
	}

	.conversation-item:hover {
		background: #27272a;
		border-color: #3f3f46;
	}

	.conversation-item.active {
		background: #3f3f46;
		border-color: #52525b;
	}

	.delete-btn {
		position: absolute;
		right: 8px;
		top: 50%;
		transform: translateY(-50%);
		width: 24px;
		height: 24px;
		background: transparent;
		color: #71717a;
		border: none;
		border-radius: 4px;
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
	}

	.delete-btn:hover {
		background: #450a0a;
		color: #fca5a5;
	}

	.conv-id {
		font-size: 13px;
		font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
		margin-bottom: 4px;
		color: #fafafa;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.conv-date {
		font-size: 11px;
		color: #71717a;
	}

	.loading,
	.error,
	.empty {
		padding: 20px;
		text-align: center;
		font-size: 13px;
		color: #71717a;
	}

	.error {
		color: #fca5a5;
	}
</style>
