/* eslint-disable @typescript-eslint/no-explicit-any */
import * as table from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { eq, and, inArray, isNull, isNotNull, lt } from 'drizzle-orm';
import { geminiCompletion } from '$lib/server/ai';
import { createTaskBlock, createAnswer, createCriteria, createBlockFromComponent, createTaskWithId } from './task';
import { formatCompleteCurriculumContext, formatExamQuestionsByContext, formatSampleAssessmentsByContext, formatSubSectionContext } from './curriculum';
import { interactiveTaskComponents } from '$lib/server/taskSchema';


// Update the main generation function to store IDs instead of text
export async function generateTeachMeModule(
    curriculumSubjectId: number,
    title: string,
    description: string,
    learningAreaIds: number[],
    outcomeIds: number[],
    keyKnowledgeIds: number[],
    keySkillIds: number[],
    amount?: number,
) {
    console.log('📝 Phase 1: Generating module structure...');
    // Phase 1: Generate module structure using formatted context
    const moduleStructure = await generateModuleStructure(
        title,
        description,
        learningAreaIds,
        outcomeIds,
        keyKnowledgeIds,
        keySkillIds
    );
    
    console.log(`✅ Generated structure with ${moduleStructure.sections.length} sections`);
    console.log('💾 Creating module record...');
    
    // Create module record - store only IDs, not text
    const [module] = await db
        .insert(table.module)
        .values({
            curriculumSubjectId,
            title,
            description: moduleStructure.overallDescription,
            learningAreaIds,
            outcomeIds,
            keyKnowledgeIds,
            keySkillIds,
        })
        .returning();
    
    console.log(`✅ Created module with ID: ${module.id}`);
    console.log('📚 Phase 2 & 3: Generating content for each section...');
    
    // Phase 2 & 3: Generate content for each section
    let sectionCount = 0;
    for (const sectionDef of moduleStructure.sections) {
        sectionCount++;
        console.log(`   📖 Processing section ${sectionCount}/${moduleStructure.sections.length}: "${sectionDef.title}"`);
        
        // Create subsection - store only IDs
        const [subSection] = await db
            .insert(table.moduleSubSection)
            .values({
                moduleId: module.id,
                title: sectionDef.title,
                description: sectionDef.description,
                orderIndex: sectionDef.orderIndex,
                keyKnowledgeIds: sectionDef.relatedKnowledgeIds,
                keySkillIds: sectionDef.relatedSkillIds,
                focus: sectionDef.focus
            })
            .returning();

        console.log(`   ✅ Created subsection with ID: ${subSection.id}`);
        
        // Create a task with the same ID as the subsection for task blocks
        console.log('   📝 Creating task for subsection...');
        const task = await createTaskWithId();
        console.log(`   ✅ Created task with ID: ${task.id}`);
        
        console.log('   🔍 Generating learning content...');

        
        // Generate learning content with ID references
        const learningContent = await generateSectionLearningContent(
            sectionDef,
            amount
        );

        console.log(`   📝 Generated ${learningContent.contentBlocks.length} content blocks`);

        let precedingContent = ''
        let orderIndex = 0;
        // Create learning content blocks
        for (const block of learningContent.contentBlocks) {
            precedingContent += block.content;
            
            // Map content block types to task block types
            let blockType = block.type;
            if (blockType === 'paragraph') {
                blockType = 'markdown';
            }
            
            const createdTaskBlock = await createTaskBlock(
                task.id,
                blockType as table.taskBlockTypeEnum,
                block.content,
                block.orderIndex
            );
            await db.insert(table.moduleTaskBlock).values({
                subSectionId: subSection.id,
                taskBlockId: createdTaskBlock.id,
                orderIndex: block.orderIndex
            });
            orderIndex++;
        }
        
        console.log('   🎯 Generating interactive components...');
        
        // Generate interactive components
        const interactiveComponents = await generateInteractiveComponents(
            sectionDef,
            precedingContent,
            amount
        );
        
        console.log(`   🎮 Generated ${interactiveComponents.interactiveBlocks.length} interactive components`);
        
        // Create interactive blocks and module questions
        let questionCount = 0;
        for (const component of interactiveComponents.interactiveBlocks) {
            console.log(`      🎯 Processing interactive component ${questionCount + 1}/${interactiveComponents.interactiveBlocks.length}`);
            console.log(`      📋 Component structure:`, {
                hasTaskBlock: !!component.taskBlock,
                difficulty: component.difficulty,
                hasHints: Array.isArray(component.hints) && component.hints.length > 0,
                hasSteps: Array.isArray(component.steps) && component.steps.length > 0,
                taskBlockHasAnswer: !!component.taskBlock?.answer,
                taskBlockHasMarks: !!component.taskBlock?.marks,
                taskBlockHasCriteria: Array.isArray(component.taskBlock?.criteria) && component.taskBlock.criteria.length > 0
            });
            
            try {
                const taskBlock = await createBlockFromComponent(component.taskBlock, task.id);
                
                if (taskBlock) {
                    questionCount++;
                    console.log(`      ✅ Created task block for interactive component with ID: ${taskBlock.id}`);
                    
                    // Create answer - access from taskBlock
                    if (component.taskBlock.answer) {
                        console.log(`      📝 Creating answer with ${component.taskBlock.marks || 0} marks`);
                        await createAnswer(taskBlock.id, component.taskBlock.answer, component.taskBlock.marks);
                    }
                    
                    // Create criteria - access from taskBlock
                    if (component.taskBlock.criteria) {
                        console.log(`      📋 Creating ${component.taskBlock.criteria.length} criteria`);
                        for (const criterion of component.taskBlock.criteria) {
                            await createCriteria(taskBlock.id, criterion.description, criterion.marks);
                        }
                    }
                    
                    const [moduleTaskBlock] = await db.insert(table.moduleTaskBlock).values({
                        subSectionId: subSection.id,
                        taskBlockId: taskBlock.id,
                        orderIndex: orderIndex + (component.orderIndex || questionCount - 1),
                        hints: component.hints,
                        steps: component.steps
                    })
                    .returning();

                    console.log(`      ✅ Created module task block with ID: ${moduleTaskBlock.id}`);

                    // Create module question
                    await db.insert(table.moduleQuestion).values({
                        moduleTaskBlockId: moduleTaskBlock.id,
                        difficulty: component.difficulty,
                    });
                    
                    console.log(`      ✅ Created module question with difficulty: ${component.difficulty}`);
                } else {
                    console.warn(`      ⚠️  Failed to create task block for interactive component`);
                }
            } catch (error) {
                console.error(`      ❌ Error processing interactive component:`, error);
                // Continue with next component instead of failing completely
            }
        }
        
        console.log(`   ✅ Section "${sectionDef.title}" completed (${questionCount} questions created)`);
    }
    
    console.log('🎉 Module generation completed successfully!');
    return module;
}

/**
 * Phase 1: Generate module structure and identify sub-skills
 */
async function generateModuleStructure(
    moduleTitle: string,
    moduleDescription: string,
    learningAreaIds: number[],
    outcomeIds: number[],
    keyKnowledgeIds: number[],
    keySkillIds: number[]
) {
    // Format context using IDs
    const formattedContext = await formatCompleteCurriculumContext({
        learningAreaIds,
        outcomeIds,
        keyKnowledgeIds,
        keySkillIds
    });
    
    const prompt = `
    Analyze this curriculum content for module "${moduleTitle}":
    Description: ${moduleDescription}
    
    ${formattedContext}
    
    First, generate an overall comprehensive description that summarizes the module's learning objectives, key concepts, and educational goals based on the provided curriculum content.
    
    Then identify distinct sub-skills that should be taught separately.
    Consider logical learning progression and group related concepts.
    Return subsections with their focus areas.
    Map each subsection to the relevant ID numbers from the provided context.
    
    The overall description should provide a clear overview of what students will learn and achieve through this module.
    `;

    const schema = {
        type: 'object',
        properties: {
            overallDescription: { 
                type: 'string',
                description: 'A comprehensive description of the module based on the curriculum content and learning objectives'
            },
            sections: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        description: { type: 'string' },
                        focus: { type: 'string', enum: ['conceptual', 'practical', 'analytical'] },
                        orderIndex: { type: 'number' },
                        learningAreaIds: { type: 'array', items: { type: 'number' } },
                        outcomeIds: { type: 'array', items: { type: 'number' } },
                        relatedKnowledgeIds: { type: 'array', items: { type: 'number' } },
                        relatedSkillIds: { type: 'array', items: { type: 'number' } }
                    }
                }
            }
        }
    };

    const response = await geminiCompletion(prompt, undefined, schema);
    return JSON.parse(response);
}

/**
 * Phase 2: Generate learning content for each section
 */
async function generateSectionLearningContent(
    section: any,
    amount?: number
) {
    // Format only the relevant context for this section
    const sectionContext = await formatSubSectionContext({
        keyKnowledgeIds: section.relatedKnowledgeIds,
        keySkillIds: section.relatedSkillIds,
        learningAreaIds: section.learningAreaIds,
        outcomeIds: section.outcomeIds
    }, amount);

    const prompt = `
    Generate learning content for section "${section.title}":
    ${section.description}
    
    ${sectionContext}
    
    Create explanatory content blocks (headers, paragraphs).
    Focus on clear explanations and examples.
    Reference content by ID when creating examples.
    `;

    const schema = {
        type: 'object',
        properties: {
            contentBlocks: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        type: { type: 'string', enum: ['h1', 'h2', 'h3', 'paragraph'] },
                        content: { type: 'string' },
                        orderIndex: { type: 'number' },
                        referencedIds: {
                            type: 'object',
                            properties: {
                                keyKnowledgeIds: { type: 'array', items: { type: 'number' } },
                                keySkillIds: { type: 'array', items: { type: 'number' } },
                                activityIds: { type: 'array', items: { type: 'number' } }
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
 * Phase 3: Generate interactive components with assessment context
 */
async function generateInteractiveComponents(
    section: any,
    precedingContent: string,
    amount?: number
) {
    // Format assessment and exam context
    const assessmentContext = await formatSampleAssessmentsByContext({
        keyKnowledgeIds: section.relatedKnowledgeIds,
        keySkillIds: section.relatedSkillIds,
        amount: amount
    });
    
    const examContext = await formatExamQuestionsByContext({
        keyKnowledgeIds: section.relatedKnowledgeIds,
        keySkillIds: section.relatedSkillIds,
        amount: amount
    });

    const prompt = `
    Generate interactive learning components for section "${section.title}":
    
    PRECEDING LEARNING CONTENT (for context):
    ${precedingContent}

    ${assessmentContext}
    
    ${examContext}
    
    Create interactive components with:
    1. Clear questions aligned to the learning content
    2. Appropriate difficulty progression
    3. Detailed marking criteria based on the sample assessments
    4. Progressive hints (3 levels)
    5. Model answers with steps if applicable

    Reference specific IDs when basing questions on existing content.
    `;

    const schema = {
        type: 'object',
        properties: {
            interactiveBlocks: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        taskBlock: {
                            anyOf: interactiveTaskComponents
                        },
                        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
                        hints: {
                            type: 'array',
                            items: { type: 'string' },
                            minItems: 3,
                            maxItems: 3
                        },
                        steps: { 
                            type: 'array', 
                            items: { type: 'string' },
                            description: 'Step-by-step solution approach'
                        }
                    },
                    required: ['taskBlock', 'difficulty', 'hints', 'steps']
                }
            }
        }
    };

    const response = await geminiCompletion(prompt, undefined, schema);
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
                eq(table.moduleSession.userId, String(userId)),
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
            userId: String(userId),
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
    const conditions = [eq(table.moduleSubSection.moduleId, moduleId)];
    
    if (subSectionId) {
        conditions.push(eq(table.moduleSubSection.id, subSectionId));
    }

    const results = await db
        .select({
            id: table.moduleQuestion.id,
            moduleTaskBlockId: table.moduleQuestion.moduleTaskBlockId,
            difficulty: table.moduleQuestion.difficulty,
            conceptsTested: table.moduleQuestion.conceptsTested,
            prerequisiteQuestionIds: table.moduleQuestion.prerequisiteQuestionIds,
            isActive: table.moduleQuestion.isActive,
            createdAt: table.moduleQuestion.createdAt
        })
        .from(table.moduleQuestion)
        .innerJoin(table.moduleTaskBlock, eq(table.moduleQuestion.moduleTaskBlockId, table.moduleTaskBlock.id))
        .innerJoin(table.moduleSubSection, eq(table.moduleTaskBlock.subSectionId, table.moduleSubSection.id))
        .where(and(
            ...conditions,
            eq(table.moduleQuestion.isActive, true)
        ))
        .orderBy(table.moduleQuestion.difficulty);
    
    return results;
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
    const [learningAreas, outcomes, keyKnowledge, keySkills] = 
        await Promise.all([
            db.select().from(table.learningArea).where(inArray(table.learningArea.id, learningAreaIds)),
            db.select().from(table.outcome).where(inArray(table.outcome.id, outcomeIds)),
            db.select().from(table.keyKnowledge).where(inArray(table.keyKnowledge.id, keyKnowledgeIds)),
            db.select().from(table.keySkill).where(inArray(table.keySkill.id, keySkillIds)),
        ]);

    return {
        learningAreas,
        outcomes,
        keyKnowledge,
        keySkills
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

/**
 * Formatting Data for prompt injection based on IDs
 */

export function formatCurriculumContext(data: any) {
    const sections = [];
    
    if (data.learningAreas?.length) {
        sections.push(`## LEARNING AREAS
${data.learningAreas.map((la: any) => 
    `### ${la.title}
    Description: ${la.description}
    Focus: ${la.focus || 'General'}`
).join('\n\n')}`);
    }
    
    if (data.keyKnowledge?.length) {
        sections.push(`## KEY KNOWLEDGE
${data.keyKnowledge.map((kk: any, idx: number) => 
    `${idx + 1}. ${kk.description}
    Topic: ${kk.outcomeTopicId ? `Topic ${kk.outcomeTopicId}` : 'General'}
    Importance: ${kk.importance || 'Standard'}`
).join('\n')}`);
    }
    
    if (data.keySkills?.length) {
        sections.push(`## KEY SKILLS
${data.keySkills.map((ks: any, idx: number) => 
    `${idx + 1}. ${ks.description}
    Type: ${ks.skillType || 'General'}
    Level: ${ks.level || 'Standard'}`
).join('\n')}`);
    }
    
    if (data.sampleAssessments?.length) {
        sections.push(`## SAMPLE ASSESSMENTS
${data.sampleAssessments.map((sa: any) => 
    `### ${sa.title}
    Type: ${sa.assessmentType}
    Description: ${sa.description}
    Marks: ${sa.totalMarks || 'Not specified'}`
).join('\n\n')}`);
    }
    
    if (data.rubrics?.length) {
        sections.push(`## ASSESSMENT CRITERIA
${data.rubrics.map((r: any) => 
    `### ${r.title}
    ${r.criteria.map((c: any) => `- ${c.description}: ${c.marks} marks`).join('\n')}`
).join('\n\n')}`);
    }
    
    return sections.join('\n\n---\n\n');
}

/**
 * Format section-specific context for the teach agent
 */
export function formatSectionContext(section: any, moduleContext: any) {
    return {
        sectionOverview: {
            title: section.title,
            description: section.description,
            learningObjectives: section.learningObjectives || [],
            prerequisites: section.prerequisites || []
        },
        keyConceptsToTeach: moduleContext.keyKnowledge
            .filter((k: any) => section.keyKnowledgeIds?.includes(k.id))
            .map((k: any) => ({
                concept: k.description,
                importance: k.importance || 'standard',
                examples: k.examples || []
            })),
        skillsToDevelop: moduleContext.keySkills
            .filter((s: any) => section.keySkillIds?.includes(s.id))
            .map((s: any) => ({
                skill: s.description,
                level: s.level || 'standard',
                practiceActivities: s.activities || []
            })),
        assessmentGuidelines: {
            criteria: section.criteria || [],
            totalMarks: section.totalMarks || 0,
            passingScore: section.passingScore || 0.5
        }
    };
}