<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import Button from '$lib/components/ui/button/button.svelte';
	import { goto } from '$app/navigation';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import type { PageData } from './$types';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	
	// Format subject name for display
	function formatSubjectName(name: string): string {
		return name.replace(/^(VCE\s+)?/, ''); // Remove VCE prefix if it exists
	}

	function handleModuleClick(moduleId: number): void {
		goto(`/teach-me/${data.subjectId}/${moduleId}`);
	}

	function handleBackClick(): void {
		goto('/teach-me');
	}
</script>

<svelte:head>
	<title>{formatSubjectName(data.subject.name)} - Teach Me - eddistudy</title>
	<meta name="description" content="Explore learning modules for {formatSubjectName(data.subject.name)} to enhance your understanding with interactive content." />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
	<!-- Header Section -->
	<div class="container mx-auto px-4 py-16">
		<div class="mb-16">
			<div class="flex items-center mb-6">
				<button 
					onclick={handleBackClick}
					class="mr-4 p-2 rounded-lg hover:bg-muted transition-colors"
					aria-label="Go back to subject selection"
				>
					<ChevronLeftIcon class="w-6 h-6 text-muted-foreground" />
				</button>
				<div>
					<h1 class="text-4xl md:text-5xl font-light tracking-tight">
						{formatSubjectName(data.subject.name)}
					</h1>
					<p class="text-lg text-muted-foreground mt-2">
						Learning Modules
					</p>
				</div>
			</div>
		</div>

		<!-- Modules Grid -->
		{#if data.modules.length === 0}
			<div class="text-center py-16">
				<BookOpenIcon class="w-16 h-16 text-muted-foreground mx-auto mb-4" />
				<h2 class="text-2xl font-semibold mb-2">
					No modules available yet
				</h2>
				<p class="text-muted-foreground max-w-md mx-auto">
					We're working on creating engaging learning modules for {formatSubjectName(data.subject.name)}. Check back soon!
				</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each data.modules as module}
					<Card.Root class="group hover:shadow-xl transition-all duration-300 cursor-pointer" onclick={() => handleModuleClick(module.id)}>
						<Card.Content class="p-6 text-center space-y-4">
							<Card.Title class="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2">
								{module.title}
							</Card.Title>
							
							{#if module.description}
								<p class="text-sm text-muted-foreground line-clamp-3">
									{module.description}
								</p>
							{/if}
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</div>
</div>
