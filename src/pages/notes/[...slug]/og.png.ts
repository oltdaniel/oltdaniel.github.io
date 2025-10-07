import { createOgRoute } from '@/src/utils'
import { loadNotesCollection } from "@/src/content.config";

const { getStaticPaths, GET } = createOgRoute("notes", loadNotesCollection);

export { getStaticPaths, GET };