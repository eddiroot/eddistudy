import { fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { markAbsentSchema } from './schema.js';
import { getGuardiansChildrensScheduleWithAttendanceByUserId } from '$lib/server/db/service';
import {
	getSubjectClassAllocationsByUserIdForDate,
	upsertSubjectClassAllocationAttendance
} from '$lib/server/db/service/subjects';
import type {
	User,
	Subject,
	SubjectOfferingClass,
	SubjectClassAllocation,
	SubjectClassAllocationAttendance
} from '$lib/server/db/schema';

export type ScheduleWithAttendanceRecord = {
	user: Pick<User, 'id' | 'firstName' | 'middleName' | 'lastName' | 'avatarUrl'>;
	subjectClassAllocation: Pick<SubjectClassAllocation, 'id' | 'startTimestamp' | 'endTimestamp'>;
	subjectOfferingClass: Pick<SubjectOfferingClass, 'id' | 'name'>;
	subject: Pick<Subject, 'name'>;
	attendance: SubjectClassAllocationAttendance | null;
};

function groupRecordsByUserId(
	records: ScheduleWithAttendanceRecord[]
): Record<string, ScheduleWithAttendanceRecord[]> {
	return records.reduce<Record<string, ScheduleWithAttendanceRecord[]>>((acc, record) => {
		const userId = record.user.id;
		if (!acc[userId]) {
			acc[userId] = [];
		}
		acc[userId].push(record);
		return acc;
	}, {});
}

function validateAttendanceDate(date: Date): {
	isValid: boolean;
	error?: string;
	date?: Date;
} {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	if (date < today) {
		return { isValid: false, error: 'Cannot mark attendance for past dates' };
	}

	return { isValid: true, date };
}

async function markStudentAbsent(studentId: string, date: Date, note: string): Promise<number> {
	const classAllocations = await getSubjectClassAllocationsByUserIdForDate(studentId, date);

	for (const allocation of classAllocations) {
		await upsertSubjectClassAllocationAttendance(
			allocation.classAllocation.id,
			studentId,
			false, // Always mark as absent
			note || 'Marked absent by guardian'
		);
	}

	return classAllocations.length;
}

export const load = async ({ locals: { security } }) => {
	const user = security.isAuthenticated().isGuardian().getUser();

	const combinedData = await getGuardiansChildrensScheduleWithAttendanceByUserId(user.id);

	// Group by user ID
	const recordsByUserId = groupRecordsByUserId(combinedData);
	const form = await superValidate(zod(markAbsentSchema));

	return {
		user,
		recordsByUserId,
		form
	};
};

export const actions = {
	markAbsence: async ({ request, locals: { security } }) => {
		security.isAuthenticated().isGuardian();

		const form = await superValidate(request, zod(markAbsentSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { studentId, date, attendanceNote } = form.data;

		const dateValidation = validateAttendanceDate(date);
		if (!dateValidation.isValid) {
			return fail(400, { form, error: dateValidation.error });
		}

		try {
			const classCount = await markStudentAbsent(
				studentId,
				dateValidation.date!,
				attendanceNote || ''
			);

			return {
				form,
				success: true,
				message: `Successfully marked absent for ${classCount} classes`
			};
		} catch (error) {
			console.error('Error marking attendance:', error);
			return fail(500, { form, error: 'Failed to mark attendance' });
		}
	}
};
