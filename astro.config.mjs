// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import {
	addMetaHead, updateStyle
} from './src/shiki';

// https://astro.build/config
export default defineConfig({
	site: 'https://oltdaniel.eu',
	integrations: [mdx(), sitemap()],
	markdown: {
		shikiConfig: {
			themes: {
				// NOTE: The base colors of these are additionally hardcoded in the global css
				light: 'github-light-high-contrast',
				dark: 'github-dark-high-contrast'
			},
			wrap: false,
			transformers: [
				updateStyle(),
				addMetaHead()
			]
		}
	}
});
