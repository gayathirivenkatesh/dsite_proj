import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .max(100, 'Name cannot exceed 100 characters')
      .optional()
      .default(''),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address')
      .max(254, 'Email address is too long'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters'),
  })
  .strict({
    message: 'Request contains disallowed fields',
  });

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
    password: z.string().min(1, 'Password is required'),
  })
  .strict({
    message: 'Request contains disallowed fields',
  });
