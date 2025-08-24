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

export const blockGraphPlot = {
    type: 'object',
    properties: {
        type: { type: 'string', enum: ['graph_plot'] },
        config: {
            type: 'object',
            properties: {
                question: { type: 'string' },
                xLabel: { type: 'string' },
                yLabel: { type: 'string' },
                gridSize: { type: 'number', default: 20 },
                expectedPoints: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            x: { type: 'number' },
                            y: { type: 'number' }
                        }
                    }
                }
            },
            required: ['question', 'xLabel', 'yLabel', 'expectedPoints']
        },
        criteria: {
            type: 'array',
            items: criteriaItem,
            minItems: 1
        },
        marks: { type: 'number' }
    },
    required: ['type', 'config', 'criteria', 'marks']
};

export const blockFormulaInput = {
    type: 'object',
    properties: {
        type: { type: 'string', enum: ['formula_input'] },
        config: {
            type: 'object',
            properties: {
                question: { type: 'string' },
                variables: {
                    type: 'array',
                    items: { type: 'string' }
                },
                expectedFormula: { type: 'string' },
                acceptedVariants: {
                    type: 'array',
                    items: { type: 'string' }
                }
            },
            required: ['question', 'variables', 'expectedFormula']
        },
        criteria: {
            type: 'array',
            items: criteriaItem,
            minItems: 1
        },
        marks: { type: 'number' }
    },
    required: ['type', 'config', 'criteria', 'marks']
};

export const blockTableInput = {
    type: 'object',
    properties: {
        type: { type: 'string', enum: ['table_input'] },
        config: {
            type: 'object',
            properties: {
                question: { type: 'string' },
                headers: {
                    type: 'array',
                    items: { type: 'string' }
                },
                rows: { type: 'number' },
                expectedValues: {
                    type: 'array',
                    items: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                }
            },
            required: ['question', 'headers', 'rows', 'expectedValues']
        },
        marks: { type: 'number' }
    },
    required: ['type', 'config', 'marks']
};

export const blockInteractiveDiagram = {
    type: 'object',
    properties: {
        type: { type: 'string', enum: ['interactive_diagram'] },
        config: {
            type: 'object',
            properties: {
                question: { type: 'string' },
                imageUrl: { type: 'string' },
                hotspots: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            x: { type: 'number' },
                            y: { type: 'number' },
                            label: { type: 'string' },
                            correctLabel: { type: 'string' }
                        }
                    }
                }
            },
            required: ['question', 'imageUrl', 'hotspots']
        },
        marks: { type: 'number' }
    },
    required: ['type', 'config', 'marks']
};

export const blockImageAnnotation = {
    type: 'object',
    properties: {
        type: { type: 'string', enum: ['image_annotation'] },
        config: {
            type: 'object',
            properties: {
                question: { type: 'string' },
                imageUrl: { type: 'string' },
                annotations: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', enum: ['circle', 'arrow', 'text'] },
                            x: { type: 'number' },
                            y: { type: 'number' },
                            label: { type: 'string' }
                        }
                    }
                }
            },
            required: ['question', 'imageUrl']
        },
        marks: { type: 'number' }
    },
    required: ['type', 'config', 'marks']
};

export const blockTextHighlight = {
    type: 'object',
    properties: {
        type: { type: 'string', enum: ['text_highlight'] },
        config: {
            type: 'object',
            properties: {
                question: { type: 'string' },
                passage: { type: 'string' },
                expectedHighlights: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            start: { type: 'number' },
                            end: { type: 'number' },
                            category: { type: 'string' }
                        }
                    }
                }
            },
            required: ['question', 'passage', 'expectedHighlights']
        },
        marks: { type: 'number' }
    },
    required: ['type', 'config', 'marks']
};

export const blockQuoteMatching = {
    type: 'object',
    properties: {
        type: { type: 'string', enum: ['quote_matching'] },
        config: {
            type: 'object',
            properties: {
                question: { type: 'string' },
                quotes: {
                    type: 'array',
                    items: { type: 'string' }
                },
                sources: {
                    type: 'array',
                    items: { type: 'string' }
                },
                correctPairs: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            quoteIndex: { type: 'number' },
                            sourceIndex: { type: 'number' }
                        }
                    }
                }
            },
            required: ['question', 'quotes', 'sources', 'correctPairs']
        },
        marks: { type: 'number' }
    },
    required: ['type', 'config', 'marks']
};

export const blockFillSentence = {
    type: 'object',
    properties: {
        type: { type: 'string', enum: ['fill_sentence'] },
        config: {
            type: 'object',
            properties: {
                question: { type: 'string' },
                paragraph: { type: 'string' },
                blanks: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            position: { type: 'number' },
                            answer: { type: 'string' },
                            options: {
                                type: 'array',
                                items: { type: 'string' }
                            }
                        }
                    }
                }
            },
            required: ['question', 'paragraph', 'blanks']
        },
        marks: { type: 'number' }
    },
    required: ['type', 'config', 'marks']
};


// All interactive blocks for schema validation
export const allInteractiveBlocks = [
    blockGraphPlot,
    blockFormulaInput,
    blockTableInput,
    blockInteractiveDiagram,
    blockImageAnnotation,
    blockTextHighlight,
    blockQuoteMatching,
    blockFillSentence
];

export const taskBlocks = [
	blockHeading,
	blockRichText,
	blockMathInput,
	blockChoice,
	blockFillBlank,
	blockMatching,
	blockShortAnswer,
	blockGraphPlot,
    blockFormulaInput,
    blockTableInput,
    blockInteractiveDiagram,
    blockImageAnnotation,
    blockTextHighlight,
    blockQuoteMatching,
    blockFillSentence
];

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

// Interactive Blocks
export const InteractiveBlocks = [
	blockMathInput,
	blockChoice,
	blockFillBlank,
	blockMatching,
	blockShortAnswer,
	blockGraphPlot,
    blockFormulaInput,
    blockTableInput,
    blockInteractiveDiagram,
    blockImageAnnotation,
    blockTextHighlight,
    blockQuoteMatching,
    blockFillSentence
];

// Original task schema for basic task blocks
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
	required: ['blocks']
};

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
      mathematics: [blockGraphPlot, blockFormulaInput, blockTableInput, blockChoice, blockMathInput],
      science: [blockInteractiveDiagram, blockImageAnnotation, blockFormulaInput, blockFillBlank],
      english: [blockTextHighlight, blockQuoteMatching, blockFillSentence, blockShortAnswer],
      default: [blockChoice, blockShortAnswer, blockMatching, blockFillBlank]
    };

    return typeMap[subjectType.toLowerCase()] || typeMap.default;
  }