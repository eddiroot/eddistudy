/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseAgent, type AgentContext, type AgentResponse, AgentType } from '../index';
import { PromptRegistry } from '../prompts/registry';
import { EducationalVectorStore } from '../retrieval/vector-store';
import { SessionManager } from '../memory/session-manager';
import { geminiCompletion } from '$lib/server/ai';

export class LearningTutorAgent extends BaseAgent {
  private vectorStore: EducationalVectorStore;
  private sessionManager: SessionManager;

  constructor() {
    super({
      type: AgentType.LEARNING_TUTOR,
      systemInstruction: `You are an expert educational tutor who provides personalized 
guidance, scaffolded hints, and constructive feedback. You adapt to each student's 
needs and learning pace while maintaining high expectations.`,
      temperature: 0.5,
      maxTokens: 1000
    });
    
    this.vectorStore = new EducationalVectorStore();
    this.sessionManager = new SessionManager();
  }

  async execute(context: AgentContext): Promise<AgentResponse> {
    const { action, sessionId } = context.metadata;
    
    // Get session memory for context
    const memory = await this.sessionManager.getSessionMemory(sessionId);

    switch (action) {
      case 'evaluate_response':
        return await this.evaluateResponse(context, memory);
      case 'provide_hint':
        return await this.provideHint(context, memory);
      case 'select_next_question':
        return await this.selectNextQuestion(context, memory);
      case 'provide_feedback':
        return await this.provideFeedback(context, memory);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async evaluateResponse(
    context: AgentContext,
    memory?: any
  ): Promise<AgentResponse> {
    const { blockType, question, criteria, studentResponse, modelAnswer, rubric } = context.metadata;

    // Get similar evaluations for consistency
    const similarEvaluations = await this.vectorStore.hybridSearch(
      `evaluate ${blockType} response`,
      ['hints_feedback'],
      { type: 'evaluation', blockType },
      3
    );

    const prompt = PromptRegistry.fillPrompt(
      'response_evaluator',
      {
        blockType,
        question,
        criteria,
        studentResponse,
        modelAnswer,
        rubric
      },
      { similarEvaluations, studentHistory: memory?.context.recentResponses }
    );

    const evaluationSchema = PromptRegistry.getPrompt('response_evaluator')!.responseSchema;
    
    const response = await geminiCompletion(
      prompt,
      this.getSystemInstruction(),
      evaluationSchema
    );

    const evaluation = JSON.parse(response);

    // Update session memory
    if (memory && context.metadata.questionId) {
      await this.sessionManager.updateSessionContext(context.metadata.sessionId, {
        questionId: context.metadata.questionId,
        response: studentResponse,
        isCorrect: evaluation.score >= evaluation.maxScore * 0.7,
        timestamp: new Date(),
        timeSpent: context.metadata.timeSpent || 0,
        hintsUsed: context.metadata.hintsUsed || 0
      });
    }

    // Store evaluation for future learning
    await this.storeEvaluation(evaluation, context);

    return {
      content: JSON.stringify(evaluation),
      metadata: {
        score: evaluation.score,
        masteryLevel: evaluation.masteryLevel,
        misconceptions: evaluation.misconceptions
      }
    };
  }

  private async provideHint(
    context: AgentContext,
    memory?: any
  ): Promise<AgentResponse> {
    const { question, studentAnswer, correctAnswer, attemptNumber, blockType } = context.metadata;

    // Get previously successful hints
    const successfulHints = await this.vectorStore.getSuccessfulHints(
      blockType,
      question.substring(0, 50),
      3
    );

    // Check if student has been struggling
    const isStruggling = memory?.context.recentResponses
      .slice(-3)
      .filter((r: any) => !r.isCorrect).length >= 2;

    const previousHints = context.metadata.previousHints || [];

    const prompt = PromptRegistry.fillPrompt(
      'adaptive_hint_provider',
      {
        question,
        studentAnswer,
        correctAnswer,
        attemptNumber,
        previousHints
      },
      { 
        successfulHints, 
        isStruggling,
        currentDifficulty: memory?.context.currentDifficulty 
      }
    );

    const hint = await geminiCompletion(
      prompt,
      this.getSystemInstruction()
    );

    // Store hint effectiveness will be tracked when student responds
    await this.storeHint(hint, context);

    return {
      content: hint,
      metadata: {
        hintLevel: attemptNumber,
        isStruggling
      }
    };
  }

  private async selectNextQuestion(
    context: AgentContext,
    memory?: any
  ): Promise<AgentResponse> {
    if (!memory) {
      throw new Error('Session memory required for question selection');
    }

    const { availableQuestions } = context.metadata;

    // Apply spaced repetition principles
    const shouldReview = Math.random() < 0.3; // 30% chance of review
    
    let targetDifficulty = memory.context.currentDifficulty;
    let targetConcepts = [];

    if (shouldReview && memory.context.masteredConcepts.length > 0) {
      // Review a mastered concept (spaced repetition)
      targetConcepts = [memory.context.masteredConcepts[
        Math.floor(Math.random() * memory.context.masteredConcepts.length)
      ]];
    } else if (memory.context.strugglingConcepts.length > 0) {
      // Focus on struggling areas
      targetConcepts = memory.context.strugglingConcepts.slice(0, 2);
      // Maybe reduce difficulty
      if (targetDifficulty === 'advanced') targetDifficulty = 'intermediate';
      if (targetDifficulty === 'intermediate') targetDifficulty = 'beginner';
    }

    const prompt = PromptRegistry.fillPrompt(
      'adaptive_question_selector',
      {
        recentResponses: memory.context.recentResponses,
        currentDifficulty: targetDifficulty,
        strugglingConcepts: memory.context.strugglingConcepts,
        masteredConcepts: memory.context.masteredConcepts,
        sessionTime: Date.now() - memory.context.recentResponses[0]?.timestamp || 0,
        availableQuestions
      }
    );

    const selection = await geminiCompletion(
      prompt,
      this.getSystemInstruction(),
      {
        type: 'object',
        properties: {
          questionId: { type: 'number' },
          reason: { type: 'string' },
          targetConcept: { type: 'string' }
        }
      }
    );

    return {
      content: selection,
      metadata: {
        isReview: shouldReview,
        targetDifficulty,
        targetConcepts
      }
    };
  }

  private async provideFeedback(
    context: AgentContext,
    memory?: any
  ): Promise<AgentResponse> {
    const { evaluation, question, studentResponse } = context.metadata;

    const prompt = `
Provide encouraging, specific feedback based on this evaluation:

Question: ${question}
Student Response: ${JSON.stringify(studentResponse)}
Evaluation: ${JSON.stringify(evaluation)}

The feedback should:
1. Acknowledge what the student did well
2. Explain any misconceptions clearly
3. Provide a concrete next step
4. Maintain a growth mindset tone

${memory ? `Student has been working at ${memory.context.currentDifficulty} level` : ''}
`;

    const feedback = await geminiCompletion(
      prompt,
      this.getSystemInstruction()
    );

    return {
      content: feedback,
      metadata: {
        type: 'feedback',
        masteryLevel: evaluation.masteryLevel
      }
    };
  }

  private async storeEvaluation(evaluation: any, context: AgentContext): Promise<void> {
    // Store in vector store for future reference
    const collection = this.vectorStore.collections.get('hints_feedback');
    if (!collection) return;

    await collection.add({
      ids: [`eval_${Date.now()}`],
      documents: [JSON.stringify(evaluation)],
      metadatas: [{
        type: 'evaluation',
        blockType: context.metadata.blockType,
        score: evaluation.score,
        masteryLevel: evaluation.masteryLevel,
        timestamp: new Date().toISOString()
      }]
    });
  }

  private async storeHint(hint: string, context: AgentContext): Promise<void> {
    // Will track effectiveness after student responds
    const collection = this.vectorStore.collections.get('hints_feedback');
    if (!collection) return;

    await collection.add({
      ids: [`hint_${Date.now()}`],
      documents: [hint],
      metadatas: [{
        type: 'hint',
        blockType: context.metadata.blockType,
        attemptNumber: context.metadata.attemptNumber,
        timestamp: new Date().toISOString(),
        wasHelpful: null // Will be updated based on student's next response
      }]
    });
  }
}