import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '@/src/consts';
import { loadBlogCollection, loadNotesCollection } from '@/src/content.config';

export async function GET(context) {
	const posts = await loadBlogCollection();
	const notes = await loadNotesCollection();

	const allContent = [...posts, ...notes];

	allContent.sort((a, b) => {
		const dateA = a.data.date.getTime();
		const dateB = b.data.date.getTime();
		return dateB - dateA; // Descending order
	});

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: allContent.map((el) => ({
			...el.data,
			link: el.permalink,
		})),
	});
}
