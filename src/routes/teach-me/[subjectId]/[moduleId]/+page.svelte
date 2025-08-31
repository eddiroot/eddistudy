<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { goto } from '$app/navigation';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import ListIcon from '@lucide/svelte/icons/list';
	import TargetIcon from '@lucide/svelte/icons/target';
	import type { PageData } from './$types';
	import { ViewMode } from '$lib/schemas/blockSchema';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	
	// Format subject name for display
	function formatSubjectName(name: string): string {
		return name.replace(/^(VCE\s+)?/, ''); // Remove VCE prefix if it exists
	}

	function handleSubTaskClick(taskId: number): void {
		// Navigate to task page in ANSWER mode
		goto(`/teach-me/${data.subjectId}/${data.moduleId}/${taskId}?mode=${ViewMode.ANSWER}`);
	}

	function handleBackClick(): void {
		goto(`/teach-me/${data.subjectId}`);
	}
</script>

<svelte:head>
	<title>{data.module.title} - {formatSubjectName(data.subject.name)} - eddistudy</title>
	<meta name="description" content="{data.module.description || 'Explore this learning module'}" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
	<!-- Header Section -->
	<div class="container mx-auto px-4 py-16">
		<div class="mb-16">
			<div class="flex items-center mb-6">
				<button 
					onclick={handleBackClick}
					class="mr-4 p-2 rounded-lg hover:bg-muted transition-colors"
					aria-label="Go back to modules"
				>
					<ChevronLeftIcon class="w-6 h-6 text-muted-foreground" />
				</button>
				<div class="flex-1">
					<div class="flex items-center gap-2 mb-2">
						<Badge variant="secondary" class="text-xs">
							{formatSubjectName(data.subject.name)}
						</Badge>
					</div>
					<h1 class="text-4xl md:text-5xl font-light tracking-tight mb-4">
						{data.module.title}
					</h1>
					{#if data.module.description}
						<p class="text-lg text-muted-foreground mb-4 max-w-4xl">
							{data.module.description}
						</p>
					{/if}
					{#if data.module.objective}
						<div class="flex items-start gap-3">
							<TargetIcon class="w-5 h-5 text-primary mt-1 flex-shrink-0" />
							<div>
								<h3 class="font-medium text-gray-900 dark:text-gray-100 mb-1">Learning Objective</h3>
								<p class="text-muted-foreground">{data.module.objective}</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Module Sub-Tasks -->
		{#if data.module.subTasks && data.module.subTasks.length > 0}
			<div class="mb-8">
				<div class="flex items-center gap-3 mb-8">
					<ListIcon class="w-6 h-6 text-primary" />
					<h2 class="text-2xl font-semibold">Learning Activities</h2>
					<Badge variant="outline">{data.module.subTasks.length} activities</Badge>
				</div>

				<div class="grid gap-6">
					{#each data.module.subTasks as subTask, index}
						<Card.Root 
							class="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/20" 
							onclick={() => handleSubTaskClick(subTask.task.id)}
						>
							<Card.Content class="p-6">
								<div class="flex items-start gap-4">
									<div class="flex-shrink-0">
										<div class="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
											<span class="text-sm font-semibold text-primary">{index + 1}</span>
										</div>
									</div>
									
									<div class="flex-1 space-y-4">
										<div>
											<h3 class="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
												{subTask.task.title}
											</h3>
											{#if subTask.objective}
												<p class="text-muted-foreground mb-3">
													{subTask.objective}
												</p>
											{/if}
										</div>

										{#if subTask.concepts?.length || subTask.skills?.length}
											<div class="grid md:grid-cols-2 gap-4">
												{#if subTask.concepts?.length}
													<div>
														<h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
															Key Concepts
														</h4>
														<ul class="space-y-1">
															{#each subTask.concepts as concept}
																<li class="text-sm text-muted-foreground flex items-center gap-2">
																	<div class="w-1 h-1 rounded-full bg-primary flex-shrink-0"></div>
																	{concept}
																</li>
															{/each}
														</ul>
													</div>
												{/if}

												{#if subTask.skills?.length}
													<div>
														<h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
															Skills Developed
														</h4>
														<ul class="space-y-1">
															{#each subTask.skills as skill}
																<li class="text-sm text-muted-foreground flex items-center gap-2">
																	<div class="w-1 h-1 rounded-full bg-green-500 flex-shrink-0"></div>
																	{skill}
																</li>
															{/each}
														</ul>
													</div>
												{/if}
											</div>
										{/if}

										<div class="flex items-center justify-between pt-2">
											<div class="text-xs text-muted-foreground">
												Activity {index + 1} of {data.module.subTasks.length}
											</div>
										</div>
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
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