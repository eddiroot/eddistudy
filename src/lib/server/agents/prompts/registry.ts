/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PromptTemplate {
  id: string;
  name: string;
  category: PromptCategory;
  template: string;
  variables: PromptVariable[];
  examples?: PromptExample[];
  constraints?: string[];
  responseSchema?: any; // JSON schema for Gemini make a type 
  chainable?: boolean; // Can be chained with other prompts
  tags?: string[]; // For retrieval
}

export enum PromptCategory {
  MODULE_SCAFFOLD = 'module_scaffold',
  CONTENT_GENERATION = 'content_generation',
  INTERACTIVE_GENERATION = 'interactive_generation',
  HINT_GENERATION = 'hint_generation',
  EVALUATION = 'evaluation',
  FEEDBACK = 'feedback',
  QUESTION_SELECTION = 'question_selection'
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'array' | 'object';
  required: boolean;
  description?: string;
  defaultValue?: any;
}

export interface PromptExample {
  input: Record<string, any>;
  output: string;
  explanation?: string;
}

export class PromptRegistry {
  private static prompts = new Map<string, PromptTemplate>();
  private static promptsByCategory = new Map<PromptCategory, Set<string>>();
  private static promptChains = new Map<string, string[]>();

  static {
    this.initializePrompts();
  }

  private static initializePrompts() {
    // Module Generation Prompts
    this.registerPrompt({
      id: 'module_scaffold_generator',
      name: 'Module Scaffold Generator',
      category: PromptCategory.MODULE_SCAFFOLD,
      template: `
Act as an expert VCE curriculum designer implementing research-based learning principles.

CONTEXT:
Title: {title}
Description: {description}
Learning Areas: {learningAreas}
Key Knowledge: {keyKnowledge}
Key Skills: {keySkills}

TASK:
Design a module structure following the testing effect and spaced repetition principles:

1. Identify 3-5 distinct learning objectives that build progressively
2. For each objective, determine:
   - Prerequisite knowledge required
   - Core concepts to teach
   - Skills to develop
   - Appropriate difficulty progression

3. Plan retrieval practice opportunities:
   - Immediate self-testing after each concept
   - Spaced review questions
   - Mixed practice problems

4. Structure should support:
   - Active recall over passive review
   - Interleaved practice
   - Progressive difficulty

CONSTRAINTS:
- Each section: 10-15 minutes of focused learning
- Include 2-3 retrieval practice points per section
- Balance conceptual understanding with skill application
`,
      variables: [
        { name: 'title', type: 'string', required: true },
        { name: 'description', type: 'string', required: true },
        { name: 'learningAreas', type: 'array', required: false },
        { name: 'keyKnowledge', type: 'array', required: false },
        { name: 'keySkills', type: 'array', required: false }
      ],
      responseSchema: {
        type: 'object',
        properties: {
          overallObjective: { type: 'string' },
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                objective: { type: 'string' },
                concepts: { type: 'array', items: { type: 'string' } },
                skills: { type: 'array', items: { type: 'string' } },
                estimatedTime: { type: 'number' },
              }
            }
          }
        }
      },
      chainable: true,
      tags: ['module', 'scaffold', 'structure']
    });

    this.registerPrompt({
      id: 'interactive_block_generator',
      name: 'Interactive Block Generator with Testing Effect',
      category: PromptCategory.INTERACTIVE_GENERATION,
      template: `
Generate interactive learning components optimized for retention through testing.

SECTION CONTEXT:
{sectionContent}

CURRICULUM ALIGNMENT:
{curriculumContext}

PREVIOUS STUDENT ERRORS (for targeted practice):
{commonMisconceptions}

TASK:
Create {numberOfBlocks} interactive blocks that:

1. Test understanding immediately after learning (testing effect)
2. Include progressive hints that scaffold learning
3. Provide detailed feedback for incorrect responses
4. Target common misconceptions

For each block include:
- Clear success criteria aligned to curriculum
- 3 levels of hints (conceptual → procedural → specific)
- Step-by-step solution
- Explanation of why incorrect options are wrong

BLOCK TYPES TO USE:
{availableBlockTypes}

DIFFICULTY PROGRESSION:
Start with recognition → comprehension → application → analysis
`,
      variables: [
        { name: 'sectionContent', type: 'string', required: true },
        { name: 'curriculumContext', type: 'string', required: true },
        { name: 'commonMisconceptions', type: 'array', required: false },
        { name: 'numberOfBlocks', type: 'number', required: true },
        { name: 'availableBlockTypes', type: 'array', required: true }
      ],
      tags: ['interactive', 'testing', 'practice']
    });
    this.registerPrompt({
      id: 'adaptive_hint_provider',
      name: 'Adaptive Hint Provider',
      category: PromptCategory.HINT_GENERATION,
      template: `
Provide a scaffolded hint based on the student's current attempt.

QUESTION:
{question}

STUDENT'S ANSWER:
{studentAnswer}

CORRECT ANSWER:
{correctAnswer}

ATTEMPT NUMBER: {attemptNumber}
PREVIOUS HINTS GIVEN: {previousHints}

HINT LEVEL GUIDE:
- Level 1 (Attempt 1): Conceptual nudge - redirect attention
- Level 2 (Attempt 2): Strategic hint - suggest approach
- Level 3 (Attempt 3): Procedural guidance - break down steps

Generate a hint that:
1. Doesn't give away the answer
2. Builds on previous hints
3. Addresses the specific error pattern
4. Encourages metacognition

If student shows frustration (3+ attempts), provide encouragement and smaller steps.
`,
      variables: [
        { name: 'question', type: 'string', required: true },
        { name: 'studentAnswer', type: 'string', required: false },
        { name: 'correctAnswer', type: 'string', required: true },
        { name: 'attemptNumber', type: 'number', required: true },
        { name: 'previousHints', type: 'array', required: false }
      ],
      tags: ['hint', 'scaffold', 'adaptive']
    });
    /**
     * Mainly for when there is no previous hint
     */
    this.registerPrompt({
      id: 'response_evaluator',
      name: 'Response Evaluator with Feedback',
      category: PromptCategory.EVALUATION,
      template: `
Evaluate the student's response and provide constructive feedback.

TASK BLOCK:
Type: {blockType}
Question: {question}
Criteria: {criteria}

STUDENT RESPONSE:
{studentResponse}

MODEL ANSWER:
{modelAnswer}

RUBRIC:
{rubric}

EVALUATION REQUIREMENTS:
1. Score against each criterion
2. Identify strengths in the response
3. Pinpoint specific misconceptions
4. Suggest targeted improvements
5. Determine mastery level

Consider partial credit for:
- Correct approach with calculation errors
- Partial understanding
- Related but incomplete concepts

FEEDBACK TONE:
- Encouraging and constructive
- Specific and actionable
- Growth-minded
`,
      variables: [
        { name: 'blockType', type: 'string', required: true },
        { name: 'question', type: 'string', required: true },
        { name: 'criteria', type: 'array', required: false },
        { name: 'studentResponse', type: 'object', required: true },
        { name: 'modelAnswer', type: 'object', required: false },
        { name: 'rubric', type: 'object', required: false }
      ],
      responseSchema: {
        type: 'object',
        properties: {
          score: { type: 'number' },
          maxScore: { type: 'number' },
          criteriaScores: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                criterion: { type: 'string' },
                score: { type: 'number' },
                maxScore: { type: 'number' },
                feedback: { type: 'string' }
              }
            }
          },
          strengths: { type: 'array', items: { type: 'string' } },
          misconceptions: { type: 'array', items: { type: 'string' } },
          improvements: { type: 'array', items: { type: 'string' } },
          masteryLevel: { type: 'string', enum: ['not_started', 'developing', 'proficient', 'advanced'] }
        }
      },
      tags: ['evaluation', 'feedback', 'assessment']
    });

    this.registerPrompt({
      id: 'adaptive_question_selector',
      name: 'Adaptive Question Selector',
      category: PromptCategory.QUESTION_SELECTION,
      template: `
Select the next question based on student performance.

STUDENT PERFORMANCE:
Recent Responses: {recentResponses}
Current Difficulty: {currentDifficulty}
Struggling Concepts: {strugglingConcepts}
Mastered Concepts: {masteredConcepts}
Time in Session: {sessionTime}

AVAILABLE QUESTIONS:
{availableQuestions}

SELECTION CRITERIA:
1. If student succeeded → increase difficulty or introduce new concept
2. If student struggled → provide similar difficulty with different context
3. If multiple failures → step back to prerequisite concepts
4. Mix review questions (spaced repetition) with new material

Consider:
- Cognitive load (avoid overwhelming)
- Interleaving different concepts
- Building confidence with occasional easier questions
- Testing effect: prioritize retrieval over repetition

Return the question ID that best matches the student's current needs.
`,
      variables: [
        { name: 'recentResponses', type: 'array', required: true },
        { name: 'currentDifficulty', type: 'string', required: true },
        { name: 'strugglingConcepts', type: 'array', required: true },
        { name: 'masteredConcepts', type: 'array', required: true },
        { name: 'sessionTime', type: 'number', required: true },
        { name: 'availableQuestions', type: 'array', required: true }
      ],
      tags: ['adaptive', 'selection', 'personalization']
    });
  }

  static registerPrompt(prompt: PromptTemplate): void {
    this.prompts.set(prompt.id, prompt);
    
    if (!this.promptsByCategory.has(prompt.category)) {
      this.promptsByCategory.set(prompt.category, new Set());
    }
    this.promptsByCategory.get(prompt.category)!.add(prompt.id);
  }

  static getPrompt(id: string): PromptTemplate | undefined {
    return this.prompts.get(id);
  }

  static getPromptsByCategory(category: PromptCategory): PromptTemplate[] {
    const ids = this.promptsByCategory.get(category) || new Set();
    return Array.from(ids).map(id => this.prompts.get(id)!).filter(Boolean);
  }

  static fillPrompt(
    promptId: string,
    variables: Record<string, any>,
    ragContext?: any
  ): string {
    const prompt = this.getPrompt(promptId);
    if (!prompt) throw new Error(`Prompt ${promptId} not found`);

    let filled = prompt.template;

    // Add RAG context if provided
    if (ragContext) {
      filled = `
RETRIEVED CONTEXT:
${JSON.stringify(ragContext, null, 2)}

${filled}`;
    }

    // Fill variables
    for (const variable of prompt.variables) {
      const value = variables[variable.name] ?? variable.defaultValue;
      if (variable.required && value === undefined) {
        throw new Error(`Required variable ${variable.name} not provided`);
      }
      
      const formattedValue = typeof value === 'object' 
        ? JSON.stringify(value, null, 2)
        : String(value);
      
      filled = filled.replace(
        new RegExp(`{${variable.name}}`, 'g'),
        formattedValue
      );
    }

    return filled;
  }

  static createPromptChain(
    promptIds: string[],
    variables: Record<string, any>[]
  ): string[] {
    return promptIds.map((id, index) => 
      this.fillPrompt(id, variables[index] || {})
    );
  }
}