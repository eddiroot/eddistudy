import * as table from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { eq, and, inArray } from 'drizzle-orm';

// ============================================================================
// CURRICULUM & SUBJECT METHODS
// ============================================================================

/**
 * Get all curricula
 */
export async function getAllCurricula() {
	return await db
		.select()
		.from(table.curriculum)
		.where(eq(table.curriculum.isArchived, false))
		.orderBy(table.curriculum.name);
}

/**
 * Get curriculum by ID
 */
export async function getCurriculumById(curriculumId: number) {
	const [curriculum] = await db
		.select()
		.from(table.curriculum)
		.where(
			and(
				eq(table.curriculum.id, curriculumId),
				eq(table.curriculum.isArchived, false)
			)
		)
		.limit(1);
	
	return curriculum;
}

/**
 * Get all subjects for a curriculum
 */
export async function getSubjectsByCurriculum(curriculumId: number) {
	return await db
		.select()
		.from(table.curriculumSubject)
		.where(
			and(
				eq(table.curriculumSubject.curriculumId, curriculumId),
				eq(table.curriculumSubject.isArchived, false)
			)
		)
		.orderBy(table.curriculumSubject.name);
}

/**
 * Get subject by ID with curriculum info
 */
export async function getCurriculumSubjectById(subjectId: number) {
	const [result] = await db
		.select({
			subject: table.curriculumSubject,
			curriculum: table.curriculum
		})
		.from(table.curriculumSubject)
		.innerJoin(table.curriculum, eq(table.curriculumSubject.curriculumId, table.curriculum.id))
		.where(
			and(
				eq(table.curriculumSubject.id, subjectId),
				eq(table.curriculumSubject.isArchived, false)
			)
		)
		.limit(1);
	
	return result;
}

// ============================================================================
// LEARNING AREA METHODS
// ============================================================================

/**
 * Get all learning areas for a curriculum subject
 */
export async function getLearningAreasBySubject(curriculumSubjectId: number) {
	return await db
		.select()
		.from(table.learningArea)
		.where(
			and(
				eq(table.learningArea.curriculumSubjectId, curriculumSubjectId),
				eq(table.learningArea.isArchived, false)
			)
		)
		.orderBy(table.learningArea.name);
}

/**
 * Get learning areas by unit (based on abbreviation pattern like U1A1, U1A2, etc.)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getLearningAreasByUnit(curriculumSubjectId: number, unitNumber: number) {
	// TODO: Implement unit filtering - currently returns all learning areas for the subject
	// When implemented, should filter by abbreviation pattern like U${unitNumber}A%
	return await db
		.select()
		.from(table.learningArea)
		.where(
			and(
				eq(table.learningArea.curriculumSubjectId, curriculumSubjectId),
				eq(table.learningArea.isArchived, false)
				// TODO: Add LIKE filter on abbreviation for unit pattern matching
				// Example: like(table.learningArea.abbreviation, `U${unitNumber}A%`)
			)
		)
		.orderBy(table.learningArea.name);
}

/**
 * Get learning area by ID with content
 */
export async function getLearningAreaById(learningAreaId: number) {
	const learningArea = await db
		.select()
		.from(table.learningArea)
		.where(
			and(
				eq(table.learningArea.id, learningAreaId),
				eq(table.learningArea.isArchived, false)
			)
		)
		.limit(1);

	const content = await db
		.select()
		.from(table.learningAreaContent)
		.where(
			and(
				eq(table.learningAreaContent.learningAreaId, learningAreaId),
				eq(table.learningAreaContent.isArchived, false)
			)
		)
		.orderBy(table.learningAreaContent.number);

	return {
		learningArea: learningArea[0],
		content
	};
}

/**
 * Get learning area content by learning area
 */
export async function getLearningAreaContent(learningAreaId: number) {
	return await db
		.select()
		.from(table.learningAreaContent)
		.where(
			and(
				eq(table.learningAreaContent.learningAreaId, learningAreaId),
				eq(table.learningAreaContent.isArchived, false)
			)
		)
		.orderBy(table.learningAreaContent.number);
}

// ============================================================================
// OUTCOME METHODS
// ============================================================================

/**
 * Get all outcomes for a curriculum subject
 */
export async function getOutcomesBySubject(curriculumSubjectId: number) {
	return await db
		.select()
		.from(table.outcome)
		.where(
			and(
				eq(table.outcome.curriculumSubjectId, curriculumSubjectId),
				eq(table.outcome.isArchived, false)
			)
		)
		.orderBy(table.outcome.number);
}

/**
 * Get outcomes by unit (filtered by learning area outcomes)
 */
export async function getOutcomesByUnit(curriculumSubjectId: number, unitNumber: number) {
	// First get learning areas for the unit
	const learningAreas = await getLearningAreasByUnit(curriculumSubjectId, unitNumber);
	const learningAreaIds = learningAreas.map(la => la.id);
	
	if (learningAreaIds.length === 0) {
		return [];
	}

	// Get outcomes linked to these learning areas
	const outcomes = await db
		.select({
			outcome: table.outcome
		})
		.from(table.outcome)
		.innerJoin(table.learningAreaOutcome, eq(table.outcome.id, table.learningAreaOutcome.outcomeId))
		.where(
			and(
				inArray(table.learningAreaOutcome.learningAreaId, learningAreaIds),
				eq(table.outcome.isArchived, false),
				eq(table.learningAreaOutcome.isArchived, false)
			)
		)
		.orderBy(table.outcome.number);

	return outcomes.map(row => row.outcome);
}

/**
 * Get outcome by ID with related topics
 */
export async function getOutcomeById(outcomeId: number) {
	const outcome = await db
		.select()
		.from(table.outcome)
		.where(
			and(
				eq(table.outcome.id, outcomeId),
				eq(table.outcome.isArchived, false)
			)
		)
		.limit(1);

	const topics = await db
		.select()
		.from(table.outcomeTopic)
		.where(
			and(
				eq(table.outcomeTopic.outcomeId, outcomeId),
				eq(table.outcomeTopic.isArchived, false)
			)
		)
		.orderBy(table.outcomeTopic.name);

	return {
		outcome: outcome[0],
		topics
	};
}

/**
 * Get topics for an outcome
 */
export async function getTopicsByOutcome(outcomeId: number) {
	return await db
		.select()
		.from(table.outcomeTopic)
		.where(
			and(
				eq(table.outcomeTopic.outcomeId, outcomeId),
				eq(table.outcomeTopic.isArchived, false)
			)
		)
		.orderBy(table.outcomeTopic.name);
}

// ============================================================================
// KEY KNOWLEDGE & KEY SKILLS METHODS
// ============================================================================

/**
 * Get key knowledge by outcome
 */
export async function getKeyKnowledgeByOutcome(outcomeId: number) {
	return await db
		.select()
		.from(table.keyKnowledge)
		.where(
			and(
				eq(table.keyKnowledge.outcomeId, outcomeId),
				eq(table.keyKnowledge.isArchived, false)
			)
		)
		.orderBy(table.keyKnowledge.number);
}

/**
 * Get key skills by outcome
 */
export async function getKeySkillsByOutcome(outcomeId: number) {
	return await db
		.select()
		.from(table.keySkill)
		.where(
			and(
				eq(table.keySkill.outcomeId, outcomeId),
				eq(table.keySkill.isArchived, false)
			)
		)
		.orderBy(table.keySkill.number);
}

/**
 * Get all key knowledge IDs by outcome IDs
 */
export async function getAllKeyKnowledgeByOutcomeIds(outcomeIds: number[]): Promise<number[]> {
	if (!outcomeIds.length) return [];
	
	const results = await db
		.select({ id: table.keyKnowledge.id })
		.from(table.keyKnowledge)
		.where(
			and(
				inArray(table.keyKnowledge.outcomeId, outcomeIds),
				eq(table.keyKnowledge.isArchived, false)
			)
		)
		.orderBy(table.keyKnowledge.number);
	
	return results.map(result => result.id);
}

/**
 * Get all key skill IDs by outcome IDs
 */
export async function getAllKeySkillsByOutcomeIds(outcomeIds: number[]): Promise<number[]> {
	if (!outcomeIds.length) return [];
	
	const results = await db
		.select({ id: table.keySkill.id })
		.from(table.keySkill)
		.where(
			and(
				inArray(table.keySkill.outcomeId, outcomeIds),
				eq(table.keySkill.isArchived, false)
			)
		)
		.orderBy(table.keySkill.number);
	
	return results.map(result => result.id);
}

/**
 * Get key knowledge by topic
 */
export async function getKeyKnowledgeByTopic(topicId: number) {
	return await db
		.select()
		.from(table.keyKnowledge)
		.where(
			and(
				eq(table.keyKnowledge.outcomeTopicId, topicId),
				eq(table.keyKnowledge.isArchived, false)
			)
		)
		.orderBy(table.keyKnowledge.number);
}

/**
 * Get key knowledge by subject
 */
export async function getKeyKnowledgeBySubject(curriculumSubjectId: number) {
	return await db
		.select()
		.from(table.keyKnowledge)
		.where(
			and(
				eq(table.keyKnowledge.curriculumSubjectId, curriculumSubjectId),
				eq(table.keyKnowledge.isArchived, false)
			)
		)
		.orderBy(table.keyKnowledge.number);
}

/**
 * Get key skills by subject
 */
export async function getKeySkillsBySubject(curriculumSubjectId: number) {
	return await db
		.select()
		.from(table.keySkill)
		.where(
			and(
				eq(table.keySkill.curriculumSubjectId, curriculumSubjectId),
				eq(table.keySkill.isArchived, false)
			)
		)
		.orderBy(table.keySkill.number);
}

// ============================================================================
// LEARNING ACTIVITY METHODS
// ============================================================================

/**
 * Get learning activities by curriculum subject
 */
export async function getLearningActivitiesBySubject(curriculumSubjectId: number) {
	return await db
		.select()
		.from(table.curriculumLearningActivity)
		.where(
			and(
				eq(table.curriculumLearningActivity.curriculumSubjectId, curriculumSubjectId),
				eq(table.curriculumLearningActivity.isArchived, false)
			)
		)
		.orderBy(table.curriculumLearningActivity.id);
}

/**
 * Get learning activities by learning area
 */
export async function getLearningActivitiesByLearningArea(learningAreaId: number) {
	const activities = await db
		.select({
			activity: table.curriculumLearningActivity
		})
		.from(table.curriculumLearningActivity)
		.innerJoin(
			table.learningActivityLearningArea,
			eq(table.curriculumLearningActivity.id, table.learningActivityLearningArea.curriculumLearningActivityId)
		)
		.where(
			and(
				eq(table.learningActivityLearningArea.learningAreaId, learningAreaId),
				eq(table.curriculumLearningActivity.isArchived, false),
				eq(table.learningActivityLearningArea.isArchived, false)
			)
		)
		.orderBy(table.curriculumLearningActivity.id);

	return activities.map(row => row.activity);
}

/**
 * Get learning activities by outcome
 */
export async function getLearningActivitiesByOutcome(outcomeId: number) {
	const activities = await db
		.select({
			activity: table.curriculumLearningActivity
		})
		.from(table.curriculumLearningActivity)
		.innerJoin(
			table.learningActivityOutcome,
			eq(table.curriculumLearningActivity.id, table.learningActivityOutcome.curriculumLearningActivityId)
		)
		.where(
			and(
				eq(table.learningActivityOutcome.outcomeId, outcomeId),
				eq(table.curriculumLearningActivity.isArchived, false),
				eq(table.learningActivityOutcome.isArchived, false)
			)
		)
		.orderBy(table.curriculumLearningActivity.id);

	return activities.map(row => row.activity);
}

/**
 * Get learning activities by topic (through key knowledge relationships)
 */
export async function getLearningActivitiesByTopic(topicId: number) {
	// Get key knowledge for this topic
	const keyKnowledge = await getKeyKnowledgeByTopic(topicId);
	const keyKnowledgeIds = keyKnowledge.map(kk => kk.id);
	
	if (keyKnowledgeIds.length === 0) {
		return [];
	}

	const activities = await db
		.select({
			activity: table.curriculumLearningActivity
		})
		.from(table.curriculumLearningActivity)
		.innerJoin(
			table.learningActivityKeyKnowledge,
			eq(table.curriculumLearningActivity.id, table.learningActivityKeyKnowledge.curriculumLearningActivityId)
		)
		.where(
			and(
				inArray(table.learningActivityKeyKnowledge.keyKnowledgeId, keyKnowledgeIds),
				eq(table.curriculumLearningActivity.isArchived, false),
				eq(table.learningActivityKeyKnowledge.isArchived, false)
			)
		)
		.orderBy(table.curriculumLearningActivity.id);

	return activities.map(row => row.activity);
}

/**
 * Get learning activity by ID with all relationships
 */
export async function getLearningActivityById(activityId: number) {
	const activity = await db
		.select()
		.from(table.curriculumLearningActivity)
		.where(
			and(
				eq(table.curriculumLearningActivity.id, activityId),
				eq(table.curriculumLearningActivity.isArchived, false)
			)
		)
		.limit(1);

	// Get related learning areas
	const learningAreas = await db
		.select({
			learningArea: table.learningArea
		})
		.from(table.learningArea)
		.innerJoin(
			table.learningActivityLearningArea,
			eq(table.learningArea.id, table.learningActivityLearningArea.learningAreaId)
		)
		.where(
			and(
				eq(table.learningActivityLearningArea.curriculumLearningActivityId, activityId),
				eq(table.learningActivityLearningArea.isArchived, false)
			)
		);

	// Get related outcomes
	const outcomes = await db
		.select({
			outcome: table.outcome
		})
		.from(table.outcome)
		.innerJoin(
			table.learningActivityOutcome,
			eq(table.outcome.id, table.learningActivityOutcome.outcomeId)
		)
		.where(
			and(
				eq(table.learningActivityOutcome.curriculumLearningActivityId, activityId),
				eq(table.learningActivityOutcome.isArchived, false)
			)
		);

	// Get related key knowledge
	const keyKnowledge = await db
		.select({
			keyKnowledge: table.keyKnowledge
		})
		.from(table.keyKnowledge)
		.innerJoin(
			table.learningActivityKeyKnowledge,
			eq(table.keyKnowledge.id, table.learningActivityKeyKnowledge.keyKnowledgeId)
		)
		.where(
			and(
				eq(table.learningActivityKeyKnowledge.curriculumLearningActivityId, activityId),
				eq(table.learningActivityKeyKnowledge.isArchived, false)
			)
		);

	// Get related key skills
	const keySkills = await db
		.select({
			keySkill: table.keySkill
		})
		.from(table.keySkill)
		.innerJoin(
			table.learningActivityKeySkill,
			eq(table.keySkill.id, table.learningActivityKeySkill.keySkillId)
		)
		.where(
			and(
				eq(table.learningActivityKeySkill.curriculumLearningActivityId, activityId),
				eq(table.learningActivityKeySkill.isArchived, false)
			)
		);

	return {
		activity: activity[0],
		learningAreas: learningAreas.map(row => row.learningArea),
		outcomes: outcomes.map(row => row.outcome),
		keyKnowledge: keyKnowledge.map(row => row.keyKnowledge),
		keySkills: keySkills.map(row => row.keySkill)
	};
}

// ============================================================================
// SAMPLE ASSESSMENT METHODS
// ============================================================================

/**
 * Get sample assessments by curriculum subject
 */
export async function getSampleAssessmentsBySubject(curriculumSubjectId: number) {
	return await db
		.select()
		.from(table.sampleAssessment)
		.where(
			and(
				eq(table.sampleAssessment.curriculumSubjectId, curriculumSubjectId),
				eq(table.sampleAssessment.isArchived, false)
			)
		)
		.orderBy(table.sampleAssessment.title);
}

/**
 * Get sample assessments by learning area
 */
export async function getSampleAssessmentsByLearningArea(learningAreaId: number) {
	const assessments = await db
		.select({
			assessment: table.sampleAssessment
		})
		.from(table.sampleAssessment)
		.innerJoin(
			table.sampleAssessmentLearningArea,
			eq(table.sampleAssessment.id, table.sampleAssessmentLearningArea.sampleAssessmentId)
		)
		.where(
			and(
				eq(table.sampleAssessmentLearningArea.learningAreaId, learningAreaId),
				eq(table.sampleAssessment.isArchived, false),
				eq(table.sampleAssessmentLearningArea.isArchived, false)
			)
		)
		.orderBy(table.sampleAssessment.title);

	return assessments.map(row => row.assessment);
}

/**
 * Get sample assessments by outcome
 */
export async function getSampleAssessmentsByOutcome(outcomeId: number) {
	const assessments = await db
		.select({
			assessment: table.sampleAssessment
		})
		.from(table.sampleAssessment)
		.innerJoin(
			table.sampleAssessmentOutcome,
			eq(table.sampleAssessment.id, table.sampleAssessmentOutcome.sampleAssessmentId)
		)
		.where(
			and(
				eq(table.sampleAssessmentOutcome.outcomeId, outcomeId),
				eq(table.sampleAssessment.isArchived, false),
				eq(table.sampleAssessmentOutcome.isArchived, false)
			)
		)
		.orderBy(table.sampleAssessment.title);

	return assessments.map(row => row.assessment);
}

/**
 * Get sample assessments by topic (through key knowledge relationships)
 */
export async function getSampleAssessmentsByTopic(topicId: number) {
	// Get key knowledge for this topic
	const keyKnowledge = await getKeyKnowledgeByTopic(topicId);
	const keyKnowledgeIds = keyKnowledge.map(kk => kk.id);
	
	if (keyKnowledgeIds.length === 0) {
		return [];
	}

	const assessments = await db
		.select({
			assessment: table.sampleAssessment
		})
		.from(table.sampleAssessment)
		.innerJoin(
			table.sampleAssessmentKeyKnowledge,
			eq(table.sampleAssessment.id, table.sampleAssessmentKeyKnowledge.sampleAssessmentId)
		)
		.where(
			and(
				inArray(table.sampleAssessmentKeyKnowledge.keyKnowledgeId, keyKnowledgeIds),
				eq(table.sampleAssessment.isArchived, false),
				eq(table.sampleAssessmentKeyKnowledge.isArchived, false)
			)
		)
		.orderBy(table.sampleAssessment.title);

	return assessments.map(row => row.assessment);
}

/**
 * Get sample assessment by ID with all relationships
 */
export async function getSampleAssessmentById(assessmentId: number) {
	const assessment = await db
		.select()
		.from(table.sampleAssessment)
		.where(
			and(
				eq(table.sampleAssessment.id, assessmentId),
				eq(table.sampleAssessment.isArchived, false)
			)
		)
		.limit(1);

	// Get related learning areas
	const learningAreas = await db
		.select({
			learningArea: table.learningArea
		})
		.from(table.learningArea)
		.innerJoin(
			table.sampleAssessmentLearningArea,
			eq(table.learningArea.id, table.sampleAssessmentLearningArea.learningAreaId)
		)
		.where(
			and(
				eq(table.sampleAssessmentLearningArea.sampleAssessmentId, assessmentId),
				eq(table.sampleAssessmentLearningArea.isArchived, false)
			)
		);

	// Get related outcomes
	const outcomes = await db
		.select({
			outcome: table.outcome
		})
		.from(table.outcome)
		.innerJoin(
			table.sampleAssessmentOutcome,
			eq(table.outcome.id, table.sampleAssessmentOutcome.outcomeId)
		)
		.where(
			and(
				eq(table.sampleAssessmentOutcome.sampleAssessmentId, assessmentId),
				eq(table.sampleAssessmentOutcome.isArchived, false)
			)
		);

	// Get related key knowledge
	const keyKnowledge = await db
		.select({
			keyKnowledge: table.keyKnowledge
		})
		.from(table.keyKnowledge)
		.innerJoin(
			table.sampleAssessmentKeyKnowledge,
			eq(table.keyKnowledge.id, table.sampleAssessmentKeyKnowledge.keyKnowledgeId)
		)
		.where(
			and(
				eq(table.sampleAssessmentKeyKnowledge.sampleAssessmentId, assessmentId),
				eq(table.sampleAssessmentKeyKnowledge.isArchived, false)
			)
		);

	// Get related key skills
	const keySkills = await db
		.select({
			keySkill: table.keySkill
		})
		.from(table.keySkill)
		.innerJoin(
			table.sampleAssessmentKeySkill,
			eq(table.keySkill.id, table.sampleAssessmentKeySkill.keySkillId)
		)
		.where(
			and(
				eq(table.sampleAssessmentKeySkill.sampleAssessmentId, assessmentId),
				eq(table.sampleAssessmentKeySkill.isArchived, false)
			)
		);

	return {
		assessment: assessment[0],
		learningAreas: learningAreas.map(row => row.learningArea),
		outcomes: outcomes.map(row => row.outcome),
		keyKnowledge: keyKnowledge.map(row => row.keyKnowledge),
		keySkills: keySkills.map(row => row.keySkill)
	};
}

// ============================================================================
// DETAILED EXAMPLE METHODS
// ============================================================================

/**
 * Get detailed examples by curriculum subject
 */
export async function getDetailedExamplesBySubject(curriculumSubjectId: number) {
	return await db
		.select()
		.from(table.detailedExample)
		.where(
			and(
				eq(table.detailedExample.curriculumSubjectId, curriculumSubjectId),
				eq(table.detailedExample.isArchived, false)
			)
		)
		.orderBy(table.detailedExample.title);
}

/**
 * Get detailed examples by learning area
 */
export async function getDetailedExamplesByLearningArea(learningAreaId: number) {
	const examples = await db
		.select({
			example: table.detailedExample
		})
		.from(table.detailedExample)
		.innerJoin(
			table.detailedExampleLearningArea,
			eq(table.detailedExample.id, table.detailedExampleLearningArea.detailedExampleId)
		)
		.where(
			and(
				eq(table.detailedExampleLearningArea.learningAreaId, learningAreaId),
				eq(table.detailedExample.isArchived, false),
				eq(table.detailedExampleLearningArea.isArchived, false)
			)
		)
		.orderBy(table.detailedExample.title);

	return examples.map(row => row.example);
}

/**
 * Get detailed examples by outcome
 */
export async function getDetailedExamplesByOutcome(outcomeId: number) {
	const examples = await db
		.select({
			example: table.detailedExample
		})
		.from(table.detailedExample)
		.innerJoin(
			table.detailedExampleOutcome,
			eq(table.detailedExample.id, table.detailedExampleOutcome.detailedExampleId)
		)
		.where(
			and(
				eq(table.detailedExampleOutcome.outcomeId, outcomeId),
				eq(table.detailedExample.isArchived, false),
				eq(table.detailedExampleOutcome.isArchived, false)
			)
		)
		.orderBy(table.detailedExample.title);

	return examples.map(row => row.example);
}

/**
 * Get detailed examples by topic (through key knowledge relationships)
 */
export async function getDetailedExamplesByTopic(topicId: number) {
	// Get key knowledge for this topic
	const keyKnowledge = await getKeyKnowledgeByTopic(topicId);
	const keyKnowledgeIds = keyKnowledge.map(kk => kk.id);
	
	if (keyKnowledgeIds.length === 0) {
		return [];
	}

	const examples = await db
		.select({
			example: table.detailedExample
		})
		.from(table.detailedExample)
		.innerJoin(
			table.detailedExampleKeyKnowledge,
			eq(table.detailedExample.id, table.detailedExampleKeyKnowledge.detailedExampleId)
		)
		.where(
			and(
				inArray(table.detailedExampleKeyKnowledge.keyKnowledgeId, keyKnowledgeIds),
				eq(table.detailedExample.isArchived, false),
				eq(table.detailedExampleKeyKnowledge.isArchived, false)
			)
		)
		.orderBy(table.detailedExample.title);

	return examples.map(row => row.example);
}

/**
 * Get detailed example by ID with all relationships
 */
export async function getDetailedExampleById(exampleId: number) {
	const example = await db
		.select()
		.from(table.detailedExample)
		.where(
			and(
				eq(table.detailedExample.id, exampleId),
				eq(table.detailedExample.isArchived, false)
			)
		)
		.limit(1);

	// Get related learning areas
	const learningAreas = await db
		.select({
			learningArea: table.learningArea
		})
		.from(table.learningArea)
		.innerJoin(
			table.detailedExampleLearningArea,
			eq(table.learningArea.id, table.detailedExampleLearningArea.learningAreaId)
		)
		.where(
			and(
				eq(table.detailedExampleLearningArea.detailedExampleId, exampleId),
				eq(table.detailedExampleLearningArea.isArchived, false)
			)
		);

	// Get related outcomes
	const outcomes = await db
		.select({
			outcome: table.outcome
		})
		.from(table.outcome)
		.innerJoin(
			table.detailedExampleOutcome,
			eq(table.outcome.id, table.detailedExampleOutcome.outcomeId)
		)
		.where(
			and(
				eq(table.detailedExampleOutcome.detailedExampleId, exampleId),
				eq(table.detailedExampleOutcome.isArchived, false)
			)
		);

	// Get related key knowledge
	const keyKnowledge = await db
		.select({
			keyKnowledge: table.keyKnowledge
		})
		.from(table.keyKnowledge)
		.innerJoin(
			table.detailedExampleKeyKnowledge,
			eq(table.keyKnowledge.id, table.detailedExampleKeyKnowledge.keyKnowledgeId)
		)
		.where(
			and(
				eq(table.detailedExampleKeyKnowledge.detailedExampleId, exampleId),
				eq(table.detailedExampleKeyKnowledge.isArchived, false)
			)
		);

	// Get related key skills
	const keySkills = await db
		.select({
			keySkill: table.keySkill
		})
		.from(table.keySkill)
		.innerJoin(
			table.detailedExampleKeySkill,
			eq(table.keySkill.id, table.detailedExampleKeySkill.keySkillId)
		)
		.where(
			and(
				eq(table.detailedExampleKeySkill.detailedExampleId, exampleId),
				eq(table.detailedExampleKeySkill.isArchived, false)
			)
		);

	return {
		example: example[0],
		learningAreas: learningAreas.map(row => row.learningArea),
		outcomes: outcomes.map(row => row.outcome),
		keyKnowledge: keyKnowledge.map(row => row.keyKnowledge),
		keySkills: keySkills.map(row => row.keySkill)
	};
}

// ============================================================================
// COMPREHENSIVE RETRIEVAL METHODS
// ============================================================================

/**
 * Get complete curriculum structure for a subject
 */
export async function getCompleteSubjectStructure(curriculumSubjectId: number) {
	const subject = await getCurriculumSubjectById(curriculumSubjectId);
	if (!subject) return null;

	const learningAreas = await getLearningAreasBySubject(curriculumSubjectId);
	const outcomes = await getOutcomesBySubject(curriculumSubjectId);
	const keyKnowledge = await getKeyKnowledgeBySubject(curriculumSubjectId);
	const keySkills = await getKeySkillsBySubject(curriculumSubjectId);
	const learningActivities = await getLearningActivitiesBySubject(curriculumSubjectId);
	const sampleAssessments = await getSampleAssessmentsBySubject(curriculumSubjectId);
	const detailedExamples = await getDetailedExamplesBySubject(curriculumSubjectId);

	// Get topics for all outcomes
	const topics = await Promise.all(
		outcomes.map(async (outcome) => ({
			outcome,
			topics: await getTopicsByOutcome(outcome.id)
		}))
	);

	return {
		subject: subject.subject,
		curriculum: subject.curriculum,
		learningAreas,
		outcomes,
		topics,
		keyKnowledge,
		keySkills,
		learningActivities,
		sampleAssessments,
		detailedExamples
	};
}

/**
 * Get complete learning area structure with all related content
 */
export async function getCompleteLearningAreaStructure(learningAreaId: number) {
	const learningAreaData = await getLearningAreaById(learningAreaId);
	if (!learningAreaData.learningArea) return null;

	const learningActivities = await getLearningActivitiesByLearningArea(learningAreaId);
	const sampleAssessments = await getSampleAssessmentsByLearningArea(learningAreaId);
	const detailedExamples = await getDetailedExamplesByLearningArea(learningAreaId);

	return {
		...learningAreaData,
		learningActivities,
		sampleAssessments,
		detailedExamples
	};
}

/**
 * Get complete outcome structure with all related content
 */
export async function getCompleteOutcomeStructure(outcomeId: number) {
	const outcomeData = await getOutcomeById(outcomeId);
	if (!outcomeData.outcome) return null;

	const keyKnowledge = await getKeyKnowledgeByOutcome(outcomeId);
	const keySkills = await getKeySkillsByOutcome(outcomeId);
	const learningActivities = await getLearningActivitiesByOutcome(outcomeId);
	const sampleAssessments = await getSampleAssessmentsByOutcome(outcomeId);
	const detailedExamples = await getDetailedExamplesByOutcome(outcomeId);

	return {
		...outcomeData,
		keyKnowledge,
		keySkills,
		learningActivities,
		sampleAssessments,
		detailedExamples
	};
}

/**
 * Search across all curriculum content
 */
export async function searchCurriculumContent(
	curriculumSubjectId: number,
	searchTerm: string
) {
	// TODO: Implement full-text search using ILIKE or full-text search capabilities
	// const searchPattern = `%${searchTerm.toLowerCase()}%`;

	// Search learning activities
	const learningActivities = await db
		.select()
		.from(table.curriculumLearningActivity)
		.where(
			and(
				eq(table.curriculumLearningActivity.curriculumSubjectId, curriculumSubjectId),
				eq(table.curriculumLearningActivity.isArchived, false)
				// TODO: Add ILIKE search on activity field
				// sql`${table.curriculumLearningActivity.activity} ILIKE ${searchPattern}`
			)
		);

	// Search sample assessments
	const sampleAssessments = await db
		.select()
		.from(table.sampleAssessment)
		.where(
			and(
				eq(table.sampleAssessment.curriculumSubjectId, curriculumSubjectId),
				eq(table.sampleAssessment.isArchived, false)
				// TODO: Add ILIKE search on title, task, description fields
			)
		);

	// Search detailed examples
	const detailedExamples = await db
		.select()
		.from(table.detailedExample)
		.where(
			and(
				eq(table.detailedExample.curriculumSubjectId, curriculumSubjectId),
				eq(table.detailedExample.isArchived, false)
				// TODO: Add ILIKE search on title, activity fields
			)
		);

	return {
		searchTerm,
		learningActivities,
		sampleAssessments,
		detailedExamples
	};
}

// ============================================================================
// UTILITY METHODS
// ============================================================================

/**
 * Get curriculum statistics
 */
export async function getCurriculumStatistics(curriculumSubjectId: number) {
	const [
		learningAreasCount,
		outcomesCount,
		keyKnowledgeCount,
		keySkillsCount,
		learningActivitiesCount,
		sampleAssessmentsCount,
		detailedExamplesCount
	] = await Promise.all([
		db.select({ count: table.learningArea.id }).from(table.learningArea)
			.where(and(
				eq(table.learningArea.curriculumSubjectId, curriculumSubjectId),
				eq(table.learningArea.isArchived, false)
			)),
		db.select({ count: table.outcome.id }).from(table.outcome)
			.where(and(
				eq(table.outcome.curriculumSubjectId, curriculumSubjectId),
				eq(table.outcome.isArchived, false)
			)),
		db.select({ count: table.keyKnowledge.id }).from(table.keyKnowledge)
			.where(and(
				eq(table.keyKnowledge.curriculumSubjectId, curriculumSubjectId),
				eq(table.keyKnowledge.isArchived, false)
			)),
		db.select({ count: table.keySkill.id }).from(table.keySkill)
			.where(and(
				eq(table.keySkill.curriculumSubjectId, curriculumSubjectId),
				eq(table.keySkill.isArchived, false)
			)),
		db.select({ count: table.curriculumLearningActivity.id }).from(table.curriculumLearningActivity)
			.where(and(
				eq(table.curriculumLearningActivity.curriculumSubjectId, curriculumSubjectId),
				eq(table.curriculumLearningActivity.isArchived, false)
			)),
		db.select({ count: table.sampleAssessment.id }).from(table.sampleAssessment)
			.where(and(
				eq(table.sampleAssessment.curriculumSubjectId, curriculumSubjectId),
				eq(table.sampleAssessment.isArchived, false)
			)),
		db.select({ count: table.detailedExample.id }).from(table.detailedExample)
			.where(and(
				eq(table.detailedExample.curriculumSubjectId, curriculumSubjectId),
				eq(table.detailedExample.isArchived, false)
			))
	]);

	return {
		learningAreas: learningAreasCount.length,
		outcomes: outcomesCount.length,
		keyKnowledge: keyKnowledgeCount.length,
		keySkills: keySkillsCount.length,
		learningActivities: learningActivitiesCount.length,
		sampleAssessments: sampleAssessmentsCount.length,
		detailedExamples: detailedExamplesCount.length
	};
}


// Formatting data for prompt injection based on IDs

/**
 * Format learning areas by IDs
 */
export async function formatLearningAreasByIds(learningAreaIds: number[]) {
    if (!learningAreaIds.length) return '';
    
    const learningAreas = await db
        .select({
            id: table.learningArea.id,
            name: table.learningArea.name,
            description: table.learningArea.description
        })
        .from(table.learningArea)
        .where(inArray(table.learningArea.id, learningAreaIds));
    
    return `## LEARNING AREAS
${learningAreas.map(la => 
    `[ID:${la.id}] ${la.name}
    ${la.description}`
).join('\n\n')}`;
}

/**
 * Format outcomes by IDs
 */
export async function formatOutcomesByIds(outcomeIds: number[]) {
    if (!outcomeIds.length) return '';
    
    const outcomes = await db
        .select({
            id: table.outcome.id,
            description: table.outcome.description
        })
        .from(table.outcome)
        .where(inArray(table.outcome.id, outcomeIds));
    
    return `## OUTCOMES
${outcomes.map(o => 
    `[ID:${o.id}] ${o.description}`
).join('\n')}`;
}

/**
 * Format key skills by IDs
 */
export async function formatKeySkillsByIds(keySkillIds: number[]) {
    if (!keySkillIds.length) return '';
    
    const keySkills = await db
        .select({
            id: table.keySkill.id,
            description: table.keySkill.description
        })
        .from(table.keySkill)
        .where(inArray(table.keySkill.id, keySkillIds));
    
    return `## KEY SKILLS
${keySkills.map(ks => 
    `[ID:${ks.id}] ${ks.description}`
).join('\n')}`;
}

/**
 * Format key knowledge by IDs
 */
export async function formatKeyKnowledgeByIds(keyKnowledgeIds: number[]) {
    if (!keyKnowledgeIds.length) return '';
    
    const keyKnowledge = await db
        .select({
            id: table.keyKnowledge.id,
            description: table.keyKnowledge.description
        })
        .from(table.keyKnowledge)
        .where(inArray(table.keyKnowledge.id, keyKnowledgeIds));
    
    return `## KEY KNOWLEDGE
${keyKnowledge.map(kk => 
    `[ID:${kk.id}] ${kk.description}`
).join('\n')}`;
}

/**
 * Format outcome topics by IDs
 */
export async function formatOutcomeTopicsByIds(topicIds: number[]) {
    if (!topicIds.length) return '';
    
    const topics = await db
        .select({
            id: table.outcomeTopic.id,
            name: table.outcomeTopic.name
        })
        .from(table.outcomeTopic)
        .where(inArray(table.outcomeTopic.id, topicIds));
    
    return `## TOPICS
${topics.map(t => 
    `[ID:${t.id}] ${t.name}`
).join('\n')}`;
}

/**
 * Format detailed examples based on various ID types
 */
export async function formatDetailedExamplesByContext(params: {
    outcomeIds?: number[];
    learningAreaIds?: number[];
    subjectId?: number;
    topicIds?: number[];
    keyKnowledgeIds?: number[];
    keySkillIds?: number[];
    amount?: number;
}) {
    const exampleIds = new Set<number>();
    
    // Collect example IDs from all relationships in parallel
    const queries = [];
    
    if (params.outcomeIds?.length) {
        queries.push(
            db.select({ id: table.detailedExampleOutcome.detailedExampleId })
                .from(table.detailedExampleOutcome)
                .where(inArray(table.detailedExampleOutcome.outcomeId, params.outcomeIds))
        );
    }
    
    if (params.learningAreaIds?.length) {
        queries.push(
            db.select({ id: table.detailedExampleLearningArea.detailedExampleId })
                .from(table.detailedExampleLearningArea)
                .where(inArray(table.detailedExampleLearningArea.learningAreaId, params.learningAreaIds))
        );
    }
    
    if (params.keyKnowledgeIds?.length) {
        queries.push(
            db.select({ id: table.detailedExampleKeyKnowledge.detailedExampleId })
                .from(table.detailedExampleKeyKnowledge)
                .where(inArray(table.detailedExampleKeyKnowledge.keyKnowledgeId, params.keyKnowledgeIds))
        );
    }
    
    if (params.keySkillIds?.length) {
        queries.push(
            db.select({ id: table.detailedExampleKeySkill.detailedExampleId })
                .from(table.detailedExampleKeySkill)
                .where(inArray(table.detailedExampleKeySkill.keySkillId, params.keySkillIds))
        );
    }
    
    if (params.subjectId) {
        queries.push(
            db.select({ id: table.detailedExample.id })
                .from(table.detailedExample)
                .where(eq(table.detailedExample.curriculumSubjectId, params.subjectId))
        );
    }
    
    // Execute all queries in parallel
    const results = await Promise.all(queries);
    
    // Collect all unique IDs
    results.forEach(result => {
        result.forEach(item => exampleIds.add(item.id));
    });
    
    if (!exampleIds.size) return '';
    
    let exampleIdArray = Array.from(exampleIds);
    
    // Randomize and limit if amount is specified
    if (params.amount && params.amount < exampleIdArray.length) {
        // Shuffle the array using Fisher-Yates algorithm
        for (let i = exampleIdArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [exampleIdArray[i], exampleIdArray[j]] = [exampleIdArray[j], exampleIdArray[i]];
        }
        exampleIdArray = exampleIdArray.slice(0, params.amount);
    }
    
    const detailedExamples = await db
        .select({
            id: table.detailedExample.id,
            title: table.detailedExample.title,
            activity: table.detailedExample.activity
        })
        .from(table.detailedExample)
        .where(
            and(
                inArray(table.detailedExample.id, exampleIdArray),
                eq(table.detailedExample.isArchived, false)
            )
        )
        .orderBy(table.detailedExample.title);
    
    return `## DETAILED EXAMPLES
${detailedExamples.map(de => 
    `[ID:${de.id}] ${de.title}
    Activity: ${de.activity}`
).join('\n\n')}`;
}

/**
 * Format curriculum learning activities based on various ID types
 */
export async function formatLearningActivitiesByContext(params: {
    outcomeIds?: number[];
    learningAreaIds?: number[];
    subjectId?: number;
    topicIds?: number[];
    keyKnowledgeIds?: number[];
    keySkillIds?: number[];
    amount?: number;
}) {
    const activityIds = new Set<number>();
    
    // Collect activity IDs from all relationships in parallel
    const queries = [];
    
    if (params.outcomeIds?.length) {
        queries.push(
            db.select({ id: table.learningActivityOutcome.curriculumLearningActivityId })
                .from(table.learningActivityOutcome)
                .where(inArray(table.learningActivityOutcome.outcomeId, params.outcomeIds))
        );
    }
    
    if (params.learningAreaIds?.length) {
        queries.push(
            db.select({ id: table.learningActivityLearningArea.curriculumLearningActivityId })
                .from(table.learningActivityLearningArea)
                .where(inArray(table.learningActivityLearningArea.learningAreaId, params.learningAreaIds))
        );
    }
    
    if (params.keyKnowledgeIds?.length) {
        queries.push(
            db.select({ id: table.learningActivityKeyKnowledge.curriculumLearningActivityId })
                .from(table.learningActivityKeyKnowledge)
                .where(inArray(table.learningActivityKeyKnowledge.keyKnowledgeId, params.keyKnowledgeIds))
        );
    }
    
    if (params.keySkillIds?.length) {
        queries.push(
            db.select({ id: table.learningActivityKeySkill.curriculumLearningActivityId })
                .from(table.learningActivityKeySkill)
                .where(inArray(table.learningActivityKeySkill.keySkillId, params.keySkillIds))
        );
    }
    
    if (params.subjectId) {
        queries.push(
            db.select({ id: table.curriculumLearningActivity.id })
                .from(table.curriculumLearningActivity)
                .where(eq(table.curriculumLearningActivity.curriculumSubjectId, params.subjectId))
        );
    }
    
    // Execute all queries in parallel
    const results = await Promise.all(queries);
    
    // Collect all unique IDs
    results.forEach(result => {
        result.forEach(item => activityIds.add(item.id));
    });
    
    if (!activityIds.size) return '';
    
    let activityIdArray = Array.from(activityIds);
    
    // Randomize and limit if amount is specified
    if (params.amount && params.amount < activityIdArray.length) {
        // Shuffle the array using Fisher-Yates algorithm
        for (let i = activityIdArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [activityIdArray[i], activityIdArray[j]] = [activityIdArray[j], activityIdArray[i]];
        }
        activityIdArray = activityIdArray.slice(0, params.amount);
    }
    
    const learningActivities = await db
        .select({
            id: table.curriculumLearningActivity.id,
            activity: table.curriculumLearningActivity.activity
        })
        .from(table.curriculumLearningActivity)
        .where(
            and(
                inArray(table.curriculumLearningActivity.id, activityIdArray),
                eq(table.curriculumLearningActivity.isArchived, false)
            )
        )
        .orderBy(table.curriculumLearningActivity.id);
    
    return `## LEARNING ACTIVITIES
${learningActivities.map(la => 
    `[ID:${la.id}] 
    Activity: ${la.activity}`
).join('\n\n')}`;
}

/**
 * Format sample assessments based on various ID types
 */
export async function formatSampleAssessmentsByContext(params: {
    outcomeIds?: number[];
    learningAreaIds?: number[];
    subjectId?: number;
    topicIds?: number[];
    keyKnowledgeIds?: number[];
    keySkillIds?: number[];
    amount?: number;
}) {
    const assessmentIds = new Set<number>();
    
    // Collect assessment IDs from all relationships in parallel
    const queries = [];
    
    if (params.outcomeIds?.length) {
        queries.push(
            db.select({ id: table.sampleAssessmentOutcome.sampleAssessmentId })
                .from(table.sampleAssessmentOutcome)
                .where(inArray(table.sampleAssessmentOutcome.outcomeId, params.outcomeIds))
        );
    }
    
    if (params.learningAreaIds?.length) {
        queries.push(
            db.select({ id: table.sampleAssessmentLearningArea.sampleAssessmentId })
                .from(table.sampleAssessmentLearningArea)
                .where(inArray(table.sampleAssessmentLearningArea.learningAreaId, params.learningAreaIds))
        );
    }
    
    if (params.keyKnowledgeIds?.length) {
        queries.push(
            db.select({ id: table.sampleAssessmentKeyKnowledge.sampleAssessmentId })
                .from(table.sampleAssessmentKeyKnowledge)
                .where(inArray(table.sampleAssessmentKeyKnowledge.keyKnowledgeId, params.keyKnowledgeIds))
        );
    }
    
    if (params.keySkillIds?.length) {
        queries.push(
            db.select({ id: table.sampleAssessmentKeySkill.sampleAssessmentId })
                .from(table.sampleAssessmentKeySkill)
                .where(inArray(table.sampleAssessmentKeySkill.keySkillId, params.keySkillIds))
        );
    }
    
    if (params.subjectId) {
        queries.push(
            db.select({ id: table.sampleAssessment.id })
                .from(table.sampleAssessment)
                .where(eq(table.sampleAssessment.curriculumSubjectId, params.subjectId))
        );
    }
    
    // Execute all queries in parallel
    const results = await Promise.all(queries);
    
    // Collect all unique IDs
    results.forEach(result => {
        result.forEach(item => assessmentIds.add(item.id));
    });
    
    if (!assessmentIds.size) return '';
    
    let assessmentIdArray = Array.from(assessmentIds);
    
    // Randomize and limit if amount is specified
    if (params.amount && params.amount < assessmentIdArray.length) {
        // Shuffle the array using Fisher-Yates algorithm
        for (let i = assessmentIdArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [assessmentIdArray[i], assessmentIdArray[j]] = [assessmentIdArray[j], assessmentIdArray[i]];
        }
        assessmentIdArray = assessmentIdArray.slice(0, params.amount);
    }
    
    const sampleAssessments = await db
        .select({
            id: table.sampleAssessment.id,
            title: table.sampleAssessment.title,
            task: table.sampleAssessment.task,
            description: table.sampleAssessment.description,
        })
        .from(table.sampleAssessment)
        .where(
            and(
                inArray(table.sampleAssessment.id, assessmentIdArray),
                eq(table.sampleAssessment.isArchived, false)
            )
        )
        .orderBy(table.sampleAssessment.title);
    
    return `## SAMPLE ASSESSMENTS
${sampleAssessments.map(sa => 
    `[ID:${sa.id}] ${sa.title}
    Task: ${sa.task}
    Description: ${sa.description}`
).join('\n\n')}`;
}

/**
 * Format exam questions based on various ID types
 */
export async function formatExamQuestionsByContext(params: {
    outcomeIds?: number[];
    learningAreaIds?: number[];
    subjectId?: number;
    topicIds?: number[];
    keyKnowledgeIds?: number[];
    keySkillIds?: number[];
    amount?: number;
}) {
    const questionIds = new Set<number>();
    
    // Collect question IDs from direct relationships in parallel
    const queries = [];
    
    if (params.learningAreaIds?.length) {
        queries.push(
            db.select({ id: table.examContent.id })
                .from(table.examContent)
                .where(inArray(table.examContent.learningAreaId, params.learningAreaIds))
        );
    }
    
    if (params.topicIds?.length) {
        queries.push(
            db.select({ id: table.examContent.id })
                .from(table.examContent)
                .where(inArray(table.examContent.outcomeTopicId, params.topicIds))
        );
    }
    
    if (params.subjectId) {
        queries.push(
            db.select({ id: table.examContent.id })
                .from(table.examContent)
                .where(eq(table.examContent.curriculumSubjectId, params.subjectId))
        );
    }
    
    // Execute all queries in parallel
    const results = await Promise.all(queries);
    
    // Collect all unique IDs (Set prevents duplicates)
    results.forEach(result => {
        result.forEach(item => questionIds.add(item.id));
    });
    
    if (!questionIds.size) return '';
    
    let questionIdArray = Array.from(questionIds);
    
    // Randomize and limit if amount is specified
    if (params.amount && params.amount < questionIdArray.length) {
        // Shuffle the array using Fisher-Yates algorithm
        for (let i = questionIdArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questionIdArray[i], questionIdArray[j]] = [questionIdArray[j], questionIdArray[i]];
        }
        questionIdArray = questionIdArray.slice(0, params.amount);
    }
    
    const examQuestions = await db
        .select({
            id: table.examContent.id,
            question: table.examContent.question,
            answer: table.examContent.answer,
            sampleResponse: table.examContent.sampleResponse
        })
        .from(table.examContent)
        .where(
            and(
                inArray(table.examContent.id, questionIdArray),
                eq(table.examContent.isArchived, false)
            )
        )
        .orderBy(table.examContent.id);

    return `## EXAM QUESTIONS
${examQuestions.map(eq => 
    `[ID:${eq.id}]
    Question: ${eq.question}
    Answer: ${eq.answer || 'Not provided'}
    Sample Response: ${eq.sampleResponse || 'Not provided'}`
).join('\n\n')}`;
}

/**
 * Comprehensive curriculum context formatter
 * Combines all formatting functions based on provided IDs
 */
export async function formatCompleteCurriculumContext(params: {
    learningAreaIds?: number[];
    outcomeIds?: number[];
    keySkillIds?: number[];
    keyKnowledgeIds?: number[];
    topicIds?: number[];
    subjectId?: number;
}) {
    const sections = [];
    
    // Format basic curriculum elements
    if (params.learningAreaIds?.length) {
        sections.push(await formatLearningAreasByIds(params.learningAreaIds));
    }
    
    if (params.outcomeIds?.length) {
        sections.push(await formatOutcomesByIds(params.outcomeIds));
    }
    
    if (params.keySkillIds?.length) {
        sections.push(await formatKeySkillsByIds(params.keySkillIds));
    }
    
    if (params.keyKnowledgeIds?.length) {
        sections.push(await formatKeyKnowledgeByIds(params.keyKnowledgeIds));
    }
    
    if (params.topicIds?.length) {
        sections.push(await formatOutcomeTopicsByIds(params.topicIds));
    }

	if (!params.keySkillIds?.length || !params.keyKnowledgeIds?.length) {
		sections.push(await formatKeySkillsByIds(await getAllKeySkillsByOutcomeIds(params.outcomeIds ?? [])));
		sections.push(await formatKeyKnowledgeByIds(await getAllKeyKnowledgeByOutcomeIds(params.outcomeIds ?? [])));
	}
		

    // // Format related content
    // const contextParams = {
    //     outcomeIds: params.outcomeIds,
    //     learningAreaIds: params.learningAreaIds,
    //     subjectId: params.subjectId,
    //     topicIds: params.topicIds,
    //     keyKnowledgeIds: params.keyKnowledgeIds,
    //     keySkillIds: params.keySkillIds
    // };
    
    // sections.push(await formatDetailedExamplesByContext(contextParams));
    // sections.push(await formatLearningActivitiesByContext(contextParams));
    // sections.push(await formatSampleAssessmentsByContext(contextParams));
    // sections.push(await formatExamQuestionsByContext(contextParams));
    
    return sections.filter(s => s).join('\n\n---\n\n');
}

/**
 * Format context for a specific module subsection
 * Uses the IDs stored in the subsection to retrieve and format relevant data
 */
export async function formatSubSectionContext(subSection: {
	learningAreaIds?: number[];
	outcomeIds?: number[];
    keyKnowledgeIds?: number[];
    keySkillIds?: number[];
}, amount?: number) {
    const sections = [];
    
    // Format key knowledge and skills for this subsection
    if (subSection.keyKnowledgeIds?.length) {
        sections.push(await formatKeyKnowledgeByIds(subSection.keyKnowledgeIds));
    }
    
    if (subSection.keySkillIds?.length) {
        sections.push(await formatKeySkillsByIds(subSection.keySkillIds));
    }
    if (subSection.learningAreaIds?.length || subSection.outcomeIds?.length || subSection.keyKnowledgeIds?.length || subSection.keySkillIds?.length) {
        sections.push(await formatLearningActivitiesByContext({
            learningAreaIds: subSection.learningAreaIds,
            outcomeIds: subSection.outcomeIds,
            keyKnowledgeIds: subSection.keyKnowledgeIds,
            keySkillIds: subSection.keySkillIds,
            amount: amount
        }));
    }

	if (subSection.learningAreaIds?.length || subSection.outcomeIds?.length || subSection.keyKnowledgeIds?.length || subSection.keySkillIds?.length) {
        sections.push(await formatDetailedExamplesByContext({
            learningAreaIds: subSection.learningAreaIds,
            outcomeIds: subSection.outcomeIds,
            keyKnowledgeIds: subSection.keyKnowledgeIds,
            keySkillIds: subSection.keySkillIds,
            amount: amount
        }));
    }

    return sections.filter(s => s).join('\n\n---\n\n');
}