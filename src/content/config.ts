import { defineCollection, z } from 'astro:content';

const baseSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.date(),
  updated: z.date().optional(),
  tags: z.array(z.string()),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  timeToResults: z.string(),
  petRisk: z.enum(['low', 'medium', 'high']),
  cost: z.enum(['low', 'medium', 'high']),
  sources: z.array(
    z.object({
      label: z.string(),
      url: z.string().url(),
    })
  ),
});

const methods = defineCollection({
  type: 'content',
  schema: baseSchema,
});

const problems = defineCollection({
  type: 'content',
  schema: baseSchema,
});

export const collections = {
  methods,
  problems,
};
