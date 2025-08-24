import * as table from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { yearLevelEnum } from '$lib/server/db/schema/curriculum';

// ============================================================================
// SCHOOL & SUBJECT MANAGEMENT METHODS
// ============================================================================

/**
 * Get first school (for seeding)
 */
export async function getFirstSchool() {
	const [school] = await db.select().from(table.school).limit(1);
	return school;
}

/**
 * Get first campus for a school (for seeding)
 */
export async function getFirstCampusForSchool(schoolId: number) {
	const [campus] = await db
		.select()
		.from(table.campus)
		.where(eq(table.campus.schoolId, schoolId))
		.limit(1);
	return campus;
}

/**
 * Get or create VCE subject
 */
export async function getOrCreateVCESubject(
	subjectName: string,
	schoolId: number,
	coreSubjectId: number
) {
	const existingSubject = await db
		.select()
		.from(table.subject)
		.where(
			and(
				eq(table.subject.schoolId, schoolId),
				eq(table.subject.name, `VCE ${subjectName}`)
			)
		);

	if (existingSubject.length > 0) {
		return { subject: existingSubject[0], isNew: false };
	}

	const [subject] = await db
		.insert(table.subject)
		.values({
			name: `VCE ${subjectName}`,
			schoolId: schoolId,
			coreSubjectId: coreSubjectId,
			yearLevel: yearLevelEnum.year10A, // VCE placeholder
			isArchived: false
		})
		.returning();

	return { subject, isNew: true };
}

/**
 * Create subject offering
 */
export async function createSubjectOffering(data: {
	subjectId: number;
	year: number;
	semester: number;
	campusId: number;
}) {
	const [subjectOffering] = await db
		.insert(table.subjectOffering)
		.values({
			...data,
			isArchived: false
		})
		.returning();

	return subjectOffering;
}

/**
 * Create subject offering class
 */
export async function createSubjectOfferingClass(data: {
	name: string;
	subOfferingId: number;
}) {
	return await db
		.insert(table.subjectOfferingClass)
		.values({
			...data,
			isArchived: false
		});
}

// ============================================================================
// MODULE SESSION & MEMORY MANAGEMENT METHODS
// ============================================================================

export type ModuleAgentMemory = {
	recentResponses: number[]; // IDs of moduleResponse records
	strugglingConcepts: Array<{
		concept: string;
		mistakeCount: number;
	}>;
	masteredConcepts: Array<{
		concept: string;
		confidenceLevel: 'low' | 'medium' | 'high';
	}>;
	questionHistory: Array<{
		taskBlockId: number;
		evaluation?: string;
		feedBack?: string;
		hintHistory?: Array<{
			hintText: string;
			concept: string;
			wasEffective: boolean;
		}>;
	}>;
};

/**
 * Get or create module session
 */
export async function getOrCreateModuleSession(
	userId: string,
	moduleId: number,
	sessionType: 'teach' | 'train'
) {
	// Check for existing session
	const existing = await db
		.select()
		.from(table.moduleSession)
		.where(
			and(
				eq(table.moduleSession.userId, userId),
				eq(table.moduleSession.moduleId, moduleId),
				eq(table.moduleSession.sessionType, sessionType)
			)
		)
		.limit(1);

	if (existing.length > 0) {
		return existing[0];
	}

	// Create new session
	const [newSession] = await db
		.insert(table.moduleSession)
		.values({
			userId,
			moduleId,
			sessionType
		})
		.returning();

	return newSession;
}

/**
 * Get module session by ID
 */
export async function getModuleSessionById(sessionId: number) {
	const [session] = await db
		.select()
		.from(table.moduleSession)
		.where(eq(table.moduleSession.id, sessionId))
		.limit(1);

	return session || null;
}

/**
 * Update session memory
 */
export async function updateSessionMemory(
	sessionId: number,
	memory: ModuleAgentMemory
) {
	await db
		.update(table.moduleSession)
		.set({
			agentMemory: memory,
			updatedAt: new Date()
		})
		.where(eq(table.moduleSession.id, sessionId));
}

/**
 * Complete session (mark as finished)
 */
export async function completeModuleSession(sessionId: number) {
	await db
		.update(table.moduleSession)
		.set({ updatedAt: new Date() })
		.where(eq(table.moduleSession.id, sessionId));
}

/**
 * Create module session (placeholder for module memory functionality)
 */
export async function createModuleSession(data: {
	moduleId: number;
	userId: number;
	sessionData: Record<string, unknown>;
}) {
	// This will be implemented when module schema is fully defined
	// For now, this is a placeholder
	console.log('Creating module session:', data);
	return { id: Date.now(), ...data };
}

/**
 * Store module memory (placeholder for module memory functionality)
 */
export async function storeModuleMemory(data: {
	sessionId: string;
	moduleId: number;
	memoryData: Record<string, unknown>;
}) {
	// This will be implemented when module schema is fully defined
	// For now, this is a placeholder
	console.log('Storing module memory:', data);
	return { id: Date.now(), ...data };
}