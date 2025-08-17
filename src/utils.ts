import { getCollection, type CollectionEntry, type DataEntryMap } from 'astro:content';

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