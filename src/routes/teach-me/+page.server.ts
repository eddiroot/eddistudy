import { getAllCurriculumSubjects } from '$lib/server/db/service/module.js';

export async function load() {
	// Get all curriculum subjects from database
	const subjects = await getAllCurriculumSubjects();
	return { subjects };
}