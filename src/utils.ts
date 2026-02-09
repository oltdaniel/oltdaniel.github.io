import { getCollection, type CollectionEntry, type DataEntryMap, getEntry } from 'astro:content';
import fs from "fs/promises";
import satori from "satori";
import sharp from "sharp";
import path from 'path';
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
        {
            type: 'div',
            props: {
                style: {
                    display: 'flex',
                    height: '100%',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    letterSpacing: '-.02em',
                    fontWeight: 700,
                    background: 'white',
                },
                children: [
                    {
                        type: 'div',
                        props: {
                            style: {
                                right: 42,
                                bottom: 42,
                                position: 'absolute',
                                display: 'flex',
                                alignItems: 'center',
                            },
                            children: [
                                {
                                    type: 'span',
                                    props: {
                                        style: { width: 24, height: 24, background: 'black' },
                                    },
                                },
                                {
                                    type: 'span',
                                    props: {
                                        style: { marginLeft: 8, fontSize: 20 },
                                        children: 'oltdaniel.eu',
                                    },
                                },
                            ],
                        },
                    },
                    {
                        type: 'div',
                        props: {
                            style: {
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                padding: '20px 50px',
                                margin: '0 42px',
                                fontSize: 40,
                                width: 'auto',
                                maxWidth: 550,
                                textAlign: 'center',
                                backgroundColor: 'black',
                                color: 'white',
                                lineHeight: 1.4,
                            },
                            children: entry?.data.title,
                        },
                    },
                ],
            },
        },
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