<script lang="ts">
	import { chatStore } from '$lib/stores';
	import { sendMessage, APIError } from '$lib/api';
	import ChatMessage from './ChatMessage.svelte';

	let inputValue = '';
	let messagesContainer: HTMLDivElement;

	async function handleSendMessage() {
		if (!inputValue.trim()) return;

		const userMessage = inputValue;
		inputValue = '';

		chatStore.addMessage({
			id: `msg-${Date.now()}`,
			conversationId: $chatStore.conversationId || '',
			role: 'user',
			content: userMessage,
			timestamp: new Date().toISOString()
		});

		scrollToBottom();
		chatStore.setLoading(true);
		chatStore.setError(null);

		try {
			const response = await sendMessage($chatStore.conversationId, userMessage);
			chatStore.addMessage(response.message);
		} catch (error) {
			const message =
				error instanceof APIError
					? error.message
					: error instanceof Error
						? error.message
						: 'An unexpected error occurred';
			chatStore.setError(message);
		} finally {
			chatStore.setLoading(false);
			scrollToBottom();
		}
	}

	function scrollToBottom() {
		setTimeout(() => {
			if (messagesContainer) {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}
		}, 0);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	}
</script>

<div class="chat-container">
	<div class="chat-header">
		<h1>Chat Agent</h1>
		<p class="conversation-id">ID: {$chatStore.conversationId || 'New Conversation'}</p>
	</div>

	<div class="messages" bind:this={messagesContainer}>
		{#if $chatStore.messages.length === 0}
			<div class="empty-state">
				<p>Start a conversation by typing a message below</p>
			</div>
		{:else}
			{#each $chatStore.messages as message (message.id)}
				<ChatMessage {message} />
			{/each}
		{/if}

		{#if $chatStore.error}
			<div class="error-message">
				<strong>Error:</strong> {$chatStore.error}
			</div>
		{/if}

		{#if $chatStore.loading}
			<div class="loading-indicator">
				<span class="dot"></span>
				<span class="dot"></span>
				<span class="dot"></span>
			</div>
		{/if}
	</div>

	<div class="input-area">
		<textarea
			bind:value={inputValue}
			placeholder="Type your message here... (Shift+Enter for new line)"
			disabled={$chatStore.loading}
			on:keydown={handleKeydown}
		></textarea>
		<button on:click={handleSendMessage} disabled={!inputValue.trim() || $chatStore.loading}>
			Send
		</button>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
			'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
		background: #09090b;
	}

	.chat-container {
		display: flex;
		flex-direction: column;
		flex: 1;
		background: #09090b;
		min-width: 0;
	}

	.chat-header {
		padding: 20px 24px;
		border-bottom: 1px solid #27272a;
		background: #09090b;
		color: #fafafa;
	}

	.chat-header h1 {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.conversation-id {
		margin: 6px 0 0 0;
		font-size: 12px;
		color: #71717a;
		font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		background: #09090b;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #52525b;
		text-align: center;
		font-size: 14px;
	}

	.error-message {
		padding: 12px 16px;
		background: #450a0a;
		border: 1px solid #7f1d1d;
		color: #fca5a5;
		border-radius: 8px;
		font-size: 13px;
	}

	.loading-indicator {
		display: flex;
		gap: 6px;
		align-items: center;
		justify-content: flex-start;
		padding: 12px 16px;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #71717a;
		animation: bounce 1.4s infinite;
	}

	.dot:nth-child(2) {
		animation-delay: 0.2s;
	}

	.dot:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes bounce {
		0%,
		80%,
		100% {
			transform: scale(0.8);
			opacity: 0.5;
		}
		40% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.input-area {
		padding: 16px 24px;
		border-top: 1px solid #27272a;
		display: flex;
		gap: 12px;
		background: #09090b;
	}

	textarea {
		flex: 1;
		padding: 12px 14px;
		border: 1px solid #27272a;
		border-radius: 8px;
		font-size: 14px;
		font-family: inherit;
		resize: none;
		max-height: 120px;
		outline: none;
		transition: all 0.2s;
		background: #18181b;
		color: #fafafa;
	}

	textarea::placeholder {
		color: #52525b;
	}

	textarea:focus {
		border-color: #3f3f46;
		background: #27272a;
	}

	textarea:disabled {
		background: #18181b;
		cursor: not-allowed;
		opacity: 0.5;
	}

	button {
		padding: 12px 20px;
		background: #fafafa;
		color: #09090b;
		border: none;
		border-radius: 8px;
		font-weight: 500;
		font-size: 14px;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	button:hover:not(:disabled) {
		background: #e4e4e7;
	}

	button:active:not(:disabled) {
		transform: scale(0.98);
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.messages::-webkit-scrollbar {
		width: 6px;
	}

	.messages::-webkit-scrollbar-track {
		background: transparent;
	}

	.messages::-webkit-scrollbar-thumb {
		background: #27272a;
		border-radius: 3px;
	}

	.messages::-webkit-scrollbar-thumb:hover {
		background: #3f3f46;
	}
</style>
