#!/usr/bin/env tsx

/**
 * VCE Curriculum Data Seeder
 * 
 * This script seeds the database with VCE curriculum data from JSON files
 * It automatically indexes key knowledge and key skills for proper referencing
 * 
 * Usage:
 *   npm run seed:vce
 *   or
 *   npx tsx src/lib/server/db/seed/run-vce-seeder.ts
 */

import { seedVCECurriculumData } from './vce-curriculum-seeder';

async function main() {
	try {
		console.log('🚀 Starting VCE curriculum data seeding process...');
		await seedVCECurriculumData();
		console.log('🎉 VCE curriculum data seeding completed successfully!');
		process.exit(0);
	} catch (error) {
		console.error('💥 Error during VCE curriculum seeding:', error);
		process.exit(1);
	}
}

main();
