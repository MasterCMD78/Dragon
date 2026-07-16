// In the Railway cross-origin deployment the frontend and API server are on
// different domains. Use the same VITE_API_URL that main.tsx passes to
// setBaseUrl() so admin requests go to the API server, not the static frontend.
const _apiOrigin = (import.meta.env.VITE_API_URL as string | undefined)
  ?.trim()
  .replace(/\/+$/, "") ?? "";
const API_BASE = `${_apiOrigin}/api`;

async function apiFetch<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  let url = `${API_BASE}${path}`;
  if (params) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") q.set(k, String(v));
    }
    const qs = q.toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return data as T;
}

const get = <T>(path: string, params?: Record<string, string | number | undefined>) =>
  apiFetch<T>("GET", path, undefined, params);
const post = <T>(path: string, body?: unknown) => apiFetch<T>("POST", path, body);
const put = <T>(path: string, body?: unknown) => apiFetch<T>("PUT", path, body);
const del = <T>(path: string) => apiFetch<T>("DELETE", path);

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  activeToday: number;
  minesToday: number;
  totalHPInCirculation: number;
  totalReferrals: number;
  pendingTaskApprovals: number;
  totalAchievementsUnlocked: number;
  notificationsSentToday: number;
}

export interface AdminUser {
  id: number;
  telegramId: string;
  username: string;
  firstName: string;
  lastName: string | null;
  balance: number;
  level: number;
  streak: number;
  totalMines: number;
  joinDate: string;
  lastActive: string;
  isBanned: boolean;
  isAdmin: boolean;
  referredBy: string | null;
}

export interface AdminUserDetail {
  user: AdminUser & { lastMine: string | null; languageCode: string | null };
  stats: {
    tasksCompleted: number;
    questsCompleted: number;
    achievementsUnlocked: number;
    totalReferrals: number;
  };
  recentTransactions: Transaction[];
}

export interface Task {
  id: number;
  title: string;
  description: string;
  reward: number;
  link: string | null;
  status: string;
  taskType: string;
  createdAt: string;
  pendingSubmissions: number;
}

export interface TaskSubmission {
  id: number;
  taskId: number;
  telegramId: string;
  status: string;
  completedAt: string;
  username: string;
  firstName: string;
  lastName: string | null;
}

export interface Quest {
  id: number;
  title: string;
  description: string;
  reward: number;
  questType: string;
  target: number;
  createdAt: string;
  totalCompletions: number;
}

export interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  createdAt: string;
  totalUnlocks: number;
}

export interface AchievementUnlock {
  id: number;
  telegramId: string;
  unlockedAt: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface Transaction {
  id: number;
  telegramId: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  relatedId: string | null;
  createdAt: string;
}

export interface Announcement {
  id: number;
  adminTelegramId: string;
  message: string;
  type: string;
  isPinned: boolean;
  pinnedUntil: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface AdminLog {
  id: number;
  adminTelegramId: string;
  action: string;
  targetTelegramId: string | null;
  details: string | null;
  createdAt: string;
}

// ─── API calls ───────────────────────────────────────────────────────────────

export const adminApi = {
  // Dashboard
  getStats: () => get<AdminStats>("/admin/stats"),

  // Users
  getUsers: (params: { search?: string; filter?: string; limit?: number; offset?: number }) =>
    get<{ users: AdminUser[]; total: number; limit: number; offset: number }>("/admin/users", params),
  getUser: (telegramId: string) => get<AdminUserDetail>(`/admin/users/${telegramId}`),
  adjustHP: (telegramId: string, amount: number, reason?: string) =>
    post<{ success: boolean; newBalance: number }>(`/admin/users/${telegramId}/hp`, { amount, reason }),
  banUser: (telegramId: string) => post(`/admin/users/${telegramId}/ban`),
  unbanUser: (telegramId: string) => post(`/admin/users/${telegramId}/unban`),
  makeAdmin: (telegramId: string) => post(`/admin/users/${telegramId}/make-admin`),
  removeAdmin: (telegramId: string) => post(`/admin/users/${telegramId}/remove-admin`),
  resetMining: (telegramId: string) => post(`/admin/users/${telegramId}/reset/mining`),
  resetStreak: (telegramId: string) => post(`/admin/users/${telegramId}/reset/streak`),
  resetTasks: (telegramId: string) => post(`/admin/users/${telegramId}/reset/tasks`),
  resetQuests: (telegramId: string) => post(`/admin/users/${telegramId}/reset/quests`),

  // Tasks
  getTasks: () => get<{ tasks: Task[] }>("/admin/tasks"),
  createTask: (data: Partial<Task>) => post<Task>("/admin/tasks", data),
  updateTask: (id: number, data: Partial<Task>) => put<Task>(`/admin/tasks/${id}`, data),
  deleteTask: (id: number) => del(`/admin/tasks/${id}`),
  getSubmissions: (taskId: number, status?: string, limit?: number, offset?: number) =>
    get<{ submissions: TaskSubmission[] }>(`/admin/tasks/${taskId}/submissions`, { status, limit, offset }),
  approveSubmission: (taskId: number, completionId: number) =>
    post(`/admin/tasks/${taskId}/submissions/${completionId}/approve`),
  rejectSubmission: (taskId: number, completionId: number, reason?: string) =>
    post(`/admin/tasks/${taskId}/submissions/${completionId}/reject`, { reason }),
  bulkSubmissions: (taskId: number, ids: number[], action: "approve" | "reject") =>
    post<{ success: boolean; affected: number }>(`/admin/tasks/${taskId}/submissions/bulk`, { ids, action }),

  // Quests
  getQuests: () => get<{ quests: Quest[] }>("/admin/quests"),
  createQuest: (data: Partial<Quest>) => post<Quest>("/admin/quests", data),
  updateQuest: (id: number, data: Partial<Quest>) => put<Quest>(`/admin/quests/${id}`, data),
  deleteQuest: (id: number) => del(`/admin/quests/${id}`),

  // Achievements
  getAchievements: () => get<{ achievements: Achievement[] }>("/admin/achievements"),
  createAchievement: (data: Partial<Achievement>) => post<Achievement>("/admin/achievements", data),
  updateAchievement: (id: number, data: Partial<Achievement>) =>
    put<Achievement>(`/admin/achievements/${id}`, data),
  getAchievementUnlocks: (id: number) =>
    get<{ unlocks: AchievementUnlock[] }>(`/admin/achievements/${id}/unlocks`),
  forceUnlock: (id: number, telegramId: string) =>
    post(`/admin/achievements/${id}/unlock`, { telegramId }),
  removeUnlock: (id: number, telegramId: string) =>
    del(`/admin/achievements/${id}/unlock/${telegramId}`),

  // Broadcast
  broadcast: (data: { title: string; message: string; target: string; telegramId?: string }) =>
    post<{ success: boolean; sent: number }>("/admin/notifications/broadcast", data),

  // Announcements
  getAnnouncements: () => get<{ announcements: Announcement[] }>("/admin/announcements"),
  createAnnouncement: (data: Partial<Announcement>) =>
    post<Announcement>("/admin/announcements", data),
  updateAnnouncement: (id: number, data: Partial<Announcement>) =>
    put<Announcement>(`/admin/announcements/${id}`, data),
  deleteAnnouncement: (id: number) => del(`/admin/announcements/${id}`),
  pinAnnouncement: (id: number) => post(`/admin/announcements/${id}/pin`),
  unpinAnnouncement: (id: number) => post(`/admin/announcements/${id}/unpin`),

  // Transactions
  getTransactions: (params: {
    search?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }) =>
    get<{ transactions: Transaction[]; total: number }>("/admin/transactions", params),

  // Global HP Grant
  grantEveryonePreview: (amount: number) =>
    get<{
      userCount: number;
      totalHP: number;
      currentCirculatingHP: number;
      estimatedNewCirculatingHP: number;
    }>("/admin/grant-everyone/preview", { amount }),
  getLastGrant: () =>
    get<{
      lastGrant: {
        id: number;
        batchId: string | null;
        details: string | null;
        createdAt: string;
        adminTelegramId: string;
      } | null;
      canRollback: boolean;
    }>("/admin/grant-everyone/last"),
  grantEveryone: (data: { amount: number; reason: string; notify: boolean }) =>
    post<{ success: boolean; count: number; batchId: string; message: string }>(
      "/admin/grant-everyone",
      data,
    ),
  rollbackLastGrant: () =>
    post<{ success: boolean; reversed: number; message: string }>(
      "/admin/grant-everyone/rollback",
    ),

  // Logs
  getLogs: (limit?: number, offset?: number) =>
    get<{ logs: AdminLog[]; total: number }>("/admin/logs", { limit, offset }),

  // System Settings (Super Admin only)
  getSettings: () =>
    get<{ settings: Record<string, string> }>("/admin/settings"),
  updateSettings: (settings: Record<string, string | boolean | number>) =>
    put<{
      success: boolean;
      updated: { key: string; oldValue: string; newValue: string }[];
    }>("/admin/settings", settings),
};
