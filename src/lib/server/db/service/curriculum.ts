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
export async function getSubjectById(subjectId: number) {
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
	const subject = await getSubjectById(curriculumSubjectId);
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
