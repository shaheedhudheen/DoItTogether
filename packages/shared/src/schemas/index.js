"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTodoSchema = exports.createTodoSchema = exports.updateDailyTaskSchema = exports.createDailyTaskSchema = exports.updateCommonTaskSchema = exports.createCommonTaskSchema = exports.joinPartnershipSchema = exports.updateProfileSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// ============================================
// Auth Schemas
// ============================================
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    displayName: zod_1.z.string().min(1, 'Display name is required').max(50),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.updateProfileSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(1).max(50).optional(),
    avatarUrl: zod_1.z.string().url().nullable().optional(),
    prayerEnabled: zod_1.z.boolean().optional(),
});
// ============================================
// Partnership Schemas
// ============================================
exports.joinPartnershipSchema = zod_1.z.object({
    inviteCode: zod_1.z.string().min(1, 'Invite code is required'),
});
// ============================================
// Common Task Schemas
// ============================================
exports.createCommonTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required').max(100),
    description: zod_1.z.string().max(500).nullable().optional(),
    emoji: zod_1.z.string().max(4).default('📋'),
});
exports.updateCommonTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(100).optional(),
    description: zod_1.z.string().max(500).nullable().optional(),
    emoji: zod_1.z.string().max(4).optional(),
    status: zod_1.z.enum(['active', 'completed', 'archived']).optional(),
});
// ============================================
// Daily Task Schemas
// ============================================
exports.createDailyTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required').max(100),
    category: zod_1.z.enum(['meal', 'exercise', 'hobby', 'custom']).default('custom'),
    isShared: zod_1.z.boolean().default(false),
});
exports.updateDailyTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(100).optional(),
    category: zod_1.z.enum(['meal', 'exercise', 'hobby', 'custom']).optional(),
    isShared: zod_1.z.boolean().optional(),
    isActive: zod_1.z.boolean().optional(),
    sortOrder: zod_1.z.number().int().min(0).optional(),
});
// ============================================
// Todo Schemas
// ============================================
exports.createTodoSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required').max(200),
    description: zod_1.z.string().max(1000).nullable().optional(),
    assignedToBoth: zod_1.z.boolean().default(false),
    dueDate: zod_1.z.string().nullable().optional(),
});
exports.updateTodoSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().max(1000).nullable().optional(),
    assignedToBoth: zod_1.z.boolean().optional(),
    dueDate: zod_1.z.string().nullable().optional(),
});
