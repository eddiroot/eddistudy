import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema';
import { eq, and } from 'drizzle-orm';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error('DATABASE_URL is not set in environment variables');
}

const client = postgres(databaseUrl);
export const db = drizzle(client, { schema });

/**
 * Seeds the database with VCE curriculum data from JSON files
 * Automatically indexes key knowledge and key skills for proper referencing
 */
export async function seedVCECurriculumData() {
	console.log('🌱 Starting VCE curriculum data seeding...');

	try {
		// First, ensure we have a VCE curriculum record
		const [curriculumRecord] = await db
			.insert(schema.curriculum)
			.values({
				name: 'VCE',
				version: 'v1.1 Feb 2022',
				isArchived: false
			})
			.onConflictDoNothing()
			.returning();

		if (!curriculumRecord) {
			console.log('VCE curriculum already exists, continuing with subject seeding...');
		}

		// Get the curriculum ID (either newly created or existing)
		const [existingCurriculum] = await db
			.select()
			.from(schema.curriculum)
			.where(eq(schema.curriculum.name, 'VCE'))
			.limit(1);

		if (!existingCurriculum) {
			throw new Error('Failed to create or find VCE curriculum');
		}

		const curriculumId = existingCurriculum.id;

		// Read all VCE data files
		const dataDir = join(process.cwd(), 'data', 'vcaa-vce-data');
		const files = readdirSync(dataDir).filter(file => 
			file.endsWith('.json') && file !== 'default.json'
		);

		console.log(`Found ${files.length} VCE subject files to process`);

		for (const file of files) {
			console.log(`Processing ${file}...`);
			await processSubjectFile(join(dataDir, file), curriculumId);
		}

		console.log('✅ VCE curriculum data seeding completed successfully');

	} catch (error) {
		console.error('❌ Error seeding VCE curriculum data:', error);
		throw error;
	}
}

/**
 * Processes a single subject JSON file and seeds the database
 */
async function processSubjectFile(filePath: string, curriculumId: number) {
	const fileContent = readFileSync(filePath, 'utf-8');
	const data = JSON.parse(fileContent);

	// Handle three different data structures:
	// 1. Direct structure (accounting12.json, etc.) - data is at root level
	// 2. Nested structure (foundation_math12.json, etc.) - data is in curriculum.curriculumSubjects[0]
	// 3. Array structure (methods34.json, etc.) - data is in array[0]
	let subjectData;
	
	if (Array.isArray(data) && data[0]) {
		// Array structure
		subjectData = data[0];
	} else if (data.curriculum?.curriculumSubjects?.[0]) {
		// Nested structure
		subjectData = data.curriculum.curriculumSubjects[0];
	} else if (data.name && data.learningAreas) {
		// Direct structure
		subjectData = data;
	} else {
		console.log(`⚠️ No subject data found in ${filePath}, skipping...`);
		return;
	}

	// Insert curriculum subject
	const [curriculumSubjectRecord] = await db
		.insert(schema.curriculumSubject)
		.values({
			name: subjectData.name,
			curriculumId: curriculumId,
			isArchived: subjectData.isArchived || false
		})
		.onConflictDoNothing()
		.returning();

	if (!curriculumSubjectRecord) {
		console.log(`Subject ${subjectData.name} already exists, skipping...`);
		return;
	}

	const curriculumSubjectId = curriculumSubjectRecord.id;

	// Insert learning areas
	const learningAreaMap = new Map<number, number>();
	for (const learningArea of subjectData.learningAreas || []) {
		const [learningAreaRecord] = await db
			.insert(schema.learningArea)
			.values({
				curriculumSubjectId: curriculumSubjectId,
				name: learningArea.name,
				abbreviation: learningArea.abbreviation,
				description: learningArea.description,
				isArchived: false
			})
			.returning();

		learningAreaMap.set(learningArea.id, learningAreaRecord.id);
	}

	// Insert outcomes with indexed key knowledge and key skills
	const outcomeMap = new Map<number, number>();
	for (const outcome of subjectData.outcomes || []) {
		const [outcomeRecord] = await db
			.insert(schema.outcome)
			.values({
				curriculumSubjectId: curriculumSubjectId,
				number: outcome.number,
				description: outcome.description,
				isArchived: false
			})
			.returning();

		outcomeMap.set(outcome.id, outcomeRecord.id);

		// Insert key knowledge with sequential indexing
		const keyKnowledgeItems = outcome.keyKnowledge || [];
		for (let i = 0; i < keyKnowledgeItems.length; i++) {
			const keyKnowledge = keyKnowledgeItems[i];
			// Handle both 'description' and 'name' fields for key knowledge
			const description = keyKnowledge.description || keyKnowledge.name;
			// Skip items with null or empty descriptions
			if (!description) {
				console.log(`⚠️ Skipping key knowledge with null/empty description for outcome ${outcome.number}`);
				continue;
			}
			await db
				.insert(schema.keyKnowledge)
				.values({
					description: description,
					outcomeId: outcomeRecord.id,
					curriculumSubjectId: curriculumSubjectId,
					number: i + 1, // Sequential indexing starting from 1
					isArchived: false
				});
		}

		// Insert key skills with sequential indexing
		const keySkillItems = outcome.keySkills || [];
		for (let i = 0; i < keySkillItems.length; i++) {
			const keySkill = keySkillItems[i];
			// Handle both 'description' and 'name' fields for key skills
			const description = keySkill.description || keySkill.name;
			// Skip items with null or empty descriptions
			if (!description) {
				console.log(`⚠️ Skipping key skill with null/empty description for outcome ${outcome.number}`);
				continue;
			}
			await db
				.insert(schema.keySkill)
				.values({
					description: description,
					outcomeId: outcomeRecord.id,
					curriculumSubjectId: curriculumSubjectId,
					number: i + 1, // Sequential indexing starting from 1
					isArchived: false
				});
		}
	}

	// Insert extra content (definitions, methods, characteristics)
	for (const extraContent of subjectData.extracontents || []) {
		await db
			.insert(schema.extraContent)
			.values({
				description: extraContent.description,
				curriculumSubjectId: curriculumSubjectId,
				extraContentType: extraContent.extraContentType as schema.extraContentTypeEnum,
				isArchived: false
			});
	}

	// Insert curriculum learning activities
	for (const activity of subjectData.activities || []) {
		await db
			.insert(schema.curriculumLearningActivity)
			.values({
				activity: activity.activity,
				curriculumSubjectId: curriculumSubjectId,
				isArchived: false
			});
	}

	// Insert detailed examples
	for (const example of subjectData.examples || []) {
		await db
			.insert(schema.detailedExample)
			.values({
				title: example.title,
				activity: example.activity,
				curriculumSubjectId: curriculumSubjectId,
				isArchived: false
			});
	}

	// Insert sample assessments
	for (const task of subjectData.tasks || []) {
		await db
			.insert(schema.sampleAssessment)
			.values({
				title: task.title,
				task: task.task,
				description: task.description,
				curriculumSubjectId: curriculumSubjectId,
				isArchived: false
			});
	}

	console.log(`✅ Successfully processed ${subjectData.name}`);
}

/**
 * Utility function to get key knowledge and key skills with their indexed numbers
 * for a specific outcome or curriculum subject
 */
export async function getIndexedKeyKnowledgeAndSkills(
	outcomeId?: number, 
	curriculumSubjectId?: number
) {
	// Build where conditions
	const keyKnowledgeConditions = [];
	const keySkillConditions = [];

	if (outcomeId) {
		keyKnowledgeConditions.push(eq(schema.keyKnowledge.outcomeId, outcomeId));
		keySkillConditions.push(eq(schema.keySkill.outcomeId, outcomeId));
	}

	if (curriculumSubjectId) {
		keyKnowledgeConditions.push(eq(schema.keyKnowledge.curriculumSubjectId, curriculumSubjectId));
		keySkillConditions.push(eq(schema.keySkill.curriculumSubjectId, curriculumSubjectId));
	}

	// Execute queries with proper conditions
	const keyKnowledgePromise = keyKnowledgeConditions.length > 0
		? db.select({
			id: schema.keyKnowledge.id,
			description: schema.keyKnowledge.description,
			number: schema.keyKnowledge.number,
			outcomeId: schema.keyKnowledge.outcomeId,
			curriculumSubjectId: schema.keyKnowledge.curriculumSubjectId
		})
		.from(schema.keyKnowledge)
		.where(keyKnowledgeConditions.length === 1 ? keyKnowledgeConditions[0] : and(...keyKnowledgeConditions))
		.orderBy(schema.keyKnowledge.number)
		: db.select({
			id: schema.keyKnowledge.id,
			description: schema.keyKnowledge.description,
			number: schema.keyKnowledge.number,
			outcomeId: schema.keyKnowledge.outcomeId,
			curriculumSubjectId: schema.keyKnowledge.curriculumSubjectId
		})
		.from(schema.keyKnowledge)
		.orderBy(schema.keyKnowledge.number);

	const keySkillsPromise = keySkillConditions.length > 0
		? db.select({
			id: schema.keySkill.id,
			description: schema.keySkill.description,
			number: schema.keySkill.number,
			outcomeId: schema.keySkill.outcomeId,
			curriculumSubjectId: schema.keySkill.curriculumSubjectId
		})
		.from(schema.keySkill)
		.where(keySkillConditions.length === 1 ? keySkillConditions[0] : and(...keySkillConditions))
		.orderBy(schema.keySkill.number)
		: db.select({
			id: schema.keySkill.id,
			description: schema.keySkill.description,
			number: schema.keySkill.number,
			outcomeId: schema.keySkill.outcomeId,
			curriculumSubjectId: schema.keySkill.curriculumSubjectId
		})
		.from(schema.keySkill)
		.orderBy(schema.keySkill.number);

	const [keyKnowledge, keySkills] = await Promise.all([
		keyKnowledgePromise,
		keySkillsPromise
	]);

	return {
		keyKnowledge,
		keySkills
	};
}

/**
 * Helper function to reference key knowledge or skills by their indexed number
 * Usage: "Refer to Key Knowledge item 3" or "Apply Key Skill 1 and 2"
 */
export async function getKeyKnowledgeByIndex(
	index: number, 
	outcomeId?: number, 
	curriculumSubjectId?: number
) {
	const conditions = [eq(schema.keyKnowledge.number, index)];

	if (outcomeId) {
		conditions.push(eq(schema.keyKnowledge.outcomeId, outcomeId));
	}

	if (curriculumSubjectId) {
		conditions.push(eq(schema.keyKnowledge.curriculumSubjectId, curriculumSubjectId));
	}

	const [result] = await db
		.select()
		.from(schema.keyKnowledge)
		.where(conditions.length === 1 ? conditions[0] : and(...conditions))
		.limit(1);

	return result;
}

export async function getKeySkillByIndex(
	index: number, 
	outcomeId?: number, 
	curriculumSubjectId?: number
) {
	const conditions = [eq(schema.keySkill.number, index)];

	if (outcomeId) {
		conditions.push(eq(schema.keySkill.outcomeId, outcomeId));
	}

	if (curriculumSubjectId) {
		conditions.push(eq(schema.keySkill.curriculumSubjectId, curriculumSubjectId));
	}

	const [result] = await db
		.select()
		.from(schema.keySkill)
		.where(conditions.length === 1 ? conditions[0] : and(...conditions))
		.limit(1);

	return result;
}

// Export the main seeding function
export { seedVCECurriculumData as default };
