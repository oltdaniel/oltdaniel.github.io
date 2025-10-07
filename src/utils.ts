import { getCollection, type CollectionEntry, type DataEntryMap, getEntry } from 'astro:content';
import fs from "fs/promises";
import satori from "satori";
import sharp from "sharp";
import path from 'path';
import { html } from 'satori-html';
import type { APIRoute } from "astro";

export type FormattedCollectionEntry<T extends keyof DataEntryMap> = CollectionEntry<T> & { slug: string, permalink: string }

export async function loadAndFormatCollection<T extends keyof DataEntryMap>(
    name: T,
    mapSlug: (post: FormattedCollectionEntry<T>) => string,
    mapPermalink: (post: FormattedCollectionEntry<T>) => string,
): Promise<FormattedCollectionEntry<T>[]> {
    const items = await getCollection(name);

    return items
        .map(item => ({ ...item, slug: mapSlug(item as any) }))
        .map(item => ({ ...item, permalink: mapPermalink(item as any) }));
}

export const sortByDate = (a: any, b: any): any => {
    return new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
}

export function prepareContentPosts<T extends keyof DataEntryMap>(
    collection: FormattedCollectionEntry<T>[],
) {
    const numberOfItems = collection.length

    return collection.sort(sortByDate).map((item, i) => {
        return {
            params: { slug: item.slug },
            props: {
                post: item,
                // Previous post
                prevPost:
                    i + 1 === numberOfItems // If the current post is the oldest
                        ? undefined
                        : collection[i + 1],
                // Next post
                nextPost:
                    i === 0 // If the current post is the newest
                        ? undefined
                        : collection[i - 1],
            },
        };
    });
}

export async function generateOgImage(contentType: keyof DataEntryMap, slug: string): Promise<Uint8Array> {
    const interFontData = await fs.readFile(path.resolve("public/fonts/inter-4.1/Inter-Regular.ttf"));
    
    const entry = await getEntry(contentType, slug);
    
    const svg = await satori(
        html(`<div
  style="display:flex;height:100%;width:100%;align-items:center;justify-content:center;letter-spacing:-.02em;font-weight:700;background:white">
  <div
    style="right:42px;bottom:42px;position:absolute;display:flex;align-items:center">
    <span style="width:24px;height:24px;background:black"></span
    ><span style="margin-left:8px;font-size:20px">oltdaniel.eu</span>
  </div>
  <div
    style="display:flex;flex-wrap:wrap;justify-content:center;padding:20px 50px;margin:0 42px;font-size:40px;width:auto;max-width:550px;text-align:center;background-color:black;color:white;line-height:1.4">
    ${entry?.data.title}
  </div>
</div>`) as any,
        {
            width: 1200,
            height: 630,
            fonts: [
                {
                    name: "Inter",
                    data: interFontData,
                    weight: 600,
                    style: "normal",
                },
            ],
        }
    );

    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    return new Uint8Array(pngBuffer);
}

export function createOgRoute(
    contentType: keyof DataEntryMap,
    collectionLoader: () => Promise<FormattedCollectionEntry<keyof DataEntryMap>[]>
) {
    return {
        getStaticPaths: async () => {
            const collection = await collectionLoader();
            return prepareContentPosts(collection);
        },
        GET: (async ({ params }) => {
            const png = await generateOgImage(contentType, params.slug!);
            return new Response(png as any, {
                headers: {
                    "Content-Type": "image/png",
                },
            });
        }) as APIRoute
    };
}