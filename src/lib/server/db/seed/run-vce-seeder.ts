#!/usr/bin/env tsx

import { seedVCECurriculumData } from './vce-curriculum-data-seeder.js';

async function main() {
	try {
		console.log('🌱 Starting VCE curriculum data seeding...');
		await seedVCECurriculumData();
		console.log('✅ VCE curriculum data seeding completed successfully!');
		process.exit(0);
	} catch (error) {
		console.error('❌ VCE curriculum data seeding failed:', error);
		process.exit(1);
	}
}

main();
