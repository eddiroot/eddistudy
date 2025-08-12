import { pgTable, serial, integer, text, timestamp, boolean, jsonb, varchar, pgEnum, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import * as table from './index';
import { timestamps } from './index';

// Enum for difficulty levels
export const difficultyLevelEnum = pgEnum('difficulty_level', [
    'beginner',
    'intermediate',
    'advanced',
    'expert'
]);

// Enum for response evaluation
export const evaluationResultEnum = pgEnum('evaluation_result', [
    'accurate',
    'mostly_accurate', 
    'inaccurate',
    'critical_error'
]);

// Main teach me modules
export const module = pgTable('module', {
    id: serial('id').primaryKey(),
    curriculumSubjectId: integer('curriculum_subject_id')
        .notNull()
        .references(() => table.curriculumSubject.id),
    title: text('title').notNull(),
    description: text('description'),
    
    // Curriculum connections
    learningAreaIds: jsonb('learning_area_ids').$type<number[]>().default([]),
    outcomeIds: jsonb('outcome_ids').$type<number[]>().default([]),
    keyKnowledgeIds: jsonb('key_knowledge_ids').$type<number[]>().default([]),
    keySkillIds: jsonb('key_skill_ids').$type<number[]>().default([]),
    curriculumLearningActivityIds: jsonb('curriculum_learning_activity_ids').$type<number[]>().default([]),
    sampleAssessmentTaskIds: jsonb('sample_assessment_task_ids').$type<number[]>().default([]),

    // Module metadata
    estimatedMinutes: integer('estimated_minutes').default(30),
    orderIndex: integer('order_index').notNull().default(0),
    
    isPublished: boolean('is_published').default(false),
    ...timestamps
});

// Sub-skills/sections within a module
export const moduleSubSection = pgTable('module_sub_section', {
    id: serial('id').primaryKey(),
    moduleId: integer('module_id')
        .notNull()
        .references(() => module.id),
    title: text('title').notNull(), // topic name
    description: text('description'),
    orderIndex: integer('order_index').notNull(),
    
    // Specific curriculum connections for this subsection
    learningAreaIds: jsonb('learning_area_ids').$type<number[]>().default([]),
    keyKnowledgeIds: jsonb('key_knowledge_ids').$type<number[]>().default([]),
    keySkillIds: jsonb('key_skill_ids').$type<number[]>().default([]),
    curriculumLearningActivityIds: jsonb('curriculum_learning_activity_ids').$type<number[]>().default([]),
    sampleAssessmentTaskIds: jsonb('sample_assessment_task_ids').$type<number[]>().default([]),

    // Generated content
    ...timestamps
});

// Task blocks with embedded criteria and answers
export const moduleTaskBlock = pgTable('module_task_block', {
    id: serial('id').primaryKey(),
    subSectionId: integer('sub_section_id')
        .notNull()
        .references(() => moduleSubSection.id),
    taskBlockId: integer('task_block_id')
        .notNull()
        .references(() => table.taskBlock.id),
    orderIndex: integer('order_index').notNull(),
    
    // Hints for progressive disclosure
    hints: jsonb('hints').$type<string[]>().default([]),
    ...timestamps
});

// Module question pool
export const moduleQuestion = pgTable('module_question', {
    id: serial('id').primaryKey(),
    moduleId: integer('module_id')
        .notNull()
        .references(() => module.id),
    subSectionId: integer('sub_section_id')
        .references(() => moduleSubSection.id),
    taskBlockId: integer('task_block_id')
        .notNull()
        .references(() => table.taskBlock.id),
    
    difficulty: difficultyLevelEnum('difficulty').notNull().default('intermediate'),
    
    // Metadata for agent selection
    conceptsTested: jsonb('concepts_tested').$type<string[]>().default([]),
    prerequisiteQuestionIds: jsonb('prerequisite_question_ids').$type<number[]>().default([]),
    
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow()
});

// User session tracking (temporary, cleared after module completion)
export const moduleSession = pgTable('module_session', {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
        .notNull()
        .references(() => table.user.id),
    moduleId: integer('module_id')
        .notNull()
        .references(() => module.id),
    sessionType: varchar('session_type', { length: 10 }).notNull(), // 'teach' or 'train'
    
    // Current position
    currentSubSectionId: integer('current_sub_section_id')
        .references(() => moduleSubSection.id),
    currentTaskIndex: integer('current_task_index').default(0),
    
    // Session state (temporary storage)
    agentMemory: jsonb('agent_memory').$type<{
        recentResponses: number[]; // IDs of moduleResponse records
        strugglingConcepts: string[];
        masteredConcepts: string[];
        currentStrategy: string;
    }>(),
    
    // Train Me specific
    questionHistory: jsonb('question_history').$type<Array<{
        questionId: number;
        shown: boolean;
        attempted: boolean;
        evaluation?: string;
    }>>().default([]),
    
    startedAt: timestamp('started_at').defaultNow(),
    lastActivityAt: timestamp('last_activity_at').defaultNow(),
    completedAt: timestamp('completed_at')
});

// Response tracking (minimal, for progress only)
export const moduleResponse = pgTable('module_response', {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id')
        .notNull()
        .references(() => moduleSession.id),
    moduleTaskBlockId: integer('task_block_id')
        .notNull()
        .references(() => moduleTaskBlock.id),

    response: jsonb('response').notNull(),
    evaluation: evaluationResultEnum('evaluation'),
    score: real('score'), // 0-1 normalized score
    
    ...timestamps
});

// Relations
export const moduleRelations = relations(module, ({ one, many }) => ({
    curriculumSubject: one(table.curriculumSubject, {
        fields: [module.curriculumSubjectId],
        references: [table.curriculumSubject.id]
    }),
    subSections: many(moduleSubSection),
    questions: many(moduleQuestion),
    sessions: many(moduleSession)
}));

export const moduleSubSectionRelations = relations(moduleSubSection, ({ one, many }) => ({
    module: one(module, {
        fields: [moduleSubSection.moduleId],
        references: [module.id]
    }),
    taskBlocks: many(moduleTaskBlock)
}));

export const moduleTaskBlockRelations = relations(moduleTaskBlock, ({ one }) => ({
    subSection: one(moduleSubSection, {
        fields: [moduleTaskBlock.subSectionId],
        references: [moduleSubSection.id]
    }),
    taskBlock: one(table.taskBlock, {
        fields: [moduleTaskBlock.taskBlockId],
        references: [table.taskBlock.id]
    })
}));