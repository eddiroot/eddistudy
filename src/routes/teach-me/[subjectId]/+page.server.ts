import { error } from '@sveltejs/kit';
import { getSubjectByIdentifier, getModulesForSubject } from '$lib/server/db/service/module.js';

export async function load({ params }) {
	const { subjectId } = params;

	// Parse string ID to number if it's a valid number
	const parsedId = /^\d+$/.test(subjectId) ? parseInt(subjectId, 10) : subjectId;

	// Get the subject by ID or slug/identifier
	const subject = await getSubjectByIdentifier(parsedId);
	
	if (!subject) {
		error(404, 'Subject not found');
	}

	// Get all published modules for this subject
	const modules = await getModulesForSubject(subject.id);

	return {
		subject,
		modules,
		subjectId: subjectId // Pass the original subjectId for navigation
	};
}
