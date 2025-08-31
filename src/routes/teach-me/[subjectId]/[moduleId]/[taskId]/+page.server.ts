import { getTaskById, getTaskBlocksByTaskId } from '$lib/server/db/service';
import { redirect } from '@sveltejs/kit';

export const load = async ({ params: { subjectId, moduleId, taskId }, url }) => {
	// Parse taskId
	let taskIdInt: number;
	try {
		taskIdInt = parseInt(taskId, 10);
	} catch {
		redirect(302, `/teach-me/${subjectId}/${moduleId}`);
	}

	// Get task and blocks
	const task = await getTaskById(taskIdInt);
	if (!task) {
		redirect(302, `/teach-me/${subjectId}/${moduleId}`);
	}

	const blocks = await getTaskBlocksByTaskId(taskIdInt);

	// Get view mode from URL parameters (default to ANSWER for teach-me context)
	const mode = url.searchParams.get('mode') || 'answer';

	return {
		task,
		blocks,
		mode,
		subjectId: parseInt(subjectId, 10),
		moduleId: parseInt(moduleId, 10),
		taskId: taskIdInt
	};
};
