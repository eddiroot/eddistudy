/* eslint-disable @typescript-eslint/no-explicit-any */
import * as table from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { eq, and, inArray, isNull, isNotNull, lt } from 'drizzle-orm';
import { geminiCompletion } from '$lib/server/ai';
import {
    paragraphComponent,
    taskComponentSchemaMap
} from '$lib/server/taskSchema';

// Import curriculum service functions
import {
    getLearningActivitiesByLearningArea,
    getSampleAssessmentsByLearningArea
} from './curriculum';
import { createTaskBlock, createAnswer, createCriteria, createBlockFromComponent } from './task';

/**
 * Generate a complete Teach Me module from curriculum data
 */
export async function generateTeachMeModule(
    curriculumSubjectId: number,
    title: string,
    learningAreaIds: number[],
    outcomeIds: number[],
    keyKnowledgeIds: number[],
    keySkillIds: number[],
    curriculumLearningActivityIds: number[],
    sampleAssessmentTaskIds: number[]
) {
    // Create the module
    const [module] = await db
        .insert(table.module)
        .values({
            curriculumSubjectId,
            title,
            learningAreaIds,
            outcomeIds,
            keyKnowledgeIds,
            keySkillIds,
            curriculumLearningActivityIds,
            sampleAssessmentTaskIds
        })
        .returning();

    // Gather all curriculum context
    const context = await gatherCurriculumContext(
        learningAreaIds,
        outcomeIds,
        keyKnowledgeIds,
        keySkillIds
    );

    // Determine if we need subsections
    const subSkills = await identifySubSkills(context, title);

    // Generate complete module content with all subsections
    const moduleContent = await generateCompleteModuleContent(
        title,
        subSkills,
        context
    );

    // Create subsections and their task blocks
    for (const sectionContent of moduleContent.sections) {
        await createSubSectionWithContent(
            module.id,
            sectionContent,
            context
        );
    }

    return module;
}

/**
 * Identify sub-skills within a module using AI
 */
async function identifySubSkills(context: any, moduleTitle: string) {
    const prompt = `
        Analyze this curriculum content for the module "${moduleTitle}" and identify if there are distinct sub-skills that should be taught separately.
        
        Context:
        ${JSON.stringify(context, null, 2)}
        
        If there are clear sub-skills (e.g., for language analysis: quote extraction, integration with response), 
        return them as separate sections. Otherwise, return a single section.
        
        Consider the logical learning progression and group related concepts together.
    `;

    const response = await geminiCompletion(prompt, undefined, {
        type: 'array',
        items: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                keyKnowledgeIds: { type: 'array', items: { type: 'number' } },
                keySkillIds: { type: 'array', items: { type: 'number' } },
                learningAreaIds: { type: 'array', items: { type: 'number' } },
                curriculumLearningActivityIds: { type: 'array', items: { type: 'number' } },
                sampleAssessmentTaskIds: { type: 'array', items: { type: 'number' } }
            }
        }
    });

    return JSON.parse(response); // sub skills 
}

/**
 * Generate complete module content structure
 */
async function generateCompleteModuleContent(
    moduleTitle: string,
    subSkills: any[], // name description with ids 
    context: any // full context from the curriculum
) {
    const prompt = `
    Generate a complete teaching module for "${moduleTitle}" with the following subsections:
    ${JSON.stringify(subSkills, null, 2)}

    Context from curriculum:
    ${JSON.stringify(context, null, 2)}

    Create a coherent learning progression across all sections. For each section, generate:
    1. Learning content (explanatory task blocks)
    2. Interactive exercises (quiz task blocks)
    
    Structure the content as task blocks following the schema. Include:
    - Headers (h1, h2, h3) for organization
    - Paragraphs for explanations
    - Images where relevant (provide descriptive placeholders)
    - Interactive components: multiple_choice, fill_in_blank, short_answer, matching
    
    For each interactive component, include:
    - The question/prompt
    - Difficulty level (beginner, intermediate, advanced)
    
    Ensure logical flow and increasing complexity throughout the module.
    Return JSON matching the task block schema.
    `;

    const schema = {
        type: 'object',
        properties: {
            sections: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        description: { type: 'string' },
                        orderIndex: { type: 'number' },
                        subSkillIds: {
                            type: 'object',
                            properties: {
                                keyKnowledgeIds: { type: 'array', items: { type: 'number' } },
                                keySkillIds: { type: 'array', items: { type: 'number' } },
                                learningAreaIds: { type: 'array', items: { type: 'number' } },
                                curriculumLearningActivityIds: { type: 'array', items: { type: 'number' } },
                                sampleAssessmentTaskIds: { type: 'array', items: { type: 'number' } }
                            }
                        },
                        taskBlocks: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    type: { 
                                        type: 'string', 
                                        enum: ['h1', 'h2', 'h3', 'paragraph', 'multipleChoice', 
                                               'fillInBlank', 'shortAnswer', 'matching', 'image']
                                    },
                                    content: { type: 'string' },
                                    isInteractive: { type: 'boolean' },
                                    difficulty: { type: 'string' },
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    const response = await geminiCompletion(prompt, undefined, schema);
    return JSON.parse(response);
}

/**
 * Create a subsection with its complete content
 */
async function createSubSectionWithContent(
    moduleId: number,
    sectionContent: any,
    globalContext: any
) {
    // Create the subsection
    const [subSection] = await db
        .insert(table.moduleSubSection)
        .values({
            moduleId,
            title: sectionContent.title,
            description: sectionContent.description,
            orderIndex: sectionContent.orderIndex,
            learningAreaIds: sectionContent.subSkillIds.learningAreaIds,
            keyKnowledgeIds: sectionContent.subSkillIds.keyKnowledgeIds,
            keySkillIds: sectionContent.subSkillIds.keySkillIds,
            curriculumLearningActivityIds: sectionContent.subSkillIds.curriculumLearningActivityIds,
            sampleAssessmentTaskIds: sectionContent.subSkillIds.sampleAssessmentTaskIds
        })
        .returning();

    // Process task blocks
    const learningContent = [];
    const interactiveBlocks = [];

    for (let i = 0; i < sectionContent.taskBlocks.length; i++) {
        const block = sectionContent.taskBlocks[i];
        // Add a type assertion for block.type
        type TaskBlockTypeEnumKey = keyof typeof table.taskBlockTypeEnum;
        const blockType = block.type as TaskBlockTypeEnumKey;
        
        if (block.isInteractive) {
            // Store for later processing with context
            interactiveBlocks.push({
                ...block,
                orderIndex: i,
                precedingContent: learningContent.slice(-3) // Keep last 3 learning blocks for context
            });
        } else {
            // Create content task block immediately or we could feed all content task block schemas to create the content blocks
            // function for making the content 
            // create a task block, create a teach me task block 
            const taskBlock = await createTaskBlock(
                subSection.id,
                table.taskBlockTypeEnum[blockType],
                block.content,
                i
            );
            learningContent.push({ ...block, id: taskBlock.id });
        }
    }

    // Generate answers, criteria, and hints for interactive blocks
    for (const interactiveBlock of interactiveBlocks) {
        await createInteractiveTaskBlock(
            subSection.id,
            interactiveBlock,
            learningContent,
            globalContext // might not be necessary
        );
    }

    return subSection;
}

/**
 * Create an interactive task block with answers, criteria, and hints
 */
async function createInteractiveTaskBlock(
    subSectionId: number,
    blockData: any,
    precedingContent: any[],
    globalContext: any
) {

    // generate block with answers and criteria 
    const response = await generateInteractiveBlock(blockData, precedingContent, globalContext);

    const createdBlock = await createBlockFromComponent(response.taskBlock, subSectionId);
    if (createdBlock){
        if (response.taskBlock.answer) {
            await createAnswer(createdBlock.id, response.taskBlock.answer, response.taskBlock.marks);
        }
        if (response.taskBlock.criteria) {
            for (const criterion of response.taskBlock.criteria) {
                await createCriteria(createdBlock.id, criterion.description, criterion.marks);
            }
        }
    
        await createModuleTaskBlock(subSectionId, createdBlock.id, response);
    }

    return createdBlock;
}


export async function createModuleTaskBlock(
    subSectionId: number,
    taskBlockId: number,
    response: any
) {
    const [createdBlock] = await db
        .insert(table.moduleTaskBlock)
        .values({
            subSectionId,
            taskBlockId,
            orderIndex: response.orderIndex,
            hints: response.hints
        })
        .returning();

    return createdBlock;
}

/**
 * Generate answers, criteria, and hints for a specific block
 */
async function generateInteractiveBlock(
    blockData: any,
    precedingContent: any[],
    globalContext: any
) {
    const selectedSchema = taskComponentSchemaMap[blockData.type as keyof typeof taskComponentSchemaMap] || paragraphComponent;

    const prompt = `
    Generate a complete interactive task block for teaching with the following requirements:
    
    Block Type: ${blockData.type}
    Block Content Description: ${JSON.stringify(blockData.content)}
    Difficulty: ${blockData.difficulty}
    
    Preceding Learning Content (for context):
    ${JSON.stringify(precedingContent.slice(-2), null, 2)}
    
    Curriculum Context:
    ${JSON.stringify(globalContext, null, 2)}
    
    Create a complete task block that includes:
    1. The task block content following the exact schema for ${blockData.type}
    2. Answer(s) and marks (if applicable for interactive types)
    3. Criteria (if applicable for assessment types like short_answer)
    4. 3 progressive hints (from subtle to more direct)
    
    Ensure the content is educational, aligned with VCE standards, and appropriate for the difficulty level.
    The hints should guide learning without giving away the answer directly.
    `;

    // Create schema that includes both the task block structure AND additional teaching data
    const fullSchema = {
        type: 'object',
        properties: {
            taskBlock: selectedSchema,
            hints: {
                type: 'array',
                items: { type: 'string' },
                minItems: 3,
                maxItems: 3
            },
        },
        required: ['taskBlock', 'hints']
    };

    const response = await geminiCompletion(prompt, undefined, fullSchema);
    return JSON.parse(response);
}


/**
 * Get or create a session for the user
 */
export async function getOrCreateSession(
    userId: number,
    moduleId: number,
    sessionType: 'teach' | 'train'
) {
    // Check for existing active session
    const [existingSession] = await db
        .select()
        .from(table.moduleSession)
        .where(
            and(
                eq(table.moduleSession.userId, userId),
                eq(table.moduleSession.moduleId, moduleId),
                eq(table.moduleSession.sessionType, sessionType),
                isNull(table.moduleSession.completedAt)
            )
        )
        .limit(1);

    if (existingSession) {
        return existingSession;
    }

    // Create new session
    const [newSession] = await db
        .insert(table.moduleSession)
        .values({
            userId,
            moduleId,
            sessionType,
            agentMemory: {
                recentResponses: [],
                strugglingConcepts: [],
                masteredConcepts: [],
                currentStrategy: 'initial_assessment'
            }
        })
        .returning();

    return newSession;
}

/**
 * Clear completed sessions to save memory
 */
export async function clearCompletedSessions(olderThanDays = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    await db
        .delete(table.moduleSession)
        .where(
            and(
                isNotNull(table.moduleSession.completedAt),
                lt(table.moduleSession.completedAt, cutoffDate)
            )
        );
}

/**
 * Get Train Me questions for adaptive selection
 */
export async function getTrainMeQuestionPool(
    moduleId: number,
    subSectionId?: number
) {
    const conditions = [
        eq(table.moduleQuestion.moduleId, moduleId),
        eq(table.moduleQuestion.isActive, true)
    ];

    if (subSectionId) {
        conditions.push(eq(table.moduleQuestion.subSectionId, subSectionId));
    }

    return await db
        .select()
        .from(table.moduleQuestion  )
        .where(and(...conditions))
        .orderBy(table.moduleQuestion.difficulty);
}

/**
 * Select next question based on performance
 */
export async function selectNextQuestion(
    sessionId: number,
    lastEvaluation?: string
) {
    const session = await db
        .select()
        .from(table.moduleSession)
        .where(eq(table.moduleSession.id, sessionId))
        .limit(1);

    if (!session[0]) throw new Error('Session not found');

    const questionPool = await getTrainMeQuestionPool(
        session[0].moduleId,
        session[0].currentSubSectionId || undefined
    );

    // Filter out already shown questions
    const history = session[0].questionHistory || [];
    const availableQuestions = questionPool.filter(
        q => !history.find(h => h.questionId === q.id && h.shown)
    );

    // Select based on performance
    let selectedQuestion;
    if (lastEvaluation === 'critical_error' || lastEvaluation === 'inaccurate') {
        // Give easier question
        selectedQuestion = availableQuestions.find(q => q.difficulty === 'beginner') ||
                          availableQuestions[0];
    } else if (lastEvaluation === 'accurate') {
        // Progress to harder question
        const currentDifficulty = questionPool.find(
            q => q.id === history[history.length - 1]?.questionId
        )?.difficulty || 'intermediate';
        
        const nextDifficulty = getNextDifficulty(currentDifficulty);
        selectedQuestion = availableQuestions.find(q => q.difficulty === nextDifficulty) ||
                          availableQuestions[0];
    } else {
        // Default to intermediate
        selectedQuestion = availableQuestions.find(q => q.difficulty === 'intermediate') ||
                          availableQuestions[0];
    }

    // Update session history
    if (selectedQuestion) {
        await db
            .update(table.moduleSession)
            .set({
                questionHistory: [
                    ...history,
                    { questionId: selectedQuestion.id, shown: true, attempted: false }
                ],
                lastActivityAt: new Date()
            })
            .where(eq(table.moduleSession.id, sessionId));
    }

    return selectedQuestion;
}

function getNextDifficulty(current: string): string {
    const progression = ['beginner', 'intermediate', 'advanced', 'expert'];
    const currentIndex = progression.indexOf(current);
    return progression[Math.min(currentIndex + 1, progression.length - 1)];
}

// Helper functions
export async function gatherCurriculumContext(
    learningAreaIds: number[],
    outcomeIds: number[],
    keyKnowledgeIds: number[],
    keySkillIds: number[]
) {
    const [learningAreas, outcomes, keyKnowledge, keySkills, activities, assessments] = 
        await Promise.all([
            db.select().from(table.learningArea).where(inArray(table.learningArea.id, learningAreaIds)),
            db.select().from(table.outcome).where(inArray(table.outcome.id, outcomeIds)),
            db.select().from(table.keyKnowledge).where(inArray(table.keyKnowledge.id, keyKnowledgeIds)),
            db.select().from(table.keySkill).where(inArray(table.keySkill.id, keySkillIds)),
            Promise.all(learningAreaIds.map(id => getLearningActivitiesByLearningArea(id))),
            Promise.all(learningAreaIds.map(id => getSampleAssessmentsByLearningArea(id)))
        ]);

    return {
        learningAreas,
        outcomes,
        keyKnowledge,
        keySkills,
        activities: activities.flat(),
        assessments: assessments.flat()
    };
}

export async function gatherCurriculumContextBySubjectLearningAreaIdsAndOutcomeIds(
    subjectId: number, 
    learningAreaIds: number[], 
    outcomeIds: number[]
) {
    // First get the key knowledge and key skills from outcomes and learning areas
    const keyKnowledgeFromOutcomes = await db
        .select()
        .from(table.keyKnowledge)
        .where(
            and(
                eq(table.keyKnowledge.curriculumSubjectId, subjectId),
                inArray(table.keyKnowledge.outcomeId, outcomeIds)
            )
        );

    const keySkillsFromOutcomes = await db
        .select()
        .from(table.keySkill)
        .where(
            and(
                eq(table.keySkill.curriculumSubjectId, subjectId),
                inArray(table.keySkill.outcomeId, outcomeIds)
            )
        );

    // Get key skills that are tied to the subject but not to specific outcomes
    const keySkillsFromSubject = await db
        .select()
        .from(table.keySkill)
        .where(
            and(
                eq(table.keySkill.curriculumSubjectId, subjectId),
                isNull(table.keySkill.outcomeId)
            )
        );

    // Get topic-based key knowledge (organized by topics)
    const topics = await db
        .select()
        .from(table.outcomeTopic)
        .where(inArray(table.outcomeTopic.outcomeId, outcomeIds));

    const topicIds = topics.map(t => t.id);
    const keyKnowledgeFromTopics = topicIds.length > 0 ? 
        await db
            .select()
            .from(table.keyKnowledge)
            .where(inArray(table.keyKnowledge.outcomeTopicId, topicIds))
        : [];

    // Get key knowledge that are tied to the subject but not to specific outcomes or topics
    const keyKnowledgeFromSubject = await db
        .select()
        .from(table.keyKnowledge)
        .where(
            and(
                eq(table.keyKnowledge.curriculumSubjectId, subjectId),
                isNull(table.keyKnowledge.outcomeId),
                isNull(table.keyKnowledge.outcomeTopicId)
            )
        );

    const allKeyKnowledgeIds = [
        ...keyKnowledgeFromOutcomes.map(k => k.id),
        ...keyKnowledgeFromTopics.map(k => k.id),
        ...keyKnowledgeFromSubject.map(k => k.id)
    ];

    const allKeySkillIds = [
        ...keySkillsFromOutcomes.map(k => k.id),
        ...keySkillsFromSubject.map(k => k.id)
    ];

    // Get all related curriculum elements
    const [
        learningAreas, 
        outcomes, 
        keyKnowledge, 
        keySkills, 
        learningActivities,
        sampleAssessments,
        detailedExamples,
        extraContents
    ] = await Promise.all([
        // Learning Areas
        db.select().from(table.learningArea).where(inArray(table.learningArea.id, learningAreaIds)),
        
        // Outcomes
        db.select().from(table.outcome).where(inArray(table.outcome.id, outcomeIds)),
        
        // All Key Knowledge
        allKeyKnowledgeIds.length > 0 ? 
            db.select().from(table.keyKnowledge).where(inArray(table.keyKnowledge.id, allKeyKnowledgeIds))
            : [],
        
        // All Key Skills
        allKeySkillIds.length > 0 ?
            db.select().from(table.keySkill).where(inArray(table.keySkill.id, allKeySkillIds))
            : [],

        // Learning Activities
        getLearningActivitiesForContext(learningAreaIds, outcomeIds, allKeyKnowledgeIds, allKeySkillIds),
        
        // Sample Assessments
        getSampleAssessmentsForContext(learningAreaIds, outcomeIds, allKeyKnowledgeIds, allKeySkillIds),
        
        // Detailed Examples
        getDetailedExamplesForContext(learningAreaIds, outcomeIds, allKeyKnowledgeIds, allKeySkillIds),
        
        // Extra Content
        db.select().from(table.extraContent).where(eq(table.extraContent.curriculumSubjectId, subjectId))
    ]);

    // Organize by topics if they exist
    const organizedContent = topics.length > 0 ? {
        topics: await organizeContentByTopics(topics, {
            keyKnowledge: keyKnowledge,
            keySkills: keySkills,
            learningActivities: learningActivities,
            sampleAssessments: sampleAssessments,
            detailedExamples: detailedExamples
        })
    } : {};

    return {
        learningAreas,
        outcomes,
        keyKnowledge,
        keySkills,
        learningActivities,
        sampleAssessments,
        detailedExamples,
        extraContents,
        ...organizedContent
    };
}

/**
 * Extract comprehensive curriculum context directly from topic ID
 */
export async function gatherCurriculumContextByTopicId(topicId: number) {
    // Get the topic and its outcome
    const topicWithOutcome = await db
        .select({
            topic: table.outcomeTopic,
            outcome: table.outcome,
            curriculumSubject: table.curriculumSubject
        })
        .from(table.outcomeTopic)
        .innerJoin(table.outcome, eq(table.outcomeTopic.outcomeId, table.outcome.id))
        .innerJoin(table.curriculumSubject, eq(table.outcome.curriculumSubjectId, table.curriculumSubject.id))
        .where(eq(table.outcomeTopic.id, topicId))
        .limit(1);

    if (!topicWithOutcome[0]) {
        throw new Error('Topic not found');
    }

    const { topic, outcome, curriculumSubject } = topicWithOutcome[0];

    // Get all learning areas related to this outcome
    const learningAreaIds = await db
        .select({ learningAreaId: table.learningAreaOutcome.learningAreaId })
        .from(table.learningAreaOutcome)
        .where(eq(table.learningAreaOutcome.outcomeId, outcome.id))
        .then(results => results.map(r => r.learningAreaId));

    // Get key knowledge and key skills for this topic
    const [topicKeyKnowledge, outcomeKeySkills, subjectKeySkills] = await Promise.all([
        db.select().from(table.keyKnowledge).where(eq(table.keyKnowledge.outcomeTopicId, topicId)),
        db.select().from(table.keySkill).where(eq(table.keySkill.outcomeId, outcome.id)),
        // Also get key skills that are tied to the subject but not to specific outcomes
        db.select().from(table.keySkill).where(
            and(
                eq(table.keySkill.curriculumSubjectId, curriculumSubject.id),
                isNull(table.keySkill.outcomeId)
            )
        )
    ]);

    const keyKnowledgeIds = topicKeyKnowledge.map(k => k.id);
    const keySkillIds = [
        ...outcomeKeySkills.map(k => k.id),
        ...subjectKeySkills.map(k => k.id)
    ];

    // Get comprehensive curriculum context
    const [
        learningAreas,
        learningActivities,
        sampleAssessments,
        detailedExamples,
        extraContents
    ] = await Promise.all([
        // Learning Areas
        learningAreaIds.length > 0 ? 
            db.select().from(table.learningArea).where(inArray(table.learningArea.id, learningAreaIds))
            : [],
        
        // Learning Activities
        getLearningActivitiesForContext(learningAreaIds, [outcome.id], keyKnowledgeIds, keySkillIds),
        
        // Sample Assessments
        getSampleAssessmentsForContext(learningAreaIds, [outcome.id], keyKnowledgeIds, keySkillIds),
        
        // Detailed Examples
        getDetailedExamplesForContext(learningAreaIds, [outcome.id], keyKnowledgeIds, keySkillIds),
        
        // Extra Content
        db.select().from(table.extraContent).where(eq(table.extraContent.curriculumSubjectId, curriculumSubject.id))
    ]);

    return {
        topic,
        outcome,
        curriculumSubject,
        learningAreas,
        keyKnowledge: topicKeyKnowledge,
        keySkills: [...outcomeKeySkills, ...subjectKeySkills],
        learningActivities,
        sampleAssessments,
        detailedExamples,
        extraContents
    };
}

// Helper function to get learning activities with all relationships
async function getLearningActivitiesForContext(
    learningAreaIds: number[], 
    outcomeIds: number[], 
    keyKnowledgeIds: number[], 
    keySkillIds: number[]
) {
    const conditions = [];
    
    if (learningAreaIds.length > 0) {
        const activitiesByLearningArea = await db
            .select({ activityId: table.learningActivityLearningArea.curriculumLearningActivityId })
            .from(table.learningActivityLearningArea)
            .where(inArray(table.learningActivityLearningArea.learningAreaId, learningAreaIds));
        conditions.push(...activitiesByLearningArea.map(a => a.activityId));
    }

    if (outcomeIds.length > 0) {
        const activitiesByOutcome = await db
            .select({ activityId: table.learningActivityOutcome.curriculumLearningActivityId })
            .from(table.learningActivityOutcome)
            .where(inArray(table.learningActivityOutcome.outcomeId, outcomeIds));
        conditions.push(...activitiesByOutcome.map(a => a.activityId));
    }

    if (keyKnowledgeIds.length > 0) {
        const activitiesByKeyKnowledge = await db
            .select({ activityId: table.learningActivityKeyKnowledge.curriculumLearningActivityId })
            .from(table.learningActivityKeyKnowledge)
            .where(inArray(table.learningActivityKeyKnowledge.keyKnowledgeId, keyKnowledgeIds));
        conditions.push(...activitiesByKeyKnowledge.map(a => a.activityId));
    }

    if (keySkillIds.length > 0) {
        const activitiesByKeySkill = await db
            .select({ activityId: table.learningActivityKeySkill.curriculumLearningActivityId })
            .from(table.learningActivityKeySkill)
            .where(inArray(table.learningActivityKeySkill.keySkillId, keySkillIds));
        conditions.push(...activitiesByKeySkill.map(a => a.activityId));
    }

    const uniqueActivityIds = [...new Set(conditions)];
    
    return uniqueActivityIds.length > 0 ? 
        db.select().from(table.curriculumLearningActivity).where(inArray(table.curriculumLearningActivity.id, uniqueActivityIds))
        : [];
}

// Helper function to get sample assessments with all relationships
async function getSampleAssessmentsForContext(
    learningAreaIds: number[], 
    outcomeIds: number[], 
    keyKnowledgeIds: number[], 
    keySkillIds: number[]
) {
    const conditions = [];
    
    if (learningAreaIds.length > 0) {
        const assessmentsByLearningArea = await db
            .select({ assessmentId: table.sampleAssessmentLearningArea.sampleAssessmentId })
            .from(table.sampleAssessmentLearningArea)
            .where(inArray(table.sampleAssessmentLearningArea.learningAreaId, learningAreaIds));
        conditions.push(...assessmentsByLearningArea.map(a => a.assessmentId));
    }

    if (outcomeIds.length > 0) {
        const assessmentsByOutcome = await db
            .select({ assessmentId: table.sampleAssessmentOutcome.sampleAssessmentId })
            .from(table.sampleAssessmentOutcome)
            .where(inArray(table.sampleAssessmentOutcome.outcomeId, outcomeIds));
        conditions.push(...assessmentsByOutcome.map(a => a.assessmentId));
    }

    if (keyKnowledgeIds.length > 0) {
        const assessmentsByKeyKnowledge = await db
            .select({ assessmentId: table.sampleAssessmentKeyKnowledge.sampleAssessmentId })
            .from(table.sampleAssessmentKeyKnowledge)
            .where(inArray(table.sampleAssessmentKeyKnowledge.keyKnowledgeId, keyKnowledgeIds));
        conditions.push(...assessmentsByKeyKnowledge.map(a => a.assessmentId));
    }

    if (keySkillIds.length > 0) {
        const assessmentsByKeySkill = await db
            .select({ assessmentId: table.sampleAssessmentKeySkill.sampleAssessmentId })
            .from(table.sampleAssessmentKeySkill)
            .where(inArray(table.sampleAssessmentKeySkill.keySkillId, keySkillIds));
        conditions.push(...assessmentsByKeySkill.map(a => a.assessmentId));
    }

    const uniqueAssessmentIds = [...new Set(conditions)];
    
    return uniqueAssessmentIds.length > 0 ? 
        db.select().from(table.sampleAssessment).where(inArray(table.sampleAssessment.id, uniqueAssessmentIds))
        : [];
}

// Helper function to get detailed examples with all relationships
async function getDetailedExamplesForContext(
    learningAreaIds: number[], 
    outcomeIds: number[], 
    keyKnowledgeIds: number[], 
    keySkillIds: number[]
) {
    const conditions = [];
    
    if (learningAreaIds.length > 0) {
        const examplesByLearningArea = await db
            .select({ exampleId: table.detailedExampleLearningArea.detailedExampleId })
            .from(table.detailedExampleLearningArea)
            .where(inArray(table.detailedExampleLearningArea.learningAreaId, learningAreaIds));
        conditions.push(...examplesByLearningArea.map(e => e.exampleId));
    }

    if (outcomeIds.length > 0) {
        const examplesByOutcome = await db
            .select({ exampleId: table.detailedExampleOutcome.detailedExampleId })
            .from(table.detailedExampleOutcome)
            .where(inArray(table.detailedExampleOutcome.outcomeId, outcomeIds));
        conditions.push(...examplesByOutcome.map(e => e.exampleId));
    }

    if (keyKnowledgeIds.length > 0) {
        const examplesByKeyKnowledge = await db
            .select({ exampleId: table.detailedExampleKeyKnowledge.detailedExampleId })
            .from(table.detailedExampleKeyKnowledge)
            .where(inArray(table.detailedExampleKeyKnowledge.keyKnowledgeId, keyKnowledgeIds));
        conditions.push(...examplesByKeyKnowledge.map(e => e.exampleId));
    }

    if (keySkillIds.length > 0) {
        const examplesByKeySkill = await db
            .select({ exampleId: table.detailedExampleKeySkill.detailedExampleId })
            .from(table.detailedExampleKeySkill)
            .where(inArray(table.detailedExampleKeySkill.keySkillId, keySkillIds));
        conditions.push(...examplesByKeySkill.map(e => e.exampleId));
    }

    const uniqueExampleIds = [...new Set(conditions)];
    
    return uniqueExampleIds.length > 0 ? 
        db.select().from(table.detailedExample).where(inArray(table.detailedExample.id, uniqueExampleIds))
        : [];
}

// Helper function to organize content by topics
async function organizeContentByTopics(topics: any[], content: {
    keyKnowledge: any[],
    keySkills: any[],
    learningActivities: any[],
    sampleAssessments: any[],
    detailedExamples: any[]
}) {
    const organizedTopics = [];

    for (const topic of topics) {
        // Get key knowledge specific to this topic
        const topicKeyKnowledge = content.keyKnowledge.filter(k => k.outcomeTopicId === topic.id);
        
        // Get key skills related to the outcome (skills are typically outcome-level, not topic-level)
        const relatedKeySkills = content.keySkills.filter(k => k.outcomeId === topic.outcomeId);

        // For learning activities, sample assessments, and detailed examples,
        // we'd need to check their relationships with the topic's key knowledge
        // For now, including all related content

        organizedTopics.push({
            ...topic,
            keyKnowledge: topicKeyKnowledge,
            keySkills: relatedKeySkills,
            // Note: These would need more complex filtering based on relationships
            // For now, including all related content
            learningActivities: content.learningActivities,
            sampleAssessments: content.sampleAssessments,
            detailedExamples: content.detailedExamples
        });
    }

    return organizedTopics;
}

