import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as table from '../schema/index.js';
import { eq, and } from 'drizzle-orm';
import { yearLevelEnum } from '../schema/curriculum.js';

// Create database connection for seeder
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in environment variables');
}
const client = postgres(databaseUrl);
const db = drizzle(client, { schema: table });

// Interface for the various JSON structures we encounter
interface VCAAData {
	// Foundation Math nested structure
	curriculum?: {
		curriculumSubjects: Array<{
			name: string;
			learningAreas: Array<LearningAreaData>;
			outcomes: Array<OutcomeData>;
		}>;
	};
	
	// Direct structure (Biology, Legal Studies)
	id?: number;
	name?: string;
	learningAreas?: Array<LearningAreaData>;
	outcomes?: Array<OutcomeData>;
	keySkills?: Array<KeySkillData>;
	keyKnowledge?: Array<KeyKnowledgeData>;
}

interface LearningAreaData {
	id?: number;
	name: string;
	abbreviation?: string;
	description?: string;
	contents?: Array<{ description: string; number?: number }>;
}

interface OutcomeData {
	id?: number;
	number: number | string;
	description: string;
	abbreviation?: string;
	keySkills?: Array<KeySkillData>;
	keyKnowledge?: Array<KeyKnowledgeData>;
	topics?: Array<{ name: string; outcomeTopic?: string }>;
}

interface KeySkillData {
	id?: number;
	number?: string | number;
	description?: string;
	topicName?: string;
	outcomeTopic?: string;
	outcomeTopicId?: number;
	name?: string;
}

interface KeyKnowledgeData {
	id?: number;
	number?: string | number;
	description?: string;
	topicName?: string;
	outcomeTopic?: string;
	outcomeTopicId?: number;
	name?: string;
}

// Map JSON filenames to proper subject names
const subjectNameMap: Record<string, string> = {
	'accounting12': 'Accounting',
	'accounting34': 'Accounting',
	'biology12': 'Biology',
	'biology34': 'Biology',
	'busman12': 'Business Management',
	'busman34': 'Business Management',
	'chemistry12': 'Chemistry',
	'chemistry34': 'Chemistry',
	'economics12': 'Economics',
	'economics34': 'Economics',
	'english12': 'English',
	'english34': 'English',
	'foundation_math12': 'Foundation Mathematics',
	'general12': 'General Mathematics',
	'general34': 'General Mathematics',
	'health12': 'Health and Human Development',
	'health34': 'Health and Human Development',
	'legal12': 'Legal Studies',
	'legal34': 'Legal Studies',
	'literature12': 'Literature',
	'literature34': 'Literature',
	'methods12': 'Mathematical Methods',
	'methods34': 'Mathematical Methods',
	'pe12': 'Physical Education',
	'pe34': 'Physical Education',
	'physics12': 'Physics',
	'physics34': 'Physics',
	'psychology12': 'Psychology',
	'psychology34': 'Psychology',
	'spec12': 'Specialist Mathematics',
	'spec34': 'Specialist Mathematics'
};

function extractTopicName(item: KeySkillData | KeyKnowledgeData, outcomeTopics?: Array<{ name: string; outcomeTopic?: string }>): string | null {
	// Priority order: outcomeTopic > name > topicName
	if (item.outcomeTopic) return item.outcomeTopic;
	if (item.name) return item.name;
	if (item.topicName) return item.topicName;
	
	// Handle outcomeTopicId by using a generic topic name
	if (item.outcomeTopicId !== undefined) {
		return `Topic ${item.outcomeTopicId}`;
	}
	
	// If we have outcome topics, try to match
	if (outcomeTopics && outcomeTopics.length > 0) {
		return outcomeTopics[0].outcomeTopic || outcomeTopics[0].name;
	}
	
	return null;
}

function parseNumber(value: string | number | undefined): number {
	if (value === undefined || value === null) return 1;
	if (typeof value === 'number') return value;
	const parsed = parseInt(value.toString(), 10);
	return isNaN(parsed) ? 1 : parsed;
}

// Helper functions for direct database operations
async function getOrCreateCurriculum(name: string, version: string) {
	const [existing] = await db
		.select()
		.from(table.curriculum)
		.where(and(
			eq(table.curriculum.name, name),
			eq(table.curriculum.version, version)
		))
		.limit(1);
	
	if (existing) return existing;
	
	const [created] = await db
		.insert(table.curriculum)
		.values({
			name,
			version,
			isArchived: false
		})
		.returning();
	
	return created;
}

async function getOrCreateCurriculumSubject(name: string, curriculumId: number) {
	const [existing] = await db
		.select()
		.from(table.curriculumSubject)
		.where(and(
			eq(table.curriculumSubject.name, name),
			eq(table.curriculumSubject.curriculumId, curriculumId)
		))
		.limit(1);
	
	if (existing) return existing;
	
	const [created] = await db
		.insert(table.curriculumSubject)
		.values({
			name,
			curriculumId,
			isArchived: false
		})
		.returning();
	
	return created;
}

async function getFirstSchool() {
	const [school] = await db.select().from(table.school).limit(1);
	return school;
}

async function getFirstCampusForSchool(schoolId: number) {
	const [campus] = await db
		.select()
		.from(table.campus)
		.where(eq(table.campus.schoolId, schoolId))
		.limit(1);
	return campus;
}

async function getOrCreateVCESubject(name: string, schoolId: number, coreSubjectId: number) {
	const [existing] = await db
		.select()
		.from(table.subject)
		.where(and(
			eq(table.subject.name, name),
			eq(table.subject.schoolId, schoolId)
		))
		.limit(1);
	
	if (existing) return existing;
	
	const [created] = await db
		.insert(table.subject)
		.values({
			name,
			schoolId,
			coreSubjectId,
			yearLevel: yearLevelEnum.year10A, // VCE level
			isArchived: false
		})
		.returning();
	
	return created;
}

async function createSubjectOffering(subjectId: number, year: number, semester: number, campusId: number) {
	const [created] = await db
		.insert(table.subjectOffering)
		.values({
			subjectId,
			year,
			semester,
			campusId,
			isArchived: false
		})
		.returning();
	
	return created;
}

async function createSubjectOfferingClass(name: string, subOfferingId: number) {
	const [created] = await db
		.insert(table.subjectOfferingClass)
		.values({
			name,
			subOfferingId,
			isArchived: false
		})
		.returning();
	
	return created;
}

export async function seedVCECurriculumData() {
	try {
		console.log('🌱 Starting VCE curriculum data seeding...');

		// Get or create Victorian Curriculum
		const curriculum = await getOrCreateCurriculum(
			'Victorian Certificate of Education (VCE)',
			'2024'
		);

		// Get the first school and campus for creating offerings
		const school = await getFirstSchool();
		if (!school) {
			throw new Error('No school found. Please run the main seeder first.');
		}

		const campus = await getFirstCampusForSchool(school.id);
		if (!campus) {
			throw new Error('No campus found. Please run the main seeder first.');
		}

		// Read all JSON files from vcaa-vce-data
		const dataPath = join(process.cwd(), 'data', 'vcaa-vce-data');
		const files = readdirSync(dataPath).filter(f => f.endsWith('.json') && f !== 'default.json');

		console.log(`📁 Found ${files.length} VCE data files to process`);

		// Track created subjects to avoid duplicates
		const createdSubjects = new Map<string, number>();

		// Process each JSON file
		for (const file of files) {
			const filePath = join(dataPath, file);
			const fileBaseName = file.replace('.json', '');
			const subjectName = subjectNameMap[fileBaseName];
			
			if (!subjectName) {
				console.log(`⚠️  Skipping unknown file: ${file}`);
				continue;
			}

			// Determine unit level from filename
			const isUnits12 = fileBaseName.endsWith('12');
			const unitLevel = isUnits12 ? '1-2' : '3-4';

			console.log(`📚 Processing ${subjectName} Units ${unitLevel}...`);

			// Parse JSON data first to determine structure
			let rawData: VCAAData = JSON.parse(readFileSync(filePath, 'utf-8'));
			
			// Handle array-wrapped JSON (like methods34.json)
			if (Array.isArray(rawData) && rawData.length > 0) {
				rawData = rawData[0];
			}
			
			// Handle different JSON structures
			let subjectData: {
				name: string;
				learningAreas: Array<LearningAreaData>;
				outcomes: Array<OutcomeData>;
				keySkills: Array<KeySkillData>;
				keyKnowledge: Array<KeyKnowledgeData>;
			};

			if (rawData.curriculum?.curriculumSubjects?.[0]) {
				// Foundation Math structure
				const curriculumSubject = rawData.curriculum.curriculumSubjects[0];
				subjectData = {
					name: curriculumSubject.name,
					learningAreas: curriculumSubject.learningAreas || [],
					outcomes: curriculumSubject.outcomes || [],
					keySkills: [],
					keyKnowledge: []
				};
			} else {
				// Direct structure (Biology, Legal Studies)
				subjectData = {
					name: rawData.name || subjectName,
					learningAreas: rawData.learningAreas || [],
					outcomes: rawData.outcomes || [],
					keySkills: rawData.keySkills || [],
					keyKnowledge: rawData.keyKnowledge || []
				};
			}

			// Get or create curriculum subject
			let subjectId = createdSubjects.get(subjectName);
			
			if (!subjectId) {
				const subject = await getOrCreateCurriculumSubject(subjectName, curriculum.id);
				subjectId = subject.id;
				createdSubjects.set(subjectName, subjectId);
			}

			// Process learning areas with curriculum subject reference
			for (const area of subjectData.learningAreas) {
				// Build description from base description + contents
				let fullDescription = area.description || '';
				if (area.contents && area.contents.length > 0) {
					const contentsText = area.contents
						.map(content => content.description)
						.join('\n• ');
					if (contentsText) {
						fullDescription += fullDescription ? '\n\n• ' + contentsText : '• ' + contentsText;
					}
				}

				await db.insert(table.learningArea).values({
					curriculumSubjectId: subjectId,
					name: area.name,
					abbreviation: area.abbreviation,
					description: fullDescription || undefined,
					isArchived: false
				});
			}

			// Process outcomes with curriculum subject reference
			const outcomeMap = new Map<number | string, number>();
			for (const outcome of subjectData.outcomes) {
				const outcomeNumber = parseNumber(outcome.number);
				
				const [outcomeRecord] = await db.insert(table.outcome).values({
					curriculumSubjectId: subjectId,
					number: outcomeNumber,
					description: outcome.description,
					isArchived: false
				}).returning();

				outcomeMap.set(outcome.number, outcomeRecord.id);

				// Process key skills within outcome
				if (outcome.keySkills) {
					for (let i = 0; i < outcome.keySkills.length; i++) {
						const skill = outcome.keySkills[i];
						
						// Skip if description is missing
						if (!skill.description || skill.description.trim() === '') {
							console.log(`⚠️  Skipping key skill ${i + 1} - no description`);
							continue;
						}
						
						const topicName = extractTopicName(skill, outcome.topics);
						const skillNumber = skill.number !== undefined ? parseNumber(skill.number) : (i + 1);
						
						await db.insert(table.keySkill).values({
							curriculumSubjectId: subjectId,
							outcomeId: outcomeRecord.id,
							number: skillNumber,
							description: skill.description.trim(),
							topicName: topicName,
							isArchived: false
						});
					}
				}

				// Process key knowledge within outcome
				if (outcome.keyKnowledge) {
					for (let i = 0; i < outcome.keyKnowledge.length; i++) {
						const knowledge = outcome.keyKnowledge[i];
						
						// Skip if description is missing
						if (!knowledge.description || knowledge.description.trim() === '') {
							console.log(`⚠️  Skipping key knowledge ${i + 1} - no description`);
							continue;
						}
						
						const topicName = extractTopicName(knowledge, outcome.topics);
						const knowledgeNumber = knowledge.number !== undefined ? parseNumber(knowledge.number) : (i + 1);
						
						await db.insert(table.keyKnowledge).values({
							curriculumSubjectId: subjectId,
							outcomeId: outcomeRecord.id,
							number: knowledgeNumber,
							description: knowledge.description.trim(),
							topicName: topicName,
							isArchived: false
						});
					}
				}
			}

			// Process standalone key skills (not tied to specific outcomes)
			if (subjectData.keySkills && subjectData.keySkills.length > 0) {
				for (let i = 0; i < subjectData.keySkills.length; i++) {
					const skill = subjectData.keySkills[i];
					
					// Skip if description is missing
					if (!skill.description || skill.description.trim() === '') {
						console.log(`⚠️  Skipping standalone key skill ${i + 1} - no description`);
						continue;
					}
					
					const topicName = extractTopicName(skill);
					const skillNumber = skill.number !== undefined ? parseNumber(skill.number) : (i + 1);
					
					await db.insert(table.keySkill).values({
						curriculumSubjectId: subjectId,
						outcomeId: null,
						number: skillNumber,
						description: skill.description.trim(),
						topicName: topicName,
						isArchived: false
					});
				}
			}

			// Process standalone key knowledge (not tied to specific outcomes)
			if (subjectData.keyKnowledge && subjectData.keyKnowledge.length > 0) {
				for (let i = 0; i < subjectData.keyKnowledge.length; i++) {
					const knowledge = subjectData.keyKnowledge[i];
					
					// Skip if description is missing
					if (!knowledge.description || knowledge.description.trim() === '') {
						console.log(`⚠️  Skipping standalone key knowledge ${i + 1} - no description`);
						continue;
					}
					
					const topicName = extractTopicName(knowledge);
					const knowledgeNumber = knowledge.number !== undefined ? parseNumber(knowledge.number) : (i + 1);
					
					await db.insert(table.keyKnowledge).values({
						curriculumSubjectId: subjectId,
						outcomeId: null,
						number: knowledgeNumber,
						description: knowledge.description.trim(),
						topicName: topicName,
						isArchived: false
					});
				}
			}

			console.log(`  ✅ Processed ${subjectData.learningAreas.length} learning areas, ${subjectData.outcomes.length} outcomes`);
		}

		// Create core subjects for each curriculum subject
		console.log('📝 Creating core subjects...');
		
		const coreSubjectMap = new Map<string, number>();
		
		for (const [subjectName, curriculumSubjectId] of createdSubjects) {
			// Create core subject
			const [coreSubject] = await db.insert(table.coreSubject).values({
				name: subjectName,
				description: `VCE ${subjectName}`,
				curriculumSubjectId: curriculumSubjectId,
				schoolId: school.id,
				isArchived: false
			}).returning();

			coreSubjectMap.set(subjectName, coreSubject.id);
			console.log(`  ✅ Created core subject for ${subjectName}`);
		}

		// Create VCE subjects, offerings, and classes
		console.log('📝 Creating VCE subjects with offerings and classes...');
		
		for (const [subjectName ] of createdSubjects) {
			const coreSubjectId = coreSubjectMap.get(subjectName);
			if (!coreSubjectId) {
				console.log(`⚠️  No core subject found for ${subjectName}, skipping VCE subject creation`);
				continue;
			}

			// Create VCE subject
			const vceSubject = await getOrCreateVCESubject(subjectName, school.id, coreSubjectId);
			console.log(`  ✅ Created VCE subject for ${subjectName}`);

			// Create subject offerings for current year
			const currentYear = new Date().getFullYear();
			
			// Create offerings for both semesters
			for (const semester of [1, 2]) {
				const offering = await createSubjectOffering(vceSubject.id, currentYear, semester, campus.id);
				console.log(`  ✅ Created offering for ${subjectName} - ${currentYear} Semester ${semester}`);

				// Create a default class for each offering
				const className = `${subjectName} - Year ${currentYear} Semester ${semester}`;
				await createSubjectOfferingClass(className, offering.id);
				console.log(`    ✅ Created class: ${className}`);
			}
		}

		console.log('✅ VCE curriculum data seeded successfully!');
		
		const subjectCount = createdSubjects.size;
		const offeringCount = subjectCount * 2; // 2 semesters per subject
		const classCount = offeringCount; // 1 class per offering
		
		console.log(`
📊 VCE Curriculum Summary:
-- Curriculum: Victorian Certificate of Education (VCE)
-- Subjects Created: ${subjectCount}
-- Core Subjects: ${subjectCount}
-- VCE Subjects: ${subjectCount}
-- Subject Offerings: ${offeringCount}
-- Subject Classes: ${classCount}
		`);

	} catch (error) {
		console.error('❌ Error seeding VCE curriculum data:', error);
		throw error;
	}
}

// Export for use in main seeder
export { seedVCECurriculumData as default };
