import { z } from 'zod';

export const createLinkSchema = z
  .object({
    fileId: z.string().min(1, 'fileId is required'),
    expiresAt: z.coerce.date().optional(),
    maxDownloads: z.coerce.number().int().min(1).optional(),
    password: z.string().min(1).max(128).optional(),
  })
  .strict();

export const unlockLinkSchema = z
  .object({
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export const listLinksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  fileId: z.string().optional(),
});

