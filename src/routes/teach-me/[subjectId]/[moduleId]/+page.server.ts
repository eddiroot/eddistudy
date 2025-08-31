import { getModuleWithContent, getSubjectByIdentifier } from '$lib/server/db/service';
import { redirect } from '@sveltejs/kit';

export const load = async ({ params: { subjectId, moduleId } }) => {
	// Parse moduleId
	let moduleIdInt: number;
	try {
		moduleIdInt = parseInt(moduleId, 10);
	} catch {
		redirect(302, '/teach-me');
	}

	// Parse subjectId
	let subjectIdInt: number;
	try {
		subjectIdInt = parseInt(subjectId, 10);
	} catch {
		redirect(302, '/teach-me');
	}

	// Get module with all sub-tasks and content
	const moduleWithContent = await getModuleWithContent(moduleIdInt);
	if (!moduleWithContent) {
		redirect(302, `/teach-me/${subjectId}`);
	}

	// Get subject information
	const subject = await getSubjectByIdentifier(subjectIdInt);
	if (!subject) {
		redirect(302, '/teach-me');
	}

	return {
		module: moduleWithContent,
		subject,
		subjectId: subjectIdInt,
		moduleId: moduleIdInt
	};
};
