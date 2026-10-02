// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  prayerEnabled: boolean;
  partnershipId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserPublic {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  prayerEnabled: boolean;
}

// ============================================
// Partnership Types
// ============================================

export type PartnershipStatus = 'pending' | 'active' | 'dissolved';

export interface Partnership {
  id: string;
  user1Id: string;
  user2Id: string | null;
  inviteCode: string;
  status: PartnershipStatus;
  createdAt: string;
  user1?: UserPublic;
  user2?: UserPublic | null;
  partner?: UserPublic;
}

// ============================================
// Common Task Types (Top Section)
// ============================================

export type CommonTaskStatus = 'active' | 'completed' | 'archived';

export interface CommonTask {
  id: string;
  partnershipId: string;
  createdById: string;
  title: string;
  description: string | null;
  emoji: string;
  status: CommonTaskStatus;
  completedAt: string | null;
  createdAt: string;
  createdBy?: UserPublic;
}

// ============================================
// Daily Task Types (Middle Section)
// ============================================

export type DailyTaskCategory = string;

export interface DailyTask {
  id: string;
  partnershipId: string;
  createdById: string;
  title: string;
  category?: string | null;
  isShared: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  completions?: DailyTaskCompletion[];
}

export interface DailyTaskCompletion {
  id: string;
  dailyTaskId: string;
  userId: string;
  completionDate: string;
  createdAt: string;
}

// ============================================
// Prayer Types (Separate opt-in section)
// ============================================

export const PRAYER_NAMES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerName = typeof PRAYER_NAMES[number];

export const PRAYER_LABELS: Record<PrayerName, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

export interface PrayerTask {
  id: string;
  partnershipId: string;
  name: PrayerName;
  sortOrder: number;
  completions?: PrayerCompletion[];
}

export interface PrayerCompletion {
  id: string;
  prayerTaskId: string;
  userId: string;
  completionDate: string;
  createdAt: string;
}

export interface PrayerStatus {
  name: PrayerName;
  label: string;
  myCompleted: boolean;
  partnerCompleted: boolean;
}

// ============================================
// Todo Types (Bottom Section)
// ============================================

export type TodoStatus = 'pending' | 'partial' | 'completed' | 'expired';

export interface Todo {
  id: string;
  partnershipId: string;
  createdById: string;
  title: string;
  description: string | null;
  assignedToBoth: boolean;
  dueDate: string | null;
  status: TodoStatus;
  createdAt: string;
  createdBy?: UserPublic;
  completions?: TodoCompletion[];
}

export interface TodoCompletion {
  id: string;
  todoId: string;
  userId: string;
  completedAt: string;
}

// ============================================
// Calendar Types
// ============================================

export interface CalendarDayDailyTask {
  id: string;
  taskId: string;
  title: string;
  isShared?: boolean;
  completedByMe: boolean;
  completedByPartner: boolean;
}

export interface CalendarDayPrayer {
  name: PrayerName;
  completedByMe: boolean;
  completedByPartner: boolean;
}

export interface CalendarDayData {
  date: string;
  dailyTasks: CalendarDayDailyTask[];
  commonTasksAdded: CommonTask[];
  commonTasksCompleted: CommonTask[];
  commonTasks?: CommonTask[];
  todos: Todo[];
  prayers: CalendarDayPrayer[];
}

export interface CalendarSummary {
  date: string;
  totalDailyTasks: number;
  completedDailyTasks: number;
  totalPrayers: number;
  completedPrayers: number;
  totalCommonTasks: number;
  completedCommonTasks: number;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// ============================================
// Auth Types
// ============================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
  partnership: Partnership | null;
}

export interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
}
