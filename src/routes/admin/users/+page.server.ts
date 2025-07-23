import { getUsersBySchoolId } from '$lib/server/db/service';

export const load = async ({ locals: { security } }) => {
	const user = security.isAuthenticated().isSchoolAdmin().getUser();
	const users = await getUsersBySchoolId(user.schoolId);

	return { users };
};
