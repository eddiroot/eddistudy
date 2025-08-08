import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error('DATABASE_URL is not set in environment variables');
}

const client = postgres(databaseUrl);
export const db = drizzle(client, { schema });

/**
 * Seeds the database with curriculum data including assessment tasks, learning activities,
 * and detailed examples with relationships to key knowledge and content dot points.
 * Handles multiple curriculum data formats (Mathematical Methods style and other subjects style).
 */
export async function seedCurriculumDataWithRelationships(subjectName: string, dataFileName: string) {
	console.log(`🎯 Starting ${subjectName} curriculum data seeding with relationships...`);

	try {
		// Read the curriculum data file
		const dataPath = join(process.cwd(), 'data', dataFileName);
		const fileContent = readFileSync(dataPath, 'utf-8');
		const data = JSON.parse(fileContent);

		// Get the existing subject
		const [subject] = await db
			.select()
			.from(schema.curriculumSubject)
			.where(eq(schema.curriculumSubject.name, subjectName))
			.limit(1);

		if (!subject) {
			console.log(`❌ ${subjectName} subject not found. Please run VCE seeder first.`);
			return;
		}

		console.log(`📚 Found subject: ${subject.name}`);

		// Get learning areas for this subject
		const learningAreas = await db
			.select()
			.from(schema.learningArea)
			.where(eq(schema.learningArea.curriculumSubjectId, subject.id));

		// Get learning area content (dot points) for mapping
		const learningAreaContents = await db
			.select()
			.from(schema.learningAreaContent);

		// Get outcomes for this subject
		const outcomes = await db
			.select()
			.from(schema.outcome)
			.where(eq(schema.outcome.curriculumSubjectId, subject.id));

		// Get key knowledge and key skills for this subject
		const keyKnowledge = await db
			.select()
			.from(schema.keyKnowledge)
			.where(eq(schema.keyKnowledge.curriculumSubjectId, subject.id));

		const keySkills = await db
			.select()
			.from(schema.keySkill)
			.where(eq(schema.keySkill.curriculumSubjectId, subject.id));

		console.log(`📊 Found ${learningAreas.length} learning areas, ${outcomes.length} outcomes, ${keyKnowledge.length} key knowledge items, ${keySkills.length} key skills`);

		// Process assessment tasks
		if (data.assessmentTasks && data.assessmentTasks.length > 0) {
			console.log(`🎯 Processing ${data.assessmentTasks.length} assessment tasks...`);

			for (const task of data.assessmentTasks) {
				if (!task.title) {
					console.log('⚠️ Skipping task without title');
					continue;
				}

				// Handle different task description formats
				const description = task.description || task.task || 'No description available';

				// Insert sample assessment
				const [assessmentRecord] = await db
					.insert(schema.sampleAssessment)
					.values({
						title: task.title,
						task: task.unit || 'Unknown Unit',
						description: description,
						curriculumSubjectId: subject.id,
						isArchived: false
					})
					.returning();

				console.log(`📝 Created assessment: ${task.title}`);

				// Link to learning areas and content dot points
				if (task.areasOfStudy) {
					for (const areaOfStudy of task.areasOfStudy) {
						// Find matching learning area by name
						const learningArea = learningAreas.find(la => 
							la.name?.toLowerCase().includes(areaOfStudy.name?.toLowerCase()) ||
							areaOfStudy.name?.toLowerCase().includes(la.name?.toLowerCase())
						);

						if (learningArea) {
							// Link to learning area
							await db
								.insert(schema.sampleAssessmentLearningArea)
								.values({
									sampleAssessmentId: assessmentRecord.id,
									learningAreaId: learningArea.id,
									isArchived: false
								});

							// Link to specific content dot points
							if (areaOfStudy.contentDotPoints) {
								for (const dotPoint of areaOfStudy.contentDotPoints) {
									const contentDotPointNumber = parseInt(dotPoint);
									if (!isNaN(contentDotPointNumber)) {
										// Find the learning area content with this number
										const learningAreaContent = learningAreaContents.find(lac =>
											lac.learningAreaId === learningArea.id && 
											lac.number === contentDotPointNumber
										);

										if (learningAreaContent) {
											await db
												.insert(schema.sampleAssessmentLearningAreaContent)
												.values({
													sampleAssessmentId: assessmentRecord.id,
													learningAreaContentId: learningAreaContent.id,
													isArchived: false
												});
										}
									}
								}
							}
						}
					}
				}

				// Link to outcomes, key knowledge, and key skills
				if (task.outcomes) {
					for (const taskOutcome of task.outcomes) {
						const outcomeNumber = parseInt(taskOutcome.outcomeNumber);
						if (!isNaN(outcomeNumber)) {
							const outcome = outcomes.find(o => o.number === outcomeNumber);
							
							if (outcome) {
								// Link to outcome
								await db
									.insert(schema.sampleAssessmentOutcome)
									.values({
										sampleAssessmentId: assessmentRecord.id,
										outcomeId: outcome.id,
										isArchived: false
									});

								// Link to specific key knowledge items
								if (taskOutcome.keyKnowledge) {
									for (const kkNumber of taskOutcome.keyKnowledge) {
										const keyKnowledgeNumber = parseInt(kkNumber);
										if (!isNaN(keyKnowledgeNumber)) {
											const keyKnowledgeItem = keyKnowledge.find(kk => 
												kk.outcomeId === outcome.id && kk.number === keyKnowledgeNumber
											);

											if (keyKnowledgeItem) {
												await db
													.insert(schema.sampleAssessmentKeyKnowledge)
													.values({
														sampleAssessmentId: assessmentRecord.id,
														keyKnowledgeId: keyKnowledgeItem.id,
														isArchived: false
													});
											}
										}
									}
								}

								// Link to specific key skills
								if (taskOutcome.keySkills) {
									for (const ksNumber of taskOutcome.keySkills) {
										const keySkillNumber = parseInt(ksNumber);
										if (!isNaN(keySkillNumber)) {
											const keySkillItem = keySkills.find(ks => 
												ks.outcomeId === outcome.id && ks.number === keySkillNumber
											);

											if (keySkillItem) {
												await db
													.insert(schema.sampleAssessmentKeySkill)
													.values({
														sampleAssessmentId: assessmentRecord.id,
														keySkillId: keySkillItem.id,
														isArchived: false
													});
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}

		// Process learning activities
		if (data.learningActivities && data.learningActivities.length > 0) {
			console.log(`📚 Processing ${data.learningActivities.length} learning activities...`);

			for (const activity of data.learningActivities) {
				// Handle different learning activity formats
				let activityTitle, activityDescription, activityUnit, activityAreaOfStudy, activityOutcome;

				// Mathematical Methods format vs other subjects format
				if (activity.title && activity.description) {
					// Mathematical Methods format
					activityTitle = activity.title;
					activityDescription = activity.description;
					activityUnit = activity.unit;
				} else if (activity.activity) {
					// Other subjects format
					activityTitle = activity.topic || `Learning Activity ${activity.unit}-${activity.areaOfStudy}`;
					activityDescription = activity.activity;
					activityUnit = activity.unit;
					activityAreaOfStudy = activity.areaOfStudy;
					activityOutcome = activity.outcome;
				} else {
					console.log('⚠️ Skipping learning activity without proper title or description');
					continue;
				}

				// Insert learning activity
				const [learningActivityRecord] = await db
					.insert(schema.curriculumLearningActivity)
					.values({
						activity: activityDescription,
						curriculumSubjectId: subject.id,
						isArchived: false
					})
					.returning();

				console.log(`📚 Created learning activity: ${activityTitle}`);

				// Link to learning areas and content dot points
				if (activity.areasOfStudy) {
					// Mathematical Methods format with areasOfStudy array
					await linkToAreasOfStudyAndContent(activity.areasOfStudy, learningActivityRecord.id, learningAreas, learningAreaContents, 'learningActivity');
				} else if (activityAreaOfStudy && activityOutcome) {
					// Other subjects format - find learning area by abbreviation or name
					const learningArea = learningAreas.find(la => 
						la.abbreviation === `U${activityUnit}A${activityAreaOfStudy}` ||
						la.name?.includes(`Unit ${activityUnit}`) && la.name?.includes(`Area of Study ${activityAreaOfStudy}`)
					);

					if (learningArea) {
						await db
							.insert(schema.learningActivityLearningArea)
							.values({
								curriculumLearningActivityId: learningActivityRecord.id,
								learningAreaId: learningArea.id,
								isArchived: false
							});
					}
				}

				// Link to outcomes, key knowledge, and key skills
				if (activity.outcomes) {
					await linkToOutcomesKeyKnowledgeSkills(activity.outcomes, learningActivityRecord.id, outcomes, keyKnowledge, keySkills, 'learningActivity');
				}
			}
		}

		// Process detailed examples
		if (data.detailedExamples && data.detailedExamples.length > 0) {
			console.log(`📖 Processing ${data.detailedExamples.length} detailed examples...`);

			for (const example of data.detailedExamples) {
				if (!example.title || !example.content) {
					console.log('⚠️ Skipping detailed example without title or content');
					continue;
				}

				// Insert detailed example
				const [detailedExampleRecord] = await db
					.insert(schema.detailedExample)
					.values({
						title: example.title,
						activity: example.content,
						curriculumSubjectId: subject.id,
						isArchived: false
					})
					.returning();

				console.log(`📖 Created detailed example: ${example.title}`);

				// Link to learning areas
				const learningArea = learningAreas.find(la => 
					la.abbreviation === `U${example.unit}A${example.areaOfStudy}` ||
					la.name?.includes(`Unit ${example.unit}`) && la.name?.includes(`Area of Study ${example.areaOfStudy}`)
				);

				if (learningArea) {
					await db
						.insert(schema.detailedExampleLearningArea)
						.values({
							detailedExampleId: detailedExampleRecord.id,
							learningAreaId: learningArea.id,
							isArchived: false
						});

					// Also link to learning area content
					const relevantContent = learningAreaContents.filter(lac => 
						lac.learningAreaId === learningArea.id
					);

					for (const content of relevantContent) {
						await db
							.insert(schema.detailedExampleLearningAreaContent)
							.values({
								detailedExampleId: detailedExampleRecord.id,
								learningAreaContentId: content.id,
								isArchived: false
							});
					}
				}

				// Link to outcomes, key knowledge, and key skills
				if (example.outcome) {
					const outcome = outcomes.find(o => o.number === example.outcome);

					if (outcome) {
						await db
							.insert(schema.detailedExampleOutcome)
							.values({
								detailedExampleId: detailedExampleRecord.id,
								outcomeId: outcome.id,
								isArchived: false
							});

						// Link to key knowledge for this outcome
						const outcomeKeyKnowledge = keyKnowledge.filter(kk => kk.outcomeId === outcome.id);
						for (const kk of outcomeKeyKnowledge) {
							await db
								.insert(schema.detailedExampleKeyKnowledge)
								.values({
									detailedExampleId: detailedExampleRecord.id,
									keyKnowledgeId: kk.id,
									isArchived: false
								});
						}

						// Link to key skills for this outcome
						const outcomeKeySkills = keySkills.filter(ks => ks.outcomeId === outcome.id);
						for (const ks of outcomeKeySkills) {
							await db
								.insert(schema.detailedExampleKeySkill)
								.values({
									detailedExampleId: detailedExampleRecord.id,
									keySkillId: ks.id,
									isArchived: false
								});
						}
					}
				}
			}
		}

		console.log(`✅ ${subjectName} curriculum data seeding completed successfully`);

	} catch (error) {
		console.error(`❌ Error seeding ${subjectName} curriculum data:`, error);
		throw error;
	}
}

/**
 * Helper function to link assessment tasks/learning activities to areas of study and content
 */
async function linkToAreasOfStudyAndContent(
	areasOfStudy: Array<{ name?: string; contentDotPoints?: string[] }>, 
	recordId: number, 
	learningAreas: Array<typeof schema.learningArea.$inferSelect>, 
	learningAreaContents: Array<typeof schema.learningAreaContent.$inferSelect>, 
	type: 'assessment' | 'learningActivity'
) {
	for (const areaOfStudy of areasOfStudy) {
		// Find matching learning area by name
		const learningArea = learningAreas.find(la => 
			(la.name && areaOfStudy.name && la.name.toLowerCase().includes(areaOfStudy.name.toLowerCase())) ||
			(areaOfStudy.name && la.name && areaOfStudy.name.toLowerCase().includes(la.name.toLowerCase()))
		);

		if (learningArea) {
			// Link to learning area
			if (type === 'assessment') {
				await db
					.insert(schema.sampleAssessmentLearningArea)
					.values({
						sampleAssessmentId: recordId,
						learningAreaId: learningArea.id,
						isArchived: false
					});
			} else {
				await db
					.insert(schema.learningActivityLearningArea)
					.values({
						curriculumLearningActivityId: recordId,
						learningAreaId: learningArea.id,
						isArchived: false
					});
			}

			// Link to specific content dot points
			if (areaOfStudy.contentDotPoints) {
				for (const dotPoint of areaOfStudy.contentDotPoints) {
					const contentDotPointNumber = parseInt(dotPoint);
					if (!isNaN(contentDotPointNumber)) {
						// Find the learning area content with this number
						const learningAreaContent = learningAreaContents.find(lac =>
							lac.learningAreaId === learningArea.id && 
							lac.number === contentDotPointNumber
						);

						if (learningAreaContent) {
							if (type === 'assessment') {
								await db
									.insert(schema.sampleAssessmentLearningAreaContent)
									.values({
										sampleAssessmentId: recordId,
										learningAreaContentId: learningAreaContent.id,
										isArchived: false
									});
							} else {
								await db
									.insert(schema.learningActivityLearningAreaContent)
									.values({
										curriculumLearningActivityId: recordId,
										learningAreaContentId: learningAreaContent.id,
										isArchived: false
									});
							}
						}
					}
				}
			}
		}
	}
}

/**
 * Helper function to link to outcomes, key knowledge, and key skills
 */
async function linkToOutcomesKeyKnowledgeSkills(
	taskOutcomes: Array<{ outcomeNumber: string; keyKnowledge?: string[]; keySkills?: string[] }>, 
	recordId: number, 
	outcomes: Array<typeof schema.outcome.$inferSelect>, 
	keyKnowledge: Array<typeof schema.keyKnowledge.$inferSelect>, 
	keySkills: Array<typeof schema.keySkill.$inferSelect>, 
	type: 'assessment' | 'learningActivity'
) {
	for (const taskOutcome of taskOutcomes) {
		const outcomeNumber = parseInt(taskOutcome.outcomeNumber);
		if (!isNaN(outcomeNumber)) {
			const outcome = outcomes.find(o => o.number === outcomeNumber);
			
			if (outcome) {
				// Link to outcome
				if (type === 'assessment') {
					await db
						.insert(schema.sampleAssessmentOutcome)
						.values({
							sampleAssessmentId: recordId,
							outcomeId: outcome.id,
							isArchived: false
						});
				} else {
					await db
						.insert(schema.learningActivityOutcome)
						.values({
							curriculumLearningActivityId: recordId,
							outcomeId: outcome.id,
							isArchived: false
						});
				}

				// Link to specific key knowledge items
				if (taskOutcome.keyKnowledge) {
					for (const kkNumber of taskOutcome.keyKnowledge) {
						const keyKnowledgeNumber = parseInt(kkNumber);
						if (!isNaN(keyKnowledgeNumber)) {
							const keyKnowledgeItem = keyKnowledge.find(kk => 
								kk.outcomeId === outcome.id && kk.number === keyKnowledgeNumber
							);

							if (keyKnowledgeItem) {
								if (type === 'assessment') {
									await db
										.insert(schema.sampleAssessmentKeyKnowledge)
										.values({
											sampleAssessmentId: recordId,
											keyKnowledgeId: keyKnowledgeItem.id,
											isArchived: false
										});
								} else {
									await db
										.insert(schema.learningActivityKeyKnowledge)
										.values({
											curriculumLearningActivityId: recordId,
											keyKnowledgeId: keyKnowledgeItem.id,
											isArchived: false
										});
								}
							}
						}
					}
				}

				// Link to specific key skills
				if (taskOutcome.keySkills) {
					for (const ksNumber of taskOutcome.keySkills) {
						const keySkillNumber = parseInt(ksNumber);
						if (!isNaN(keySkillNumber)) {
							const keySkillItem = keySkills.find(ks => 
								ks.outcomeId === outcome.id && ks.number === keySkillNumber
							);

							if (keySkillItem) {
								if (type === 'assessment') {
									await db
										.insert(schema.sampleAssessmentKeySkill)
										.values({
											sampleAssessmentId: recordId,
											keySkillId: keySkillItem.id,
											isArchived: false
										});
								} else {
									await db
										.insert(schema.learningActivityKeySkill)
										.values({
											curriculumLearningActivityId: recordId,
											keySkillId: keySkillItem.id,
											isArchived: false
										});
								}
							}
						}
					}
				}
			}
		}
	}
}
