// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import rehypeShiki from '@shikijs/rehype';

// https://astro.build/config
export default defineConfig({
	site: 'https://oltdaniel.eu',
	integrations: [mdx(), sitemap()],
	markdown: {
		rehypePlugins: [
			[
				rehypeShiki,
				{
					inline: "tailing-curly-colon",
					themes: {
						light: 'github-light-high-contrast',
						dark: 'github-dark-high-contrast'
					},
				},
			],
		],
		shikiConfig: {
			themes: {
				light: 'github-light-high-contrast',
				dark: 'github-dark-high-contrast'
			},
			wrap: false
		}
	}
});
