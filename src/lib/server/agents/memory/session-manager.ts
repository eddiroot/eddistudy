/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { AgentMemory, StudentResponse } from '../types';

export class SessionManager {
  private sessions: Map<string, AgentMemory> = new Map();
  
  async getOrCreateSession(
    userId: number,
    moduleId: number,
    sessionType: 'teach' | 'train'
  ): Promise<string> {
    // Check for existing session
    const existing = await db
      .select()
      .from(schema.userModuleSession)
      .where(
        and(
          eq(schema.userModuleSession.userId, userId),
          eq(schema.userModuleSession.moduleId, moduleId),
          eq(schema.userModuleSession.sessionType, sessionType),
          eq(schema.userModuleSession.completed, false)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const session = existing[0];
      
      // Load memory
      if (!this.sessions.has(session.id)) {
        await this.loadSessionMemory(session.id, userId, moduleId);
      }
      
      return session.id;
    }

    // Create new session
    const [newSession] = await db
      .insert(schema.userModuleSession)
      .values({
        userId,
        moduleId,
        sessionType,
        startedAt: new Date()
      })
      .returning();

    // Initialize memory
    this.sessions.set(newSession.id, {
      sessionId: newSession.id,
      userId,
      moduleId,
      context: {
        recentResponses: [],
        currentDifficulty: 'beginner',
        strugglingConcepts: [],
        masteredConcepts: [],
        hintsUsed: 0,
        attemptHistory: []
      }
    });

    return newSession.id;
  }

  async updateSessionContext(
    sessionId: string,
    response: StudentResponse
  ): Promise<void> {
    const memory = this.sessions.get(sessionId);
    if (!memory) return;

    // Update recent responses (keep last 10)
    memory.context.recentResponses.push(response);
    if (memory.context.recentResponses.length > 10) {
      memory.context.recentResponses.shift();
    }

    // Update difficulty based on performance
    const recentCorrect = memory.context.recentResponses
      .slice(-3)
      .filter(r => r.isCorrect).length;
    
    if (recentCorrect === 3 && memory.context.currentDifficulty !== 'advanced') {
      memory.context.currentDifficulty = 
        memory.context.currentDifficulty === 'beginner' ? 'intermediate' : 'advanced';
    } else if (recentCorrect === 0 && memory.context.currentDifficulty !== 'beginner') {
      memory.context.currentDifficulty = 
        memory.context.currentDifficulty === 'advanced' ? 'intermediate' : 'beginner';
    }

    // Track struggling concepts
    if (!response.isCorrect) {
      // This would need to extract concept from question
      // For now, using questionId as placeholder
      const concept = `concept_${response.questionId}`;
      if (!memory.context.strugglingConcepts.includes(concept)) {
        memory.context.strugglingConcepts.push(concept);
      }
    }

    // Update hints used
    memory.context.hintsUsed += response.hintsUsed;

    // Persist important changes
    await this.persistSessionMemory(sessionId, memory);
  }

  async getSessionMemory(sessionId: string): Promise<AgentMemory | undefined> {
    return this.sessions.get(sessionId);
  }

  private async loadSessionMemory(
    sessionId: string,
    userId: number,
    moduleId: number
  ): Promise<void> {
    // Load recent responses
    const responses = await db
      .select()
      .from(schema.userResponse)
      .where(eq(schema.userResponse.sessionId, sessionId))
      .orderBy(desc(schema.userResponse.createdAt))
      .limit(10);

    const recentResponses: StudentResponse[] = responses.map(r => ({
      questionId: r.taskBlockId,
      response: r.response,
      isCorrect: r.isCorrect || false,
      timestamp: r.createdAt,
      timeSpent: r.timeSpent || 0,
      hintsUsed: r.hintsUsed || 0
    }));

    // Calculate current state
    const strugglingConcepts = await this.identifyStrugglingConcepts(userId, moduleId);
    const masteredConcepts = await this.identifyMasteredConcepts(userId, moduleId);

    this.sessions.set(sessionId, {
      sessionId,
      userId,
      moduleId,
      context: {
        recentResponses,
        currentDifficulty: this.calculateDifficulty(recentResponses),
        strugglingConcepts,
        masteredConcepts,
        hintsUsed: recentResponses.reduce((sum, r) => sum + r.hintsUsed, 0),
        attemptHistory: []
      }
    });
  }

  private calculateDifficulty(
    responses: StudentResponse[]
  ): 'beginner' | 'intermediate' | 'advanced' {
    if (responses.length === 0) return 'beginner';
    
    const correctRate = responses.filter(r => r.isCorrect).length / responses.length;
    
    if (correctRate >= 0.8) return 'advanced';
    if (correctRate >= 0.5) return 'intermediate';
    return 'beginner';
  }

  private async identifyStrugglingConcepts(
    userId: number,
    moduleId: number
  ): Promise<string[]> {
    // Query responses grouped by concept with low success rate
    // This is simplified - would need proper concept mapping
    return [];
  }

  private async identifyMasteredConcepts(
    userId: number,
    moduleId: number
  ): Promise<string[]> {
    // Query responses grouped by concept with high success rate
    return [];
  }

  private async persistSessionMemory(
    sessionId: string,
    memory: AgentMemory
  ): Promise<void> {
    // Store session state for recovery
    await db
      .update(schema.userModuleSession)
      .set({
        metadata: {
          currentDifficulty: memory.context.currentDifficulty,
          hintsUsed: memory.context.hintsUsed,
          strugglingConcepts: memory.context.strugglingConcepts,
          masteredConcepts: memory.context.masteredConcepts
        }
      })
      .where(eq(schema.userModuleSession.id, sessionId));
  }

  async summarizeSession(sessionId: string): Promise<any> {
    const memory = this.sessions.get(sessionId);
    if (!memory) return null;

    return {
      totalQuestions: memory.context.recentResponses.length,
      correctAnswers: memory.context.recentResponses.filter(r => r.isCorrect).length,
      hintsUsed: memory.context.hintsUsed,
      timeSpent: memory.context.recentResponses.reduce((sum, r) => sum + r.timeSpent, 0),
      currentLevel: memory.context.currentDifficulty,
      areasOfStrength: memory.context.masteredConcepts,
      areasForImprovement: memory.context.strugglingConcepts
    };
  }
}