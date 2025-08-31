export enum yearLevelEnum {
	none = 'N',
	foundation = 'F',
	year1 = '1',
	year2 = '2',
	year3 = '3',
	year4 = '4',
	year5 = '5',
	year6 = '6',
	year7 = '7',
	year8 = '8',
	year9 = '9',
	year10 = '10',
	year10A = '10A',
	year11 = '11',
	year12 = '12',
	year13 = '13'
}

export enum schoolSpaceTypeEnum {
	classroom = 'classroom',
	laboratory = 'laboratory',
	gymnasium = 'gymnasium',
	pool = 'pool',
	library = 'library',
	auditorium = 'auditorium'
}

export enum subjectThreadTypeEnum {
	discussion = 'discussion',
	question = 'question',
	announcement = 'announcement',
	qanda = 'qanda'
}

export enum subjectThreadResponseTypeEnum {
	comment = 'comment',
	answer = 'answer'
}

export enum taskTypeEnum {
	lesson = 'lesson',
	assessment = 'assessment',
	homework = 'homework',
	module = 'module'
}

export enum taskBlockTypeEnum {
	heading = 'heading',
	richText = 'rich_text',
	mathInput = 'math_input',
	image = 'image',
	video = 'video',
	audio = 'audio',
	fillBlank = 'fill_blank',
	choice = 'choice',
	whiteboard = 'whiteboard',
	matching = 'matching',
	shortAnswer = 'short_answer',
	close = 'close',
	highlightText = 'highlight_text'
}

export enum taskStatusEnum {
	draft = 'draft', // Lesson/Assessment/Homework
	inProgress = 'in_progress', // Lesson
	completed = 'completed', // Lesson
	published = 'published', //Assessment/Homework
	locked = 'locked', // Assessment/Homework
	graded = 'graded' // Assessment/Homework
}

export enum whiteboardObjectTypeEnum {
	rect = 'Rect',
	circle = 'Circle',
	path = 'Path',
	textbox = 'Textbox',
	image = 'Image'
}

export enum userTypeEnum {
	none = 'N',
	student = 'student',
	teacher = 'teacher',
	guardian = 'guardian',
	principal = 'principal',
	schoolAdmin = 'schoolAdmin',
	systemAdmin = 'systemAdmin'
}

export enum userHonorificEnum {
	mr = 'Mr',
	ms = 'Ms',
	mrs = 'Mrs',
	dr = 'Dr',
	prof = 'Prof'
}

export enum userGenderEnum {
	male = 'male',
	female = 'female',
	nonBinary = 'non-binary',
	other = 'other',
	unspecified = 'unspecified'
}

export enum relationshipTypeEnum {
	mother = 'mother',
	father = 'father',
	guardian = 'guardian'
}

export enum queueStatusEnum {
	queued = 'queued',
	inProgress = 'in_progress',
	completed = 'completed',
	failed = 'failed'
}
