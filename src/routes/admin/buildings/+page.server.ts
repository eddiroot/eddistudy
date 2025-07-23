import { getBuildingsBySchoolId, getCampusesBySchoolId } from '$lib/server/db/service';
import { superValidate, withFiles, fail } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { validateCSVFile, parseCSVData } from '$lib/utils.js';
import { db } from '$lib/server/db/index.js';
import { schoolBuilding } from '$lib/server/db/schema';
import { optionalColumns, requiredColumns, buildingsImportSchema } from './schema';

export const load = async ({ locals: { security } }) => {
	const user = security.isAuthenticated().isSchoolAdmin().getUser();
	const buildings = await getBuildingsBySchoolId(user.schoolId);
	const form = await superValidate(zod(buildingsImportSchema));
	return { buildings, form };
};

export const actions = {
	default: async ({ request, locals: { security } }) => {
		const user = security.isAuthenticated().isSchoolAdmin().getUser();

		const formData = await request.formData();
		const form = await superValidate(formData, zod(buildingsImportSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const file = form.data.file;

			const validationResult = await validateCSVFile(file, requiredColumns, optionalColumns);

			if (!validationResult.isValid) {
				return fail(400, {
					form,
					error: 'CSV validation failed',
					validation: validationResult
				});
			}

			const csvText = await file.text();
			const csvData = parseCSVData(csvText);

			if (csvData.length === 0) {
				return fail(400, {
					form,
					error: 'CSV file contains no valid data rows',
					validation: validationResult
				});
			}

			const campuses = await getCampusesBySchoolId(user.schoolId);
			const campusMap = new Map(campuses.map((c) => [c.name.toLowerCase(), c.id]));

			const buildingsToInsert: Array<{
				name: string;
				campusId: number;
				description: string | null;
				isArchived: boolean;
			}> = [];

			for (const rowData of csvData) {
				const name = rowData['name']?.trim();
				const campusName = rowData['campusname']?.trim();
				const description = rowData['description']?.trim() || null;

				if (!name || !campusName) {
					continue;
				}

				const campusId = campusMap.get(campusName.toLowerCase());
				if (!campusId) {
					return fail(400, {
						form,
						error: `Campus "${campusName}" not found. Available campuses: ${campuses.map((c) => c.name).join(', ')}`,
						validation: validationResult
					});
				}

				buildingsToInsert.push({
					name,
					campusId: campusId, // campusId is guaranteed to be number at this point due to the check above
					description,
					isArchived: false
				});
			}

			if (buildingsToInsert.length === 0) {
				return fail(400, {
					form,
					error: 'No valid buildings found in CSV file',
					validation: validationResult
				});
			}

			await db.insert(schoolBuilding).values(buildingsToInsert);

			return withFiles({
				form,
				success: true
			});
		} catch (err) {
			console.error('Error importing buildings:', err);
			return fail(500, { form, error: 'Failed to import buildings' });
		}
	}
};
