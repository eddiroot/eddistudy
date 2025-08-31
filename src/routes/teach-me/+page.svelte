<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import Button from '$lib/components/ui/button/button.svelte';
	import { goto } from '$app/navigation';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import type { PageData } from './$types';
	
	// VCE Subject icons from Lucide
	import CalculatorIcon from '@lucide/svelte/icons/calculator';
	import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
	import ScaleIcon from '@lucide/svelte/icons/scale';
	import HeartHandshakeIcon from '@lucide/svelte/icons/heart-handshake';
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import BrainIcon from '@lucide/svelte/icons/brain';
	import PieChartIcon from '@lucide/svelte/icons/pie-chart';
	import DollarSignIcon from '@lucide/svelte/icons/dollar-sign';
	import PenToolIcon from '@lucide/svelte/icons/pen-tool';
	import AtomIcon from '@lucide/svelte/icons/atom';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();

	// Map subject names to icons (let shadcn handle colors)
	const subjectMappings: Record<string, { icon: any; description: string }> = {
		'accounting': { icon: DollarSignIcon, description: 'Financial management, budgeting, and business reporting' },
		'biology': { icon: FlaskConicalIcon, description: 'Life sciences, genetics, and ecological systems' },
		'business management': { icon: TrendingUpIcon, description: 'Enterprise operations, leadership, and strategy' },
		'chemistry': { icon: AtomIcon, description: 'Chemical reactions, molecular structures, and analysis' },
		'economics': { icon: PieChartIcon, description: 'Market forces, financial systems, and economic theory' },
		'english': { icon: BookOpenIcon, description: 'Critical analysis, writing, and communication skills' },
		'general mathematics': { icon: CalculatorIcon, description: 'Practical mathematics for everyday applications' },
		'health and human development': { icon: HeartHandshakeIcon, description: 'Human wellness, development, and health promotion' },
		'legal studies': { icon: ScaleIcon, description: 'Law, justice systems, and legal principles' },
		'literature': { icon: PenToolIcon, description: 'Literary works, themes, and creative expression' },
		'mathematical methods': { icon: CalculatorIcon, description: 'Advanced mathematics including calculus and statistics' },
		'physical education': { icon: ActivityIcon, description: 'Movement, sports science, and physical wellbeing' },
		'physics': { icon: AtomIcon, description: 'Forces, energy, and the fundamental laws of nature' },
		'psychology': { icon: BrainIcon, description: 'Human behavior, cognition, and mental processes' },
		'specialist mathematics': { icon: CalculatorIcon, description: 'Advanced mathematical concepts for specialized applications' }
	};

	// Process database subjects and map them to display format
	const subjects = data.subjects.map((subject) => {
		// Create slug from name - remove VCE prefix and convert to kebab-case
		const nameWithoutVCE = subject.name.replace(/^VCE\s+/i, '').trim();
		
		// Get mapping info or use defaults
		const mapping = subjectMappings[nameWithoutVCE.toLowerCase()] || {
			icon: BookOpenIcon,
			description: 'Explore this subject area'
		};

		return {
			id: subject.id,
			name: nameWithoutVCE,
			originalName: subject.name,
			...mapping
		};
	});

	function handleSubjectClick(subjectId: number): void {
		// Navigate to the specific subject page using subject ID
		goto(`/teach-me/${subjectId}`);
	}
</script>

<svelte:head>
	<title>Teach Me - eddistudy</title>
	<meta name="description" content="Choose from our comprehensive VCE subject offerings to start your learning journey." />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
	<!-- Header Section -->
	<div class="container mx-auto px-4 py-16">
		<div class="text-center mb-16">
			<div class="flex items-center justify-center relative mb-6">
				<button 
					onclick={() => goto('/')}
					class="absolute left-0 p-2 rounded-lg hover:bg-muted transition-colors"
				>
					<ChevronLeftIcon class="w-6 h-6 text-muted-foreground" />
				</button>
				<h1 class="text-5xl md:text-6xl font-light tracking-tight">
					Teach me
				</h1>
			</div>
			<p class="text-xl text-muted-foreground font-light max-w-3xl mx-auto">
				Choose from our comprehensive VCE subjects and start your learning journey with interactive lessons and expert content.
			</p>
		</div>

		<!-- Subjects Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 max-w-[90rem] mx-auto">
			{#each subjects as subject}
				{@const IconComponent = subject.icon}
				<Card.Root class="group hover:shadow-xl transition-all duration-300 cursor-pointer" onclick={() => handleSubjectClick(subject.id)}>
					<Card.Content class="p-6 flex flex-col items-center text-center h-full">
						<div class="mb-4 p-4 rounded-full transition-colors">
							<IconComponent class="w-8 h-8" />
						</div>
						<h3 class="text-lg font-semibold mb-2 line-clamp-2">
							{subject.name}
						</h3>
						<p class="text-sm text-muted-foreground leading-relaxed flex-1">
							{subject.description}
						</p>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<!-- Call to Action -->
		<div class="text-center mt-16">
			<p class="text-muted-foreground mb-6">
				Can't find what you're looking for? <a href="/contact" class="text-primary hover:underline">Contact us</a> for more information.
			</p>
		</div>
	</div>
</div>
