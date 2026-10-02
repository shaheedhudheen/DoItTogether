import apiClient from './client';
import { CreateTodoInput, UpdateTodoInput, Todo, ApiResponse } from '@dit/shared';

export const todosApi = {
  getAll: async () => {
    const response = await apiClient.get<ApiResponse<{ todos: Todo[] }>>('/todos');
    return response.data.data.todos;
  },
  create: async (data: CreateTodoInput) => {
    const response = await apiClient.post<ApiResponse<{ todo: Todo }>>('/todos', data);
    return response.data.data.todo;
  },
  update: async (id: string, data: UpdateTodoInput) => {
    const response = await apiClient.patch<ApiResponse<{ todo: Todo }>>(`/todos/${id}`, data);
    return response.data.data.todo;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<null>>(`/todos/${id}`);
    return response.data;
  },
  complete: async (id: string) => {
    const response = await apiClient.post<ApiResponse<{ todo: Todo }>>(`/todos/${id}/complete`);
    return response.data.data.todo;
  },
  uncomplete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<{ todo: Todo }>>(`/todos/${id}/complete`);
    return response.data.data.todo;
  }
};
