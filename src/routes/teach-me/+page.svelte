<script>
	import * as Card from '$lib/components/ui/card';
	import Button from '$lib/components/ui/button/button.svelte';
	import { goto } from '$app/navigation';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	
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

	// Define all VCE subjects with their metadata
	const subjects = [
		{
			id: 'accounting',
			name: 'Accounting',
			description: 'Learn financial management, budgeting, and business reporting',
			icon: DollarSignIcon,
			color: 'emerald'
		},
		{
			id: 'biology',
			name: 'Biology',
			description: 'Explore life sciences, genetics, and ecological systems',
			icon: FlaskConicalIcon,
			color: 'green'
		},
		{
			id: 'business-management',
			name: 'Business Management',
			description: 'Understand enterprise operations, leadership, and strategy',
			icon: TrendingUpIcon,
			color: 'blue'
		},
		{
			id: 'chemistry',
			name: 'Chemistry',
			description: 'Master chemical reactions, molecular structures, and analysis',
			icon: AtomIcon,
			color: 'purple'
		},
		{
			id: 'economics',
			name: 'Economics',
			description: 'Study market forces, financial systems, and economic theory',
			icon: PieChartIcon,
			color: 'orange'
		},
		{
			id: 'english',
			name: 'English',
			description: 'Develop critical analysis, writing, and communication skills',
			icon: BookOpenIcon,
			color: 'red'
		},
		{
			id: 'general-mathematics',
			name: 'General Mathematics',
			description: 'Learn practical mathematics for everyday applications',
			icon: CalculatorIcon,
			color: 'indigo'
		},
		{
			id: 'health-and-human-development',
			name: 'Health and Human Development',
			description: 'Study human wellness, development, and health promotion',
			icon: HeartHandshakeIcon,
			color: 'pink'
		},
		{
			id: 'legal-studies',
			name: 'Legal Studies',
			description: 'Explore law, justice systems, and legal principles',
			icon: ScaleIcon,
			color: 'slate'
		},
		{
			id: 'literature',
			name: 'Literature',
			description: 'Analyze literary works, themes, and creative expression',
			icon: PenToolIcon,
			color: 'amber'
		},
		{
			id: 'mathematical-methods',
			name: 'Mathematical Methods',
			description: 'Advanced mathematics including calculus and statistics',
			icon: CalculatorIcon,
			color: 'violet'
		},
		{
			id: 'physical-education',
			name: 'Physical Education',
			description: 'Study movement, sports science, and physical wellbeing',
			icon: ActivityIcon,
			color: 'cyan'
		},
		{
			id: 'physics',
			name: 'Physics',
			description: 'Understand forces, energy, and the fundamental laws of nature',
			icon: AtomIcon,
			color: 'sky'
		},
		{
			id: 'psychology',
			name: 'Psychology',
			description: 'Explore human behavior, cognition, and mental processes',
			icon: BrainIcon,
			color: 'rose'
		},
		{
			id: 'specialist-mathematics',
			name: 'Specialist Mathematics',
			description: 'Advanced mathematical concepts for specialized applications',
			icon: CalculatorIcon,
			color: 'teal'
		}
	];

	// Color mapping for Tailwind classes
	const colorClasses = {
		emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950', hover: 'group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900', icon: 'text-emerald-600 dark:text-emerald-400', border: 'hover:border-emerald-200 dark:hover:border-emerald-800' },
		green: { bg: 'bg-green-50 dark:bg-green-950', hover: 'group-hover:bg-green-100 dark:group-hover:bg-green-900', icon: 'text-green-600 dark:text-green-400', border: 'hover:border-green-200 dark:hover:border-green-800' },
		blue: { bg: 'bg-blue-50 dark:bg-blue-950', hover: 'group-hover:bg-blue-100 dark:group-hover:bg-blue-900', icon: 'text-blue-600 dark:text-blue-400', border: 'hover:border-blue-200 dark:hover:border-blue-800' },
		purple: { bg: 'bg-purple-50 dark:bg-purple-950', hover: 'group-hover:bg-purple-100 dark:group-hover:bg-purple-900', icon: 'text-purple-600 dark:text-purple-400', border: 'hover:border-purple-200 dark:hover:border-purple-800' },
		orange: { bg: 'bg-orange-50 dark:bg-orange-950', hover: 'group-hover:bg-orange-100 dark:group-hover:bg-orange-900', icon: 'text-orange-600 dark:text-orange-400', border: 'hover:border-orange-200 dark:hover:border-orange-800' },
		red: { bg: 'bg-red-50 dark:bg-red-950', hover: 'group-hover:bg-red-100 dark:group-hover:bg-red-900', icon: 'text-red-600 dark:text-red-400', border: 'hover:border-red-200 dark:hover:border-red-800' },
		indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950', hover: 'group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900', icon: 'text-indigo-600 dark:text-indigo-400', border: 'hover:border-indigo-200 dark:hover:border-indigo-800' },
		pink: { bg: 'bg-pink-50 dark:bg-pink-950', hover: 'group-hover:bg-pink-100 dark:group-hover:bg-pink-900', icon: 'text-pink-600 dark:text-pink-400', border: 'hover:border-pink-200 dark:hover:border-pink-800' },
		slate: { bg: 'bg-slate-50 dark:bg-slate-950', hover: 'group-hover:bg-slate-100 dark:group-hover:bg-slate-900', icon: 'text-slate-600 dark:text-slate-400', border: 'hover:border-slate-200 dark:hover:border-slate-800' },
		amber: { bg: 'bg-amber-50 dark:bg-amber-950', hover: 'group-hover:bg-amber-100 dark:group-hover:bg-amber-900', icon: 'text-amber-600 dark:text-amber-400', border: 'hover:border-amber-200 dark:hover:border-amber-800' },
		violet: { bg: 'bg-violet-50 dark:bg-violet-950', hover: 'group-hover:bg-violet-100 dark:group-hover:bg-violet-900', icon: 'text-violet-600 dark:text-violet-400', border: 'hover:border-violet-200 dark:hover:border-violet-800' },
		cyan: { bg: 'bg-cyan-50 dark:bg-cyan-950', hover: 'group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900', icon: 'text-cyan-600 dark:text-cyan-400', border: 'hover:border-cyan-200 dark:hover:border-cyan-800' },
		sky: { bg: 'bg-sky-50 dark:bg-sky-950', hover: 'group-hover:bg-sky-100 dark:group-hover:bg-sky-900', icon: 'text-sky-600 dark:text-sky-400', border: 'hover:border-sky-200 dark:hover:border-sky-800' },
		rose: { bg: 'bg-rose-50 dark:bg-rose-950', hover: 'group-hover:bg-rose-100 dark:group-hover:bg-rose-900', icon: 'text-rose-600 dark:text-rose-400', border: 'hover:border-rose-200 dark:hover:border-rose-800' },
		teal: { bg: 'bg-teal-50 dark:bg-teal-950', hover: 'group-hover:bg-teal-100 dark:group-hover:bg-teal-900', icon: 'text-teal-600 dark:text-teal-400', border: 'hover:border-teal-200 dark:hover:border-teal-800' }
	};

	function handleSubjectClick(subjectId) {
		// Navigate to the specific subject page
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
					class="absolute left-0 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				>
					<ChevronLeftIcon class="w-6 h-6 text-gray-600 dark:text-gray-400" />
				</button>
				<h1 class="text-5xl md:text-6xl font-light text-gray-900 dark:text-gray-100 tracking-tight">
					Teach me
				</h1>
			</div>
			<p class="text-xl text-gray-600 dark:text-gray-400 font-light max-w-3xl mx-auto">
				Choose from our comprehensive VCE subjects and start your learning journey with interactive lessons and expert content.
			</p>
		</div>

		<!-- Subjects Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 max-w-[90rem] mx-auto">
			{#each subjects as subject}
				{@const colors = colorClasses[subject.color]}
				<Card.Root class="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 {colors.border}" onclick={() => handleSubjectClick(subject.id)}>
					<Card.Content class="p-6 flex flex-col items-center text-center h-full">
						<div class="mb-4 p-4 rounded-full {colors.bg} {colors.hover} transition-colors">
							<svelte:component this={subject.icon} class="w-8 h-8 {colors.icon}" />
						</div>
						<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
							{subject.name}
						</h3>
						<p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex-1">
							{subject.description}
						</p>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<!-- Call to Action -->
		<div class="text-center mt-16">
			<p class="text-gray-600 dark:text-gray-400 mb-6">
				Can't find what you're looking for? <a href="/contact" class="text-blue-600 dark:text-blue-400 hover:underline">Contact us</a> for more information.
			</p>
		</div>
	</div>
</div>
