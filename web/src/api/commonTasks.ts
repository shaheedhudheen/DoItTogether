import apiClient from './client';
import { CreateCommonTaskInput, UpdateCommonTaskInput, CommonTask, ApiResponse } from '@dit/shared';

export const commonTasksApi = {
  getAll: async () => {
    const response = await apiClient.get<ApiResponse<{ tasks: CommonTask[] }>>('/common-tasks');
    return response.data.data.tasks;
  },
  create: async (data: CreateCommonTaskInput) => {
    const response = await apiClient.post<ApiResponse<{ task: CommonTask }>>('/common-tasks', data);
    return response.data.data.task;
  },
  update: async (id: string, data: UpdateCommonTaskInput) => {
    const response = await apiClient.patch<ApiResponse<{ task: CommonTask }>>(`/common-tasks/${id}`, data);
    return response.data.data.task;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<null>>(`/common-tasks/${id}`);
    return response.data;
  },
  complete: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<{ task: CommonTask }>>(`/common-tasks/${id}/complete`);
    return response.data.data.task;
  }
};
