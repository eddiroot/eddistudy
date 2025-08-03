import { pgTable, text, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { timestamps } from './utils';

export const curriculum = pgTable('curriculum', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	name: text('name').notNull(),
	version: text('version').notNull(),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type Curriculum = typeof curriculum.$inferSelect;

export const curriculumSubject = pgTable('curriculum_subject', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	name: text('name').notNull(),
	curriculumId: integer('cur_id')
		.notNull()
		.references(() => curriculum.id, { onDelete: 'cascade' }),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type CurriculumSubject = typeof curriculumSubject.$inferSelect;

export const learningArea = pgTable('learning_area', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	curriculumSubjectId: integer('cur_sub_id')
		.notNull()
		.references(() => curriculumSubject.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	abbreviation: text('abbreviation'), // unit 1 area of study 1 U1A1
	description: text('description'),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type LearningArea = typeof learningArea.$inferSelect;

export const LearningAreaContent = pgTable('lrn_a_cont', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	learningAreaId: integer('lrn_a_id')
		.notNull()
		.references(() => learningArea.id, { onDelete: 'cascade' }),
	description: text('description').notNull(),
	number: integer('number').notNull(), // e.g. dot point 1/2/3
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type LearningAreaContent = typeof LearningAreaContent.$inferSelect;

export const outcome = pgTable('outcome', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	curriculumSubjectId: integer('cur_sub_id')
		.notNull()
		.references(() => curriculumSubject.id, { onDelete: 'cascade' }),
	number: integer('number').notNull(),
	description: text('description').notNull(),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type Outcome = typeof outcome.$inferSelect;

export const learningAreaOutcome = pgTable('lrn_a_outcome', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	learningAreaId: integer('lrn_a_id')
		.notNull()
		.references(() => learningArea.id, { onDelete: 'cascade' }),
	outcomeId: integer('out_id')
		.notNull()
		.references(() => outcome.id, { onDelete: 'cascade' }),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type LearningAreaOutcome = typeof learningAreaOutcome.$inferSelect;

export const outcomeTopic = pgTable('outcome_topic', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	outcomeId: integer('out_id')
		.notNull()
		.references(() => outcome.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type OutcomeTopic = typeof outcomeTopic.$inferSelect;

export const keySkill = pgTable('key_skill', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	description: text('description').notNull(),
	outcomeId: integer('out_id')
		.references(() => outcome.id, { onDelete: 'cascade' }),
	curriculumSubjectId: integer('cur_sub_id')
		.references(() => curriculumSubject.id, { onDelete: 'cascade' }),
	number: integer('number').notNull(), // e.g. 1/2/3
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type KeySkill = typeof keySkill.$inferSelect;

export const keyKnowledge = pgTable('key_knowledge', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	description: text('description').notNull(),
	outcomeId: integer('out_id')
		.references(() => outcome.id, { onDelete: 'cascade' }),
	outcomeTopicId: integer('out_topic_id')
		.references(() => outcomeTopic.id, { onDelete: 'cascade' }),
	curriculumSubjectId: integer('cur_sub_id')
		.references(() => curriculumSubject.id, { onDelete: 'cascade' }),
	number: integer('number').notNull(), // e.g. 1/2/3
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type KeyKnowledge = typeof keyKnowledge.$inferSelect;

export const curriculumLearningActivity = pgTable('curriculum_learning_activity', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	activity: text('activity').notNull(),
	curriculumSubjectId: integer('cur_sub_id')
		.notNull()
		.references(() => curriculumSubject.id, { onDelete: 'cascade' }),
	isArchived: boolean('is_archived').notNull().default(false),	
	...timestamps
});

export type CurriculumLearningActivity = typeof curriculumLearningActivity.$inferSelect;

export const learningActivityKeyKnowledge = pgTable('lrn_act_key_know', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	curriculumLearningActivityId: integer('cur_lrn_act_id')
		.notNull()
		.references(() => curriculumLearningActivity.id, { onDelete: 'cascade' }),
	keyKnowledgeId: integer('key_know_id')
		.notNull()
		.references(() => keyKnowledge.id, { onDelete: 'cascade' }),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type LearningActivityKeyKnowledge = typeof learningActivityKeyKnowledge.$inferSelect;

export const learningActivityKeySkill = pgTable('lrn_act_key_skill', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	curriculumLearningActivityId: integer('cur_lrn_act_id')
		.notNull()
		.references(() => curriculumLearningActivity.id, { onDelete: 'cascade' }),
	keySkillId: integer('key_skill_id')
		.notNull()
		.references(() => keySkill.id, { onDelete: 'cascade' }),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type LearningActivityKeySkill = typeof learningActivityKeySkill.$inferSelect;


export const learningActivityOutcome = pgTable('lrn_act_outcome', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	curriculumLearningActivityId: integer('cur_lrn_act_id')
		.notNull()
		.references(() => curriculumLearningActivity.id, { onDelete: 'cascade' }),
	outcomeId: integer('out_id')
		.notNull()
		.references(() => outcome.id, { onDelete: 'cascade' }),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});	

export type LearningActivityOutcome = typeof learningActivityOutcome.$inferSelect;

export const learningActivityLearningArea = pgTable('lrn_act_lrn_a', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	curriculumLearningActivityId: integer('cur_lrn_act_id')
		.notNull()
		.references(() => curriculumLearningActivity.id, { onDelete: 'cascade' }),
	learningAreaId: integer('lrn_a_id')
		.notNull()
		.references(() => learningArea.id, { onDelete: 'cascade' }),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type LearningActivityLearningArea = typeof learningActivityLearningArea.$inferSelect;

export const sampleAssessment = pgTable('sample_assessment', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	title: text('title'),
	task: text('task').notNull(),
	description: text('description'),
	curriculumSubjectId: integer('cur_sub_id')
		.notNull()
		.references(() => curriculumSubject.id, { onDelete: 'cascade' }),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type SampleAssessment = typeof sampleAssessment.$inferSelect;

export const sampleAssessmentOutcome = pgTable('sample_assessment_outcome', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	sampleAssessmentId: integer('sample_assessment_id')
		.notNull()
		.references(() => sampleAssessment.id, { onDelete: 'cascade' }),
	outcomeId: integer('out_id')
		.notNull()
		.references(() => outcome.id, { onDelete: 'cascade' }),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});	

export type SampleAssessmentOutcome = typeof sampleAssessmentOutcome.$inferSelect;

export const sampleAssessmentLearningArea = pgTable('sample_assessment_learning_area', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	sampleAssessmentId: integer('sample_assessment_id')
		.notNull()
		.references(() => sampleAssessment.id, { onDelete: 'cascade' }),
	learningAreaId: integer('lrn_a_id')
		.notNull()
		.references(() => learningArea.id, { onDelete: 'cascade' }),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});	

export type SampleAssessmentLearningArea = typeof sampleAssessmentLearningArea.$inferSelect;

export const sampleAssessmentKeyKnowledge = pgTable('sample_assessment_key_knowledge', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	sampleAssessmentId: integer('sample_assessment_id')
		.notNull()
		.references(() => sampleAssessment.id, { onDelete: 'cascade' }),
	keyKnowledgeId: integer('key_know_id')
		.notNull()
		.references(() => keyKnowledge.id, { onDelete: 'cascade' }),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type SampleAssessmentKeyKnowledge = typeof sampleAssessmentKeyKnowledge.$inferSelect;

export const sampleAssessmentKeySkill = pgTable('sample_assessment_key_skill', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	sampleAssessmentId: integer('sample_assessment_id')
		.notNull()	
		.references(() => sampleAssessment.id, { onDelete: 'cascade' }),
	keySkillId: integer('key_skill_id')
		.notNull()
		.references(() => keySkill.id, { onDelete: 'cascade' }),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps	
});

export const detailedExample = pgTable('detailed_example', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	title: text('title'),
	activity: text('activity').notNull(),
	curriculumSubjectId: integer('cur_sub_id')
		.notNull()
		.references(() => curriculumSubject.id, { onDelete: 'cascade' }),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type DetailedExample = typeof detailedExample.$inferSelect;

export const detailedExampleOutcome = pgTable('detailed_example_outcome', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	detailedExampleId: integer('detailed_example_id')
		.notNull()
		.references(() => detailedExample.id, { onDelete: 'cascade' }),
	outcomeId: integer('out_id')
		.notNull()
		.references(() => outcome.id, { onDelete: 'cascade' }),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type DetailedExampleOutcome = typeof detailedExampleOutcome.$inferSelect;

export const detailedExampleLearningArea = pgTable('detailed_example_learning_area', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	detailedExampleId: integer('detailed_example_id')
		.notNull()
		.references(() => detailedExample.id, { onDelete: 'cascade' }),
	learningAreaId: integer('lrn_a_id')
		.notNull()
		.references(() => learningArea.id, { onDelete: 'cascade' }),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type DetailedExampleLearningArea = typeof detailedExampleLearningArea.$inferSelect;



export enum yearLevelEnum {
	foundation = 'F',
	year1 = '1',
	year2 = '2',
	year3 = '3',
	year4 = '4',
	year5 = '5',
	year6 = '6',
	year7 = '7',
	year8 = '8',
	year9 = '9',
	year10 = '10',
	year10A = '10A'
}

export const yearLevelEnumPg = pgEnum('year_level', [
	yearLevelEnum.foundation,
	yearLevelEnum.year1,
	yearLevelEnum.year2,
	yearLevelEnum.year3,
	yearLevelEnum.year4,
	yearLevelEnum.year5,
	yearLevelEnum.year6,
	yearLevelEnum.year7,
	yearLevelEnum.year8,
	yearLevelEnum.year9,
	yearLevelEnum.year10,
	yearLevelEnum.year10A
]);

export const learningAreaStandard = pgTable('lrn_a_std', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	learningAreaId: integer('lrn_a_id')
		.notNull()
		.references(() => learningArea.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	yearLevel: yearLevelEnumPg().notNull(),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type LearningAreaStandard = typeof learningAreaStandard.$inferSelect;

export const standardElaboration = pgTable('std_elab', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	learningAreaStandardId: integer('lrn_a_std_id')
		.notNull()
		.references(() => learningAreaStandard.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	standardElaboration: text('cont_elab').notNull(),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type StandardElaboration = typeof standardElaboration.$inferSelect;

export enum extraContentTypeEnum {
	definition = 'definition',
	method = 'method',
	characteristic = 'characteristic'
}

export const extraContentTypeEnumPg = pgEnum('extra_content_type', [
	extraContentTypeEnum.definition,
	extraContentTypeEnum.method,
	extraContentTypeEnum.characteristic
]);

export const extraContent = pgTable('extra_content', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	description: text('description').notNull(),
	curriculumSubjectId: integer('cur_sub_id')
		.notNull()
		.references(() => curriculumSubject.id, { onDelete: 'cascade' }),
	extraContentType: extraContentTypeEnumPg().notNull(),
	isArchived: boolean('is_archived').notNull().default(false),
	...timestamps
});

export type ExtraContent = typeof extraContent.$inferSelect;