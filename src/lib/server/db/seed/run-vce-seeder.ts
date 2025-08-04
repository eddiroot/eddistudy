#!/usr/bin/env tsx

/**
 * Simple script to seed the complete VCE curriculum
 */

import { seedVCECurriculumData } from './vce-curriculum-seeder';
import { seedCurriculumDataWithRelationships } from './mathematical-methods-seeder';

// Subject name to data file mapping
const SUBJECT_FILE_MAPPING: Record<string, string> = {
	'Accounting Units 1 and 2': 'accounting_curriculum_data.json',
	'Accounting Units 3 and 4': 'accounting_curriculum_data.json',
	'Biology Units 1 and 2': 'biology_curriculum_data.json',
	'Biology Units 3 and 4': 'biology_curriculum_data.json',
	'Business Management Units 1 and 2': 'business-management_curriculum_data.json',
	'Business Management Units 3 and 4': 'business-management_curriculum_data.json',
	'Chemistry Units 1 and 2': 'chemistry_curriculum_data.json',
	'Chemistry Units 3 and 4': 'chemistry_curriculum_data.json',
	'Economics Units 1 and 2': 'economics_curriculum_data.json',
	'Economics Units 3 and 4': 'economics_curriculum_data.json',
	'English Units 1 and 2': 'english_curriculum_data.json',
	'English Units 3 and 4': 'english_curriculum_data.json',
	'Foundation Mathematics 1 and 2': 'mathematical_methods_curriculum_data.json', // fallback
	'General Mathematics Units 1 and 2': 'general_mathematics_curriculum_data.json',
	'General Mathematics Units 3 and 4': 'general_mathematics_curriculum_data.json',
	'Health Units 1 and 2': 'health_and_human_development_curriculum_data.json',
	'Health Units 3 and 4': 'health_and_human_development_curriculum_data.json',
	'Legal Studies Units 1 and 2': 'legal_studies_curriculum_data.json',
	'Legal Studies Units 3 and 4': 'legal_studies_curriculum_data.json',
	'Literature Units 1 and 2': 'literature_curriculum_data.json',
	'Literature Units 3 and 4': 'literature_curriculum_data.json',
	'Methods Mathematics Units 1 and 2': 'mathematical_methods_curriculum_data.json',
	'Methods Mathematics Units 3 and 4': 'mathematical_methods_curriculum_data.json',
	'Physical Education Units 1 and 2': 'pe_curriculum_data.json',
	'Physical Education Units 3 and 4': 'pe_curriculum_data.json',
	'Physics Units 1 and 2': 'physics_curriculum_data.json',
	'Physics Units 3 and 4': 'physics_curriculum_data.json',
	'Psychology Units 1 and 2': 'psychology_curriculum_data.json',
	'Psychology Units 3 and 4': 'psychology_curriculum_data.json',
	'Specialist Mathematics Units 1 and 2': 'specialist_mathematics_curriculum_data.json',
	'Specialist Mathematics Units 3 and 4': 'specialist_mathematics_curriculum_data.json'
};

async function seedCompleteVCE() {
	console.log('🌟 Starting complete VCE curriculum seeding...');

	try {
		// Step 1: Create VCE curriculum and structure
		console.log('📚 Step 1: Seeding VCE curriculum structure...');
		await seedVCECurriculumData();

		// Step 2: Seed comprehensive content for all subjects
		console.log('🎯 Step 2: Seeding comprehensive VCE content...');
		
		// Import database utilities
		const { drizzle } = await import('drizzle-orm/postgres-js');
		const postgres = await import('postgres');
		const schema = await import('../schema');
		const { eq } = await import('drizzle-orm');
		
		const databaseUrl = process.env.DATABASE_URL;
		if (!databaseUrl) {
			throw new Error('DATABASE_URL is not set in environment variables');
		}
		
		const client = postgres.default(databaseUrl);
		const db = drizzle(client, { schema });

		// Get all subjects from database
		const subjects = await db
			.select()
			.from(schema.curriculumSubject)
			.innerJoin(schema.curriculum, eq(schema.curriculumSubject.curriculumId, schema.curriculum.id))
			.where(eq(schema.curriculum.name, 'VCE'));

		for (const subjectRow of subjects) {
			const subject = subjectRow.curriculum_subject;
			console.log(`🎯 Processing content for: ${subject.name}`);
			
			// Get the correct data file for this subject
			const dataFileName = SUBJECT_FILE_MAPPING[subject.name];
			if (!dataFileName) {
				console.log(`⚠️ No curriculum data file mapping found for ${subject.name}, skipping...`);
				continue;
			}
			
			try {
				await seedCurriculumDataWithRelationships(subject.name, dataFileName);
			} catch (error) {
				console.error(`⚠️ Error seeding ${subject.name}:`, error);
				console.error(`Continuing with next subject...`);
				continue;
			}
		}

		console.log('🎉 Complete VCE curriculum seeding finished successfully!');

	} catch (error) {
		console.error('❌ Error seeding complete VCE curriculum:', error);
		throw error;
	}
}

seedCompleteVCE().catch(console.error);
