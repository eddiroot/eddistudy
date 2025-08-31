/* eslint-disable @typescript-eslint/no-explicit-any */
import { taskBlockTypeEnum } from "$lib/enums";


const criteriaItem = {
	type: 'object',
	properties: {
		description: { type: 'string' },
		marks: { type: 'number' }
	},
	required: ['description', 'marks']
};

const difficultyItem = {
	type: 'string',
	enum: ['beginner', 'intermediate', 'advanced'],
	description: 'Difficulty level for the task block'
};

const hintsItem = {
	type: 'array',
	items: { type: 'string' },
	minItems: 3,
	maxItems: 3,
	description: 'Array of exactly 3 progressive hints to help students'
};

const stepsItem = {
	type: 'array',
	items: { type: 'string' },
	minItems: 1,
	description: 'Array of step-by-step solution breakdown'
};

// Export the items for reuse
export { difficultyItem, hintsItem, stepsItem };


export const blockHeading = {
	type: 'object',
	properties: {
		type: { type: 'string', enum: [taskBlockTypeEnum.heading] },
		config: {
			type: 'object',
			properties: {
				text: { type: 'string' },
				size: { type: 'number' }
			},
			required: ['text', 'size']
		}
	},
	required: ['type', 'config']
};

export type BlockHeadingConfig = {
	text: string;
	size: number;
};

export const blockRichText = {
	type: 'object',
	properties: {
		type: { type: 'string', enum: [taskBlockTypeEnum.richText] },
		config: {
			type: 'object',
			properties: {
				html: { type: 'string' }
			},
			required: ['html']
		}
	},
	required: ['type', 'config']
};

export type BlockRichTextConfig = {
	html: string;
};

export const blockMathInput = {
	type: 'object',
	properties: {
		type: { type: 'string', enum: [taskBlockTypeEnum.mathInput] },
		config: {
			type: 'object',
			properties: {
				question: { type: 'string' },
				answer: { type: 'string' }
			},
			required: ['question', 'answer']
		},
		criteria: {
			type: 'array',
			items: criteriaItem,
			minItems: 1
		},
		marks: { type: 'number' }
	},
	required: ['type', 'config', 'criteria']
};

export type BlockMathInputConfig = {
	question: string;
	answer: string;
};

export type BlockMathInputResponse = {
	answer: string;
};

export const blockChoice = {
	type: 'object',
	properties: {
		type: { type: 'string', enum: [taskBlockTypeEnum.choice] },
		config: {
			type: 'object',
			properties: {
				question: { type: 'string' },
				options: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							text: { type: 'string' },
							isAnswer: { type: 'boolean' }
						},
						description:
							'Array of objects containing the choices and whether that choice is an answer. To make only a single answer valid, the array should contain only one item with isAnswer as true.'
					}
				}
			},
			required: ['question', 'options']
		},
		marks: { type: 'number' }
	},
	required: ['type', 'config']
};

export type BlockChoiceConfig = {
	question: string;
	options: {
		text: string;
		isAnswer: boolean;
	}[];
};

export type BlockChoiceResponse = {
	answers: string[];
};

export const blockFillBlank = {
	type: 'object',
	properties: {
		type: { type: 'string', enum: [taskBlockTypeEnum.fillBlank] },
		config: {
			type: 'object',
			properties: {
				sentence: { type: 'string' },
				answer: { type: 'string' }
			},
			required: ['sentence', 'answer']
		},
		marks: { type: 'number' }
	},
	required: ['type', 'config']
};

export type BlockFillBlankConfig = {
	sentence: string;
	answer: string;
};

export type BlockFillBlankResponse = {
	answer: string;
};

export const blockMatching = {
	type: 'object',
	properties: {
		type: { type: 'string', enum: [taskBlockTypeEnum.matching] },
		config: {
			type: 'object',
			properties: {
				instructions: { type: 'string' },
				pairs: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							left: { type: 'string' },
							right: { type: 'string' }
						},
						required: ['left', 'right']
					}
				}
			},
			required: ['instructions', 'pairs']
		},
		marks: { type: 'number' }
	},
	required: ['type', 'config']
};

export type BlockMatchingConfig = {
	instructions: string;
	pairs: { left: string; right: string }[];
};

export type BlockMatchingResponse = {
	matches: { left: string; right: string }[];
};

export const blockShortAnswer = {
	type: 'object',
	properties: {
		type: { type: 'string', enum: [taskBlockTypeEnum.shortAnswer] },
		config: {
			type: 'object',
			properties: {
				question: { type: 'string' }
			},
			required: ['question']
		},
		criteria: {
			type: 'array',
			items: criteriaItem,
			minItems: 1
		},
		marks: { type: 'number' }
	},
	required: ['type', 'config', 'criteria']
};

export type BlockShortAnswerConfig = {
	question: string;
};

export type BlockShortAnswerResponse = {
	answer: string;
};

export const blockWhiteboard = {
	type: 'object',
	properties: {
		type: { type: 'string', enum: [taskBlockTypeEnum.whiteboard] },
		config: {
			type: 'object',
			properties: {
				title: { type: 'string' },
				whiteboardId: { type: 'number', nullable: true }
			},
			required: ['data', 'width', 'height']
		},
		marks: { type: 'number' }
	},
	required: ['type', 'config']
};

export type BlockWhiteboardConfig = {
	title: string;
	whiteboardId: number | null;
};

export const taskBlocks = [
	blockHeading,
	blockRichText,
	blockMathInput,
	blockChoice,
	blockFillBlank,
	blockMatching,
	blockShortAnswer
];




export const interactiveBlockWithOptionals = (
    interactiveBlock: any,
    options: {
        includeHints?: boolean;
        includeDifficulty?: boolean;
        includeSteps?: boolean;
        makeRequired?: boolean;
    } = {}
) => {
    const {
        includeHints = true,
        includeDifficulty = true,
        includeSteps = true,
        makeRequired = true
    } = options;

    const additionalProperties: any = {};
    const additionalRequired: string[] = [];

    if (includeHints) {
        additionalProperties.hints = hintsItem;
        if (makeRequired) additionalRequired.push('hints');
    }

    if (includeDifficulty) {
        additionalProperties.difficulty = difficultyItem;
        if (makeRequired) additionalRequired.push('difficulty');
    }

    if (includeSteps) {
        additionalProperties.steps = stepsItem;
        if (makeRequired) additionalRequired.push('steps');
    }

    return {
        ...interactiveBlock,
        properties: {
            ...interactiveBlock.properties,
            ...additionalProperties
        },
        required: [...(interactiveBlock.required || []), ...additionalRequired]
    };
};

export function getBlockTypesForSubject(subjectType: string): any[] {
    const typeMap: Record<string, any[]> = {
      mathematics: [blockChoice, blockMathInput],
      science: [blockFillBlank, blockChoice, blockShortAnswer, blockFillBlank],
      english: [blockShortAnswer],
      default: [blockChoice, blockShortAnswer, blockMatching, blockFillBlank]
    };

    return typeMap[subjectType.toLowerCase()] || typeMap.default;
  }

 export function getInteractiveSchema(subjectType: string): any {
    const blockTypes = getBlockTypesForSubject(subjectType);

    // Use the interactiveBlockWithOptionals helper for consistent schema generation
    const interactiveBlockSchema = interactiveBlockWithOptionals({
      type: 'object',
      properties: {
        taskBlock: {
          anyOf: blockTypes
        }
      },
      required: ['taskBlock']
    }, {
      includeHints: true,
      includeDifficulty: true,
      includeSteps: true,
      makeRequired: true
    });

    return {
      type: 'object',
      properties: {
        interactiveBlocks: {
          type: 'array',
          items: interactiveBlockSchema,
          minItems: 1,
          maxItems: 5
        }
      },
      required: ['interactiveBlocks']
    };
  }


export const layoutTwoColumns = {
	type: 'object',
	properties: {
		type: { type: 'string', enum: ['col_2'] },
		config: {
			type: 'object',
			properties: {
				leftColumn: {
					type: 'array',
					items: {
						anyOf: taskBlocks
					}
				},
				rightColumn: {
					type: 'array',
					items: {
						anyOf: taskBlocks
					}
				}
			},
			required: ['leftColumn', 'rightColumn']
		}
	},
	required: ['type', 'config']
};

export const taskLayouts = [layoutTwoColumns];

// Combined schema for all task items (components + layouts)
export const taskBlocksAndLayouts = [...taskBlocks, ...taskLayouts];

export const taskSchema = {
	type: 'object',
	properties: {
		blocks: {
			type: 'array',
			items: {
				// TODO: Change to taskBlocksAndLayouts once layouts are implemented
				anyOf: taskBlocks
			}
		}
	},
	required: ['task']
};

// Union type for all possible block configs
export type BlockConfig =
	| BlockHeadingConfig
	| BlockRichTextConfig
	| BlockChoiceConfig
	| BlockFillBlankConfig
	| BlockMatchingConfig
	| BlockShortAnswerConfig
	| BlockWhiteboardConfig;

export type BlockResponse =
	| BlockChoiceResponse
	| BlockFillBlankResponse
	| BlockMatchingResponse
	| BlockShortAnswerResponse;

export type BlockProps<T extends BlockConfig = BlockConfig, Q extends BlockResponse = never> = {
	config: T;
	onConfigUpdate: (config: T) => Promise<void>;
	viewMode: ViewMode;
} & ([Q] extends [never]
	? object
	: {
			response: Q;
			onResponseUpdate: (response: Q) => Promise<void>;
		});

// Specific prop types for each block type
export type HeadingBlockProps = BlockProps<BlockHeadingConfig>;
export type RichTextBlockProps = BlockProps<BlockRichTextConfig>;
export type ChoiceBlockProps = BlockProps<BlockChoiceConfig, BlockChoiceResponse>;
export type FillBlankBlockProps = BlockProps<BlockFillBlankConfig, BlockFillBlankResponse>;
export type MatchingBlockProps = BlockProps<BlockMatchingConfig, BlockMatchingResponse>;
export type ShortAnswerBlockProps = BlockProps<BlockShortAnswerConfig, BlockShortAnswerResponse>;
export type WhiteboardBlockProps = BlockProps<BlockWhiteboardConfig>;

import HeadingOneIcon from '@lucide/svelte/icons/heading-1';
import HeadingTwoIcon from '@lucide/svelte/icons/heading-2';
import HeadingThreeIcon from '@lucide/svelte/icons/heading-3';
import HeadingFourIcon from '@lucide/svelte/icons/heading-4';
import HeadingFiveIcon from '@lucide/svelte/icons/heading-5';
import PilcrowIcon from '@lucide/svelte/icons/pilcrow';
import PresentationIcon from '@lucide/svelte/icons/presentation';
import List from '@lucide/svelte/icons/list';
import PenToolIcon from '@lucide/svelte/icons/pen-tool';
import LinkIcon from '@lucide/svelte/icons/link';
import type { Icon } from '@lucide/svelte';

export enum ViewMode {
	CONFIGURE = 'configure',
	ANSWER = 'answer',
	REVIEW = 'review',
	PRESENT = 'present'
}

export const blockTypes: {
	type: string;
	name: string;
	initialConfig: Record<string, unknown>;
	icon: typeof Icon;
}[] = [
	{
		type: taskBlockTypeEnum.heading,
		name: 'Heading 1',
		initialConfig: { text: 'Heading 1', size: 2 },
		icon: HeadingOneIcon
	},
	{
		type: taskBlockTypeEnum.heading,
		name: 'Heading 2',
		initialConfig: { text: 'Heading 2', size: 3 },
		icon: HeadingTwoIcon
	},
	{
		type: taskBlockTypeEnum.heading,
		name: 'Heading 3',
		initialConfig: { text: 'Heading 3', size: 4 },
		icon: HeadingThreeIcon
	},
	{
		type: taskBlockTypeEnum.heading,
		name: 'Heading 4',
		initialConfig: { text: 'Heading 4', size: 5 },
		icon: HeadingFourIcon
	},
	{
		type: taskBlockTypeEnum.heading,
		name: 'Heading 5',
		initialConfig: { text: 'Heading 5', size: 6 },
		icon: HeadingFiveIcon
	},
	{
		type: taskBlockTypeEnum.richText,
		name: 'Rich Text',
		initialConfig: { html: 'This is a rich text block' },
		icon: PilcrowIcon
	},
	{
		type: taskBlockTypeEnum.whiteboard,
		name: 'Whiteboard',
		initialConfig: { data: '', width: 800, height: 600 },
		icon: PresentationIcon
	},
	{
		type: taskBlockTypeEnum.choice,
		name: 'Multiple Choice',
		initialConfig: {
			question: 'Sample multiple choice question?',
			options: [
				{ text: 'Option 1', isAnswer: false },
				{ text: 'Option 2', isAnswer: true }
			]
		},
		icon: List
	},
	{
		type: taskBlockTypeEnum.fillBlank,
		name: 'Fill Blank',
		initialConfig: {
			sentence: 'Fill in the _____.',
			answer: 'answer'
		},
		icon: PenToolIcon
	},
	{
		type: taskBlockTypeEnum.shortAnswer,
		name: 'Short Answer',
		initialConfig: {
			question: 'Question'
		},
		icon: PenToolIcon
	},
	{
		type: taskBlockTypeEnum.matching,
		name: 'Matching Pairs',
		initialConfig: {
			instructions: 'Match the items on the left with the correct answers on the right.',
			pairs: [
				{ left: 'Item 1', right: 'Answer 1' },
				{ left: 'Item 2', right: 'Answer 2' }
			]
		},
		icon: LinkIcon
	}
];
