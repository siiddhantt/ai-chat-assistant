<script lang="ts">
	import ChatWidget from '$lib/ChatWidget.svelte';
	import ConversationList from '$lib/ConversationList.svelte';
</script>

<div class="app-layout">
	<ConversationList />
	<ChatWidget />
</div>

<style>
	.app-layout {
		display: flex;
		height: 100vh;
		overflow: hidden;
		position: relative;
	}
</style>
