import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => ({
	subjectId: params.id,
});
