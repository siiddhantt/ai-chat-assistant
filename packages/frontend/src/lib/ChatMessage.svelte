<script lang="ts">
	import type { Message } from '$lib/api';

	export let message: Message;

	$: isUser = message.role === 'user';
	$: time = new Date(message.timestamp).toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit'
	});
</script>

<div class="message" class:user={isUser} class:assistant={!isUser}>
	<div class="message-content">
		<p>{message.content}</p>
		<span class="message-time">{time}</span>
	</div>
</div>

<style>
	.message {
		display: flex;
		margin-bottom: 4px;
		animation: slideIn 0.3s ease-out;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.message.user {
		justify-content: flex-end;
	}

	.message.assistant {
		justify-content: flex-start;
	}

	.message-content {
		max-width: 75%;
		padding: 10px 14px;
		border-radius: 10px;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	.message.user .message-content {
		background: #fafafa;
		color: #09090b;
		border: 1px solid #e4e4e7;
	}

	.message.assistant .message-content {
		background: #18181b;
		color: #fafafa;
		border: 1px solid #27272a;
	}

	p {
		margin: 0;
		line-height: 1.5;
		font-size: 14px;
	}

	.message-time {
		display: block;
		font-size: 11px;
		margin-top: 6px;
		opacity: 0.5;
		font-weight: 400;
	}
</style>
