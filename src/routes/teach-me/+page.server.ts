import { getAllSubjects } from '$lib/server/db/service/module.js';

export async function load() {
	// Get all subjects from database
	const subjects = await getAllSubjects();
	return { subjects };
}