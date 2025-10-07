import { createOgRoute } from '@/src/utils'
import { loadBlogCollection } from "@/src/content.config";

const { getStaticPaths, GET } = createOgRoute("blog", loadBlogCollection);

export { getStaticPaths, GET };