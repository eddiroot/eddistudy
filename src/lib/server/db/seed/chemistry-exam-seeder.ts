#!/usr/bin/env tsx

/**
 * Seeds the database with Chemistry exam questions from JSON files
 * Connects questions to learning areas and outcome topics
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema';
import { eq, and } from 'drizzle-orm';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Seeds Chemistry exam questions into the examContent table
 */
export async function seedChemistryExamQuestions() {
	console.log('🧪 Starting Chemistry exam questions seeding...');

	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error('DATABASE_URL is not set in environment variables');
	}

	const client = postgres(databaseUrl);
	const db = drizzle(client, { schema });

	try {
		// Read the chemistry exam questions JSON file
		const chemistryDataPath = path.join(process.cwd(), 'data', 'exam-qustions', 'chemistry.json');
		const chemistryData = JSON.parse(readFileSync(chemistryDataPath, 'utf-8'));

		// Find the Chemistry Units 3 and 4 curriculum subject
		const [curriculumSubjectRow] = await db
			.select()
			.from(schema.curriculumSubject)
			.innerJoin(schema.curriculum, eq(schema.curriculumSubject.curriculumId, schema.curriculum.id))
			.where(
				and(
					eq(schema.curriculum.name, 'VCE'),
					eq(schema.curriculumSubject.name, chemistryData.curriculumSubject)
				)
			)
			.limit(1);

		if (!curriculumSubjectRow) {
			console.error('❌ Chemistry Units 3 and 4 curriculum subject not found');
			return;
		}

		const curriculumSubject = curriculumSubjectRow.curriculum_subject;
		console.log(`✅ Found curriculum subject: ${curriculumSubject.name} (ID: ${curriculumSubject.id})`);

		// Get all learning areas for this subject
		const learningAreas = await db
			.select()
			.from(schema.learningArea)
			.where(eq(schema.learningArea.curriculumSubjectId, curriculumSubject.id));

		// Create a mapping of abbreviation to learning area ID
		const learningAreaMap = new Map<string, number>();
		learningAreas.forEach(area => {
			if (area.abbreviation) {
				learningAreaMap.set(area.abbreviation, area.id);
			}
		});

		console.log(`✅ Found ${learningAreas.length} learning areas for Chemistry`);
		console.log(`📋 Available learning areas:`, Array.from(learningAreaMap.keys()).join(', '));

		// Get all outcome topics for this subject
		const outcomeTopics = await db
			.select({
				id: schema.outcomeTopic.id,
				name: schema.outcomeTopic.name,
				outcomeId: schema.outcomeTopic.outcomeId
			})
			.from(schema.outcomeTopic)
			.innerJoin(schema.outcome, eq(schema.outcomeTopic.outcomeId, schema.outcome.id))
			.where(eq(schema.outcome.curriculumSubjectId, curriculumSubject.id));

		// Create a mapping of topic name to outcome topic ID
		const outcomeTopicMap = new Map<string, number>();
		outcomeTopics.forEach(topic => {
			outcomeTopicMap.set(topic.name, topic.id);
		});

		console.log(`✅ Found ${outcomeTopics.length} outcome topics for Chemistry`);
		console.log(`📋 Available outcome topics:`, Array.from(outcomeTopicMap.keys()).slice(0, 10).join(', '), '...');

		// For now, we'll skip topic linking and use null for outcomeTopicId

		// Process each exam question
		let insertedCount = 0;
		let skippedCount = 0;

		for (const examQuestion of chemistryData.examQuestions) {
			try {
				// Get learning area ID from abbreviation
				const learningAreaId = learningAreaMap.get(examQuestion.learningArea);
				if (!learningAreaId) {
					console.warn(`⚠️ Learning area not found for abbreviation: ${examQuestion.learningArea}`);
					skippedCount++;
					continue;
				}

				// Skip topic linking for now - use null
				const outcomeTopicId = null;

				// Check if this exam question already exists
				const [existingQuestion] = await db
					.select()
					.from(schema.examContent)
					.where(
						and(
							eq(schema.examContent.question, examQuestion.question),
							eq(schema.examContent.curriculumSubjectId, curriculumSubject.id)
						)
					)
					.limit(1);

				if (existingQuestion) {
					console.log(`⏭️ Question already exists, skipping...`);
					skippedCount++;
					continue;
				}

				// Insert the exam question
				await db
					.insert(schema.examContent)
					.values({
						curriculumSubjectId: curriculumSubject.id,
						learningAreaId: learningAreaId,
						outcomeTopicId: outcomeTopicId,
						question: examQuestion.question,
						answer: examQuestion.answer,
						isArchived: false
					});

				insertedCount++;

				if (insertedCount % 10 === 0) {
					console.log(`📝 Inserted ${insertedCount} exam questions so far...`);
				}

			} catch (error) {
				console.error(`❌ Error processing exam question: ${examQuestion.question.substring(0, 50)}...`, error);
				skippedCount++;
			}
		}

		await client.end();

		console.log(`✅ Chemistry exam questions seeding completed successfully`);
		console.log(`📊 Statistics:`);
		console.log(`   - Total questions processed: ${chemistryData.examQuestions.length}`);
		console.log(`   - Questions inserted: ${insertedCount}`);
		console.log(`   - Questions skipped: ${skippedCount}`);

	} catch (error) {
		console.error('❌ Error seeding Chemistry exam questions:', error);
		await client.end();
		throw error;
	}
}

// Export the main seeding function
export { seedChemistryExamQuestions as default };

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
	seedChemistryExamQuestions().catch(console.error);
}
