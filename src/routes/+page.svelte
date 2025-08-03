<script>
	import * as Card from '$lib/components/ui/card';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import TargetIcon from '@lucide/svelte/icons/target';
	import ClipboardCheckIcon from '@lucide/svelte/icons/clipboard-check';
	import { goto } from '$app/navigation';
</script>

<!-- Hero Section with Minimal Design -->
<section class="min-h-screen flex flex-col">
	<!-- Header -->
	<div class="flex-1 flex flex-col justify-center items-center px-4 py-16">
		<div class="max-w-6xl mx-auto w-full">
			<!-- Main Title and Tagline -->
			<div class="text-center mb-16">
				<h1 class="text-6xl md:text-7xl lg:text-8xl font-light text-gray-900 dark:text-gray-100 mb-6 tracking-tight">
					eddistudy
				</h1>
				<p class="text-lg md:text-xl text-gray-600 dark:text-gray-400 font-light">
					building the skills to excel in the VCE curriculum
				</p>
			</div>

			<!-- Three Main Sections -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-7xl mx-auto">
				<!-- Teach Me Section -->
				<Card.Root class="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-blue-200 dark:hover:border-blue-800" onclick={() => goto('/teach-me')}>
					<Card.Content class="p-16 flex flex-col items-center justify-center min-h-[400px] text-center">
						<div class="mb-8 p-6 rounded-full bg-blue-50 dark:bg-blue-950 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors">
							<BookOpenIcon class="w-16 h-16 text-blue-600 dark:text-blue-400" />
						</div>
						<h2 class="text-3xl font-medium text-gray-900 dark:text-gray-100 mb-6">
							Teach me
						</h2>
						<p class="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
							Interactive lessons and content to help you learn VCE concepts
						</p>
					</Card.Content>
				</Card.Root>

				<!-- Train Me Section -->
				<Card.Root class="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-green-200 dark:hover:border-green-800">
					<Card.Content class="p-16 flex flex-col items-center justify-center min-h-[400px] text-center">
						<div class="mb-8 p-6 rounded-full bg-green-50 dark:bg-green-950 group-hover:bg-green-100 dark:group-hover:bg-green-900 transition-colors">
							<TargetIcon class="w-16 h-16 text-green-600 dark:text-green-400" />
						</div>
						<h2 class="text-3xl font-medium text-gray-900 dark:text-gray-100 mb-6">
							Train me
						</h2>
						<p class="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
							Practice exercises and activities to reinforce your learning
						</p>
					</Card.Content>
				</Card.Root>

				<!-- Test Me Section -->
				<Card.Root class="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-purple-200 dark:hover:border-purple-800">
					<Card.Content class="p-16 flex flex-col items-center justify-center min-h-[400px] text-center">
						<div class="mb-8 p-6 rounded-full bg-purple-50 dark:bg-purple-950 group-hover:bg-purple-100 dark:group-hover:bg-purple-900 transition-colors">
							<ClipboardCheckIcon class="w-16 h-16 text-purple-600 dark:text-purple-400" />
						</div>
						<h2 class="text-3xl font-medium text-gray-900 dark:text-gray-100 mb-6">
							Test me
						</h2>
						<p class="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
							Assessments and mock exams to evaluate your progress
						</p>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</div>
</section>
