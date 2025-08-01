<script lang="ts">
	import * as Form from '$lib/components/ui/form/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { formSchema, type FormSchema } from './schema.js';
	import { type SuperValidated, type Infer, superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import { getResponseTypeDescription } from './utils.js';

	let {
		data,
		threadType,
		parentResponseId = undefined,
		parentAuthor = undefined,
		isReply = false,
		onSuccess = undefined,
		onCancel = undefined
	}: {
		data: { form: SuperValidated<Infer<FormSchema>> };
		threadType: string;
		parentResponseId?: number;
		parentAuthor?: string;
		isReply?: boolean;
		onSuccess?: () => void;
		onCancel?: () => void;
	} = $props();

	const form = superForm(data.form, {
		validators: zodClient(formSchema),
		resetForm: true,
		onUpdated: ({ form }) => {
			if (form.valid && isReply && onSuccess) {
				onSuccess();
			}
		},
		onResult: ({ result }) => {
			// Handle successful form submission for replies
			if (result.type === 'success' && isReply && onSuccess) {
				onSuccess();
			}
		}
	});

	const { form: formData, enhance } = form;
</script>

<div class={isReply ? 'mt-4 border-l-2 border-gray-200 pl-4' : 'mt-6 border-t pt-6'}>
	<div class="mb-4">
		<h3 class="text-lg font-semibold">
			{isReply ? `Reply to ${parentAuthor || 'comment'}` : 'Add a Response'}
		</h3>
		<p class="text-muted-foreground text-sm">
			{isReply
				? 'Respond to this comment or answer'
				: threadType === 'question' || threadType === 'qanda'
					? 'Help answer this question or add a comment'
					: 'Share your thoughts on this discussion'}
		</p>
	</div>
	<form method="POST" action="?/addResponse" class="space-y-4" use:enhance>
		<input type="hidden" name="parentResponseId" value={parentResponseId || ''} />
		<input type="hidden" name="type" value={$formData.type} />

		{#if (threadType === 'question' || threadType === 'qanda') && !isReply}
			<Form.Field {form} name="type">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Response Type</Form.Label>
						<Select.Root
							type="single"
							value={$formData.type}
							onValueChange={(value: string | undefined) => {
								if (value && (value === 'answer' || value === 'comment')) {
									$formData.type = value;
								}
							}}
						>
							<Select.Trigger {...props}>
								<div class="flex items-center gap-2">
									{#if $formData.type === 'answer'}
										<CheckCircle class="text-primary h-4 w-4" />
										Answer
									{:else}
										<MessageSquare class="text-primary h-4 w-4" />
										Comment
									{/if}
								</div>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="answer" label="Answer">
									<div class="flex items-center gap-2">
										<CheckCircle class="text-primary h-4 w-4" />
										<div class="flex flex-col">
											<span class="font-medium">Answer</span>
											<span class="text-muted-foreground text-xs">Provide a solution</span>
										</div>
									</div>
								</Select.Item>
								<Select.Item value="comment" label="Comment">
									<div class="flex items-center gap-2">
										<MessageSquare class="text-primary h-4 w-4" />
										<div class="flex flex-col">
											<span class="font-medium">Comment</span>
											<span class="text-muted-foreground text-xs">Ask or discuss</span>
										</div>
									</div>
								</Select.Item>
							</Select.Content>
						</Select.Root>
					{/snippet}
				</Form.Control>
				<Form.Description>{getResponseTypeDescription($formData.type)}</Form.Description>
				<Form.FieldErrors />
			</Form.Field>
		{/if}

		<Form.Field {form} name="content">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>
						{$formData.type === 'answer' ? 'Your Answer' : 'Your Comment'}
					</Form.Label>
					<Textarea
						{...props}
						bind:value={$formData.content}
						placeholder={`Write your ${$formData.type} here...`}
						class="min-h-24"
					/>
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<div class="flex justify-end gap-2">
			{#if isReply && onCancel}
				<Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
			{/if}
			<Button type="submit" class="flex items-center gap-2">
				{#if isReply}
					<MessageSquare class="h-4 w-4" />
					Post Reply
				{:else if $formData.type === 'answer'}
					<CheckCircle class="h-4 w-4" />
					Post Answer
				{:else}
					<MessageSquare class="h-4 w-4" />
					Post Comment
				{/if}
			</Button>
		</div>
	</form>
</div>
