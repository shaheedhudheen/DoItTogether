import apiClient from './client';
import { CreateDailyTaskInput, UpdateDailyTaskInput, DailyTask, ApiResponse } from '@dit/shared';

export const dailyTasksApi = {
  getAll: async () => {
    const response = await apiClient.get<ApiResponse<{ tasks: DailyTask[] }>>('/daily-tasks');
    return response.data.data.tasks;
  },
  create: async (data: CreateDailyTaskInput) => {
    const response = await apiClient.post<ApiResponse<{ task: DailyTask }>>('/daily-tasks', data);
    return response.data.data.task;
  },
  update: async (id: string, data: UpdateDailyTaskInput) => {
    const response = await apiClient.patch<ApiResponse<{ task: DailyTask }>>(`/daily-tasks/${id}`, data);
    return response.data.data.task;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<null>>(`/daily-tasks/${id}`);
    return response.data;
  },
  complete: async (id: string) => {
    const response = await apiClient.post<ApiResponse<{ task: DailyTask }>>(`/daily-tasks/${id}/complete`);
    return response.data.data.task;
  },
  uncomplete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<{ task: DailyTask }>>(`/daily-tasks/${id}/complete`);
    return response.data.data.task;
  }
};
