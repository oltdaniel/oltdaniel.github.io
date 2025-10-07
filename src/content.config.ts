import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { loadAndFormatCollection, sortByDate } from './utils';

// Generic function to load and format any collection
export async function loadCollection(collectionName: 'blog' | 'notes') {
	const slugMapper = collectionName === 'blog' 
		? (post: any) => post.id 
		: (post: any) => `${post.id}`;
	
	const permalinkMapper = (post: any) => `/${collectionName}/${post.slug}`;
	
	return (await loadAndFormatCollection(collectionName, slugMapper, permalinkMapper)).sort(sortByDate);
}

export async function loadBlogCollection() {
	return loadCollection('blog');
}

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({
		base: './src/content/blog',
		pattern: '**/*.{md,mdx}',
		generateId: ({ entry, data }) => {
			const id = entry.substring(11)
			const slug = `${(data.date as Date).getFullYear()}/${id}`

			return slug.replace(/(\/index)?\.mdx?$/, '')
		},
	}),
	// Type-check frontmatter using a schema
	schema: () =>
		z.object({
			title: z.string(),
			description: z.string(),
			date: z.coerce.date(),
			tags: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).default(["others"])
		}),
});

const notes = defineCollection({
	// Load Markdown and MDX files in the `src/content/notes/` directory.
	loader: glob({
		base: './src/content/notes',
		pattern: '**/*.{md,mdx}',
		generateId: ({ entry, data }) => {
			const id = entry.substring(5)

			return id.replace(/(\/index)?\.mdx?$/, '')
		},
	}),
	// Type-check frontmatter using a schema
	schema: () =>
		z.object({
			title: z.string(),
			date: z.coerce.date(),
			tags: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).default(["others"])
		}),
});

export async function loadNotesCollection() {
	return loadCollection('notes');
}

export const collections = { blog, notes };