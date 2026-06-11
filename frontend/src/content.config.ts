import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().max(65, { message: 'Title must be 65 characters or less for SEO' }),
    description: z.string().max(160, { message: 'Description must be 160 characters or less for SEO' }),
    pubDate: z.coerce.date(),
    author: z.string(),
    authorImage: z.string().optional().default('/images/default-avatar.jpg'),
    category: z.enum(['tech-ai', 'memes-trends', 'creators', 'movies-ott']),
    tags: z.array(z.string()),
    image: z.string(),
    imageAlt: z.string(),
    featured: z.boolean().optional().default(false),
    trending: z.boolean().optional().default(false),
    weeklyHighlight: z.boolean().optional().default(false),
  }),
});

export const collections = { blog };
