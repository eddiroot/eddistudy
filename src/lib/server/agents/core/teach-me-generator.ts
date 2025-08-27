/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseAgent, type AgentContext, type AgentResponse, AgentType } from '../index';
import { PromptRegistry } from '../prompts/registry';
import { EducationalVectorStore } from '../retrieval/vector-store';
import { geminiCompletion } from '$lib/server/ai';
import * as blockSchemas from '../../../schemas/blockSchema';

export class TeachModuleGeneratorAgent extends BaseAgent {
  private vectorStore: EducationalVectorStore;

  constructor() {
    super({
      type: AgentType.TEACH_MODULE_GENERATOR,
      systemInstruction: `You are an expert VCE curriculum designer who creates engaging, 
research-based learning modules that leverage the testing effect and spaced repetition 
for optimal learning outcomes.`,
      temperature: 0.7,
      maxTokens: 4000
    });
    
    this.vectorStore = new EducationalVectorStore();
  }

  async execute(context: AgentContext): Promise<AgentResponse> {
    const { action, moduleParams } = context.metadata;

    switch (action) {
      case 'generate_scaffold':
        return await this.generateScaffold(moduleParams);
      case 'generate_content':
        return await this.generateContent(moduleParams);
      case 'generate_interactive':
        return await this.generateInteractive(moduleParams);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async generateScaffold(params: any): Promise<AgentResponse> {
    // Initialize vector store for the subject
    if (params.subjectId) {
      await this.vectorStore.initialize(params.subjectId);
    }

    // Retrieve relevant curriculum context
    const curriculumContext = await this.vectorStore.hybridSearch(
      `${params.title} ${params.description}`,
      {
        collections: ['curriculum_contents'],
        subjectId: params.subjectId,
        k: 10
      }
    );

    // Get the prompt template
    const promptTemplate = PromptRegistry.getPrompt('module_scaffold_generator')!;
    
    // Fill the prompt with context
    const prompt = PromptRegistry.fillPrompt(
      'module_scaffold_generator',
      {
        title: params.title,
        description: params.description,
        learningAreas: params.learningAreaIds,
        keyKnowledge: params.keyKnowledgeIds,
        keySkills: params.keySkillIds
      },
      curriculumContext
    );

    // Generate with Gemini
    const response = await geminiCompletion(
      prompt,
      undefined, // no media file
      promptTemplate.responseSchema,
      this.getSystemInstruction()
    );

    const scaffold = JSON.parse(response);

    return {
      content: JSON.stringify(scaffold),
      metadata: {
        stage: 'scaffold',
        sectionsGenerated: scaffold.sections.length
      },
      sources: curriculumContext
    };
  }

  private async generateContent(params: any): Promise<AgentResponse> {
    const { section, subjectId } = params;

    // Initialize vector store for the subject
    if (subjectId) {
      await this.vectorStore.initialize(subjectId);
    }

    // Get relevant examples and content
    const examples = await this.vectorStore.hybridSearch(
      section.concepts.join(' '),
      {
        collections: ['detailed_examples', 'curriculum_contents', 'learning_activities'],
        subjectId: subjectId,
        k: 6
      }
    );

    const prompt = `
Generate comprehensive learning content for: ${section.title}

Learning Objective: ${section.objective}
Concepts to Cover: ${section.concepts.join(', ')}

EXAMPLES TO REFERENCE:
${examples.map((e: any) => e.content).join('\n\n')}

Create engaging explanatory content that:
1. Builds on prerequisites
2. Uses clear examples
3. Includes visual descriptions where helpful
4. Prepares for immediate self-testing
`;

    const contentSchema = {
      type: 'object',
      properties: {
        blocks: {
          type: 'array',
          items: {
            anyOf: [
              blockSchemas.blockHeading,
              blockSchemas.blockRichText,
            ]
          }
        }
      }
    };

    const response = await geminiCompletion(
      prompt,
      undefined, // no media file
      contentSchema,
      this.getSystemInstruction()
    );

    return {
      content: response,
      metadata: {
        stage: 'content',
        blocksGenerated: JSON.parse(response).blocks.length
      },
      sources: examples
    };
  }

  private async generateInteractive(params: any): Promise<AgentResponse> {
    const { section, sectionContent, subjectType, subjectId } = params;

    // Initialize vector store for the subject
    if (subjectId) {
      await this.vectorStore.initialize(subjectId);
    }

    // Find similar exam questions
    const similarQuestions = await this.vectorStore.hybridSearch(
      section.concepts.join(' '),
      {
        collections: ['exam_questions', 'assessment_tasks'],
        subjectId: subjectId,
        k: 5
      }
    );

    // Get common misconceptions to target
    const misconceptions = await this.vectorStore.findCommonMisconceptions(
      section.concepts[0],
      undefined,
      3
    );

    // Select appropriate block types based on subject
    const blockTypes = blockSchemas.getBlockTypesForSubject(subjectType);

    const prompt = PromptRegistry.fillPrompt(
      'interactive_block_generator',
      {
        sectionContent: sectionContent,
        curriculumContext: section,
        commonMisconceptions: misconceptions.map((m: any) => m.content),
        numberOfBlocks: 4,
        availableBlockTypes: blockTypes
      },
      similarQuestions
    );

    // Get appropriate schemas for the subject
    const responseSchema = this.getInteractiveSchema(subjectType);

    const response = await geminiCompletion(
      prompt,
      undefined, // no media file
      responseSchema,
      this.getSystemInstruction()
    );

    const blocks = JSON.parse(response);

    // Store generated blocks for future retrieval
    await this.storeGeneratedBlocks(blocks, params);

    return {
      content: response,
      metadata: {
        stage: 'interactive',
        blocksGenerated: blocks.interactiveBlocks.length,
        blockTypes: blocks.interactiveBlocks.map((b: any) => b.taskBlock.type)
      },
      sources: [...similarQuestions, ...misconceptions]
    };
  }


  private getInteractiveSchema(subjectType: string): any {
    const blockTypes = blockSchemas.getBlockTypesForSubject(subjectType);

    // Use the interactiveBlockWithOptionals helper for consistent schema generation
    const interactiveBlockSchema = blockSchemas.interactiveBlockWithOptionals({
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

  private async storeGeneratedBlocks(blocks: any, params: any): Promise<void> {
    // Store generated questions for future retrieval
    for (const block of blocks.interactiveBlocks) {
      const question = this.extractQuestionFromBlock(block.taskBlock);
      if (question) {
        await this.vectorStore.storeQuestion(
          question,
          params.moduleId || 0,
          block.taskBlock.id || 0,
          params.section.concepts.join(', '),
          params.subjectId
        );
      }
    }
  }

  private extractQuestionFromBlock(taskBlock: any): string | null {
    // Extract question text based on block type
    if (taskBlock.config?.question) {
      return taskBlock.config.question;
    }
    if (taskBlock.config?.instructions) {
      return taskBlock.config.instructions;
    }
    if (taskBlock.config?.sentence) {
      return taskBlock.config.sentence;
    }
    return null;
  }
}