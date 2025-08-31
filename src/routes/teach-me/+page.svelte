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

	// Map subject names to icons with colors for variety
	const subjectMappings: Record<string, { icon: any; description: string; colorClass: string; borderColorClass: string; iconColorClass: string }> = {
		'accounting': { 
			icon: DollarSignIcon, 
			description: 'Financial management, budgeting, and business reporting',
			colorClass: 'bg-green-50 dark:bg-green-950 group-hover:bg-green-100 dark:group-hover:bg-green-900',
			borderColorClass: 'hover:border-green-200 dark:hover:border-green-800',
			iconColorClass: 'text-green-600 dark:text-green-400'
		},
		'biology': { 
			icon: FlaskConicalIcon, 
			description: 'Life sciences, genetics, and ecological systems',
			colorClass: 'bg-emerald-50 dark:bg-emerald-950 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900',
			borderColorClass: 'hover:border-emerald-200 dark:hover:border-emerald-800',
			iconColorClass: 'text-emerald-600 dark:text-emerald-400'
		},
		'business management': { 
			icon: TrendingUpIcon, 
			description: 'Enterprise operations, leadership, and strategy',
			colorClass: 'bg-blue-50 dark:bg-blue-950 group-hover:bg-blue-100 dark:group-hover:bg-blue-900',
			borderColorClass: 'hover:border-blue-200 dark:hover:border-blue-800',
			iconColorClass: 'text-blue-600 dark:text-blue-400'
		},
		'chemistry': { 
			icon: AtomIcon, 
			description: 'Chemical reactions, molecular structures, and analysis',
			colorClass: 'bg-orange-50 dark:bg-orange-950 group-hover:bg-orange-100 dark:group-hover:bg-orange-900',
			borderColorClass: 'hover:border-orange-200 dark:hover:border-orange-800',
			iconColorClass: 'text-orange-600 dark:text-orange-400'
		},
		'economics': { 
			icon: PieChartIcon, 
			description: 'Market forces, financial systems, and economic theory',
			colorClass: 'bg-indigo-50 dark:bg-indigo-950 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900',
			borderColorClass: 'hover:border-indigo-200 dark:hover:border-indigo-800',
			iconColorClass: 'text-indigo-600 dark:text-indigo-400'
		},
		'english': { 
			icon: BookOpenIcon, 
			description: 'Critical analysis, writing, and communication skills',
			colorClass: 'bg-purple-50 dark:bg-purple-950 group-hover:bg-purple-100 dark:group-hover:bg-purple-900',
			borderColorClass: 'hover:border-purple-200 dark:hover:border-purple-800',
			iconColorClass: 'text-purple-600 dark:text-purple-400'
		},
		'general mathematics': { 
			icon: CalculatorIcon, 
			description: 'Practical mathematics for everyday applications',
			colorClass: 'bg-teal-50 dark:bg-teal-950 group-hover:bg-teal-100 dark:group-hover:bg-teal-900',
			borderColorClass: 'hover:border-teal-200 dark:hover:border-teal-800',
			iconColorClass: 'text-teal-600 dark:text-teal-400'
		},
		'health and human development': { 
			icon: HeartHandshakeIcon, 
			description: 'Human wellness, development, and health promotion',
			colorClass: 'bg-pink-50 dark:bg-pink-950 group-hover:bg-pink-100 dark:group-hover:bg-pink-900',
			borderColorClass: 'hover:border-pink-200 dark:hover:border-pink-800',
			iconColorClass: 'text-pink-600 dark:text-pink-400'
		},
		'legal studies': { 
			icon: ScaleIcon, 
			description: 'Law, justice systems, and legal principles',
			colorClass: 'bg-amber-50 dark:bg-amber-950 group-hover:bg-amber-100 dark:group-hover:bg-amber-900',
			borderColorClass: 'hover:border-amber-200 dark:hover:border-amber-800',
			iconColorClass: 'text-amber-600 dark:text-amber-400'
		},
		'literature': { 
			icon: PenToolIcon, 
			description: 'Literary works, themes, and creative expression',
			colorClass: 'bg-rose-50 dark:bg-rose-950 group-hover:bg-rose-100 dark:group-hover:bg-rose-900',
			borderColorClass: 'hover:border-rose-200 dark:hover:border-rose-800',
			iconColorClass: 'text-rose-600 dark:text-rose-400'
		},
		'mathematical methods': { 
			icon: CalculatorIcon, 
			description: 'Advanced mathematics including calculus and statistics',
			colorClass: 'bg-cyan-50 dark:bg-cyan-950 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900',
			borderColorClass: 'hover:border-cyan-200 dark:hover:border-cyan-800',
			iconColorClass: 'text-cyan-600 dark:text-cyan-400'
		},
		'physical education': { 
			icon: ActivityIcon, 
			description: 'Movement, sports science, and physical wellbeing',
			colorClass: 'bg-lime-50 dark:bg-lime-950 group-hover:bg-lime-100 dark:group-hover:bg-lime-900',
			borderColorClass: 'hover:border-lime-200 dark:hover:border-lime-800',
			iconColorClass: 'text-lime-600 dark:text-lime-400'
		},
		'physics': { 
			icon: AtomIcon, 
			description: 'Forces, energy, and the fundamental laws of nature',
			colorClass: 'bg-violet-50 dark:bg-violet-950 group-hover:bg-violet-100 dark:group-hover:bg-violet-900',
			borderColorClass: 'hover:border-violet-200 dark:hover:border-violet-800',
			iconColorClass: 'text-violet-600 dark:text-violet-400'
		},
		'psychology': { 
			icon: BrainIcon, 
			description: 'Human behavior, cognition, and mental processes',
			colorClass: 'bg-red-50 dark:bg-red-950 group-hover:bg-red-100 dark:group-hover:bg-red-900',
			borderColorClass: 'hover:border-red-200 dark:hover:border-red-800',
			iconColorClass: 'text-red-600 dark:text-red-400'
		},
		'specialist mathematics': { 
			icon: CalculatorIcon, 
			description: 'Advanced mathematical concepts for specialized applications',
			colorClass: 'bg-slate-50 dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-900',
			borderColorClass: 'hover:border-slate-200 dark:hover:border-slate-800',
			iconColorClass: 'text-slate-600 dark:text-slate-400'
		}
	};

	// Process database subjects and map them to display format
	const subjects = data.subjects.map((subject) => {
		// Create slug from name - remove VCE prefix and convert to kebab-case
		const nameWithoutVCE = subject.name.replace(/^VCE\s+/i, '').trim();
		
		// Get mapping info or use defaults
		const mapping = subjectMappings[nameWithoutVCE.toLowerCase()] || {
			icon: BookOpenIcon,
			description: 'Explore this subject area',
			colorClass: 'bg-gray-50 dark:bg-gray-950 group-hover:bg-gray-100 dark:group-hover:bg-gray-900',
			borderColorClass: 'hover:border-gray-200 dark:hover:border-gray-800',
			iconColorClass: 'text-gray-600 dark:text-gray-400'
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
				<Card.Root class="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 {subject.borderColorClass}" onclick={() => handleSubjectClick(subject.id)}>
					<Card.Content class="p-6 flex flex-col items-center text-center h-full">
						<div class="mb-4 p-4 rounded-full transition-colors {subject.colorClass}">
							<IconComponent class="w-8 h-8 {subject.iconColorClass}" />
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
