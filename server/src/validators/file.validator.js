import { z } from 'zod';

export const renameFileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'New filename is required')
      .max(255, 'Filename cannot exceed 255 characters')
      .optional(),
    originalName: z
      .string()
      .trim()
      .min(1, 'New filename is required')
      .max(255, 'Filename cannot exceed 255 characters')
      .optional(),
  })
  .strict()
  .refine((data) => Boolean(data.name || data.originalName), {
    message: 'New filename is required',
    path: ['name'],
  })
  .transform((data) => ({
    name: data.name || data.originalName,
  }));

export const listFilesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
