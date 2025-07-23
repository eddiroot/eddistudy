import { userTypeEnum } from '$lib/server/db/schema/user.js';
import { getUsersBySchoolIdAndType } from '$lib/server/db/service';

export const load = async ({ locals: { security } }) => {
	const user = security.isAuthenticated().isSchoolAdmin().getUser();
	const teachers = await getUsersBySchoolIdAndType(user.schoolId, userTypeEnum.teacher);
	return { teachers };
};
