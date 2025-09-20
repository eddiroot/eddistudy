<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { goto } from '$app/navigation';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import type { PageData } from './$types';
	import { ViewMode } from '$lib/schemas/blockSchema';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();

	function handleSubTaskClick(taskId: number): void {
		// Navigate to task page in ANSWER mode
		goto(`/teach-me/${data.subjectId}/${data.moduleId}/${taskId}?mode=${ViewMode.ANSWER}`);
	}

	function handleBackClick(): void {
		goto(`/teach-me/${data.subjectId}`);
	}
</script>

<svelte:head>
	<title>{data.module.title} - eddistudy</title>
	<meta name="description" content="{data.module.description || 'Explore this learning module'}" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
	<div class="container mx-auto px-4 py-8">
		<!-- Back button outdented -->
		<button 
			onclick={handleBackClick}
			class="mb-8 p-2 rounded-lg hover:bg-muted transition-colors"
			aria-label="Go back to modules"
		>
			<ChevronLeftIcon class="w-6 h-6 text-muted-foreground" />
		</button>

		<!-- Module Header -->
		<div class="mb-8">
			<h1 class="text-3xl md:text-4xl font-light tracking-tight mb-4">
				{data.module.title}
			</h1>
			{#if data.module.description}
				<p class="text-lg text-muted-foreground max-w-4xl">
					{data.module.description}
				</p>
			{/if}
		</div>

		<!-- Learning Activities -->
		{#if data.module.subTasks && data.module.subTasks.length > 0}
			<div class="space-y-4">
				{#each data.module.subTasks as subTask, index}
					<Card.Root 
						class="group hover:shadow-md transition-all duration-200 cursor-pointer border hover:border-primary/30" 
						onclick={() => handleSubTaskClick(subTask.task.id)}
					>
						<Card.Content class="p-6">
							<div class="flex items-start gap-4">
								<div class="flex-shrink-0">
									<div class="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
										<span class="text-sm font-semibold text-primary">{index + 1}</span>
									</div>
								</div>
								
								<div class="flex-1">
									<h3 class="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
										{subTask.task.title}
									</h3>
									{#if subTask.objective}
										<p class="text-muted-foreground">
											{subTask.objective}
										</p>
									{/if}
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<div class="text-center py-16">
				<BookOpenIcon class="w-16 h-16 text-muted-foreground mx-auto mb-4" />
				<h2 class="text-2xl font-semibold mb-2">
					No activities available yet
				</h2>
				<p class="text-muted-foreground max-w-md mx-auto">
					This module is being prepared. Check back soon for interactive learning activities!
				</p>
			</div>
		{/if}
	</div>
</div>