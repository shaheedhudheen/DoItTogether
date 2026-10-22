import { z } from 'zod';

// ============================================
// Auth Schemas
// ============================================

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1, 'Display name is required').max(50),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  // Only http(s) avatars — zod's .url() alone also accepts javascript: etc.
  avatarUrl: z
    .string()
    .url('Invalid URL')
    .refine((u) => /^https?:\/\//i.test(u), 'Avatar URL must be http(s)')
    .nullable()
    .optional(),
  prayerEnabled: z.boolean().optional(),
});

// ============================================
// Partnership Schemas
// ============================================

export const joinPartnershipSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
});

// Room-wide preferences. Both partners share the same prayer tracker state,
// so the joining partner inherits the creator's onboarding choice.
export const updatePartnershipSettingsSchema = z.object({
  prayerEnabled: z.boolean(),
});

// ============================================
// Common Task Schemas
// ============================================

export const createCommonTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).nullable().optional(),
  emoji: z.string().max(4).default('📋'),
});

export const updateCommonTaskSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  emoji: z.string().max(4).optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
});

// ============================================
// Daily Task Schemas
// ============================================

export const createDailyTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  category: z.string().max(50).nullable().optional(),
  isShared: z.boolean().default(false),
});

export const updateDailyTaskSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  category: z.string().max(50).nullable().optional(),
  isShared: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// ============================================
// Todo Schemas
// ============================================

const isValidDateString = (s: string) => !Number.isNaN(Date.parse(s));

export const createTodoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).nullable().optional(),
  assignedToBoth: z.boolean().default(false),
  dueDate: z.string().refine(isValidDateString, 'Invalid date').nullable().optional(),
});

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  assignedToBoth: z.boolean().optional(),
  dueDate: z.string().refine(isValidDateString, 'Invalid date').nullable().optional(),
});

// ============================================
// Type Exports from Schemas
// ============================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type JoinPartnershipInput = z.infer<typeof joinPartnershipSchema>;
export type UpdatePartnershipSettingsInput = z.infer<typeof updatePartnershipSettingsSchema>;
export type CreateCommonTaskInput = z.infer<typeof createCommonTaskSchema>;
export type UpdateCommonTaskInput = z.infer<typeof updateCommonTaskSchema>;
export type CreateDailyTaskInput = z.infer<typeof createDailyTaskSchema>;
export type UpdateDailyTaskInput = z.infer<typeof updateDailyTaskSchema>;
export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
