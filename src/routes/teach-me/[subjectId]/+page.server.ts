import { error } from '@sveltejs/kit';
import { getCurriculumSubjectByIdentifier, getModulesForSubject } from '$lib/server/db/service/module.js';

export async function load({ params }) {
	const { subjectId } = params;

	// Try to parse as number first, otherwise treat as string identifier
	const identifier = !isNaN(Number(subjectId)) ? Number(subjectId) : subjectId;
	
	// Get the subject by slug/identifier
	const subject = await getCurriculumSubjectByIdentifier(identifier);
	
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
