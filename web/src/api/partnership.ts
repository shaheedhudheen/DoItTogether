import apiClient from './client';
import { Partnership, ApiResponse, UpdatePartnershipSettingsInput } from '@dit/shared';

export const partnershipApi = {
  get: async () => {
    const response = await apiClient.get<ApiResponse<{ partnership: Partnership }>>('/partnership');
    return response.data.data.partnership;
  },
  invite: async () => {
    const response = await apiClient.post<ApiResponse<{ code: string; partnership: Partnership }>>('/partnership/invite');
    return response.data.data;
  },
  join: async (data: { inviteCode: string }) => {
    const response = await apiClient.post<ApiResponse<{ partnership: Partnership }>>('/partnership/join', data);
    return response.data.data.partnership;
  },
  updateSettings: async (data: UpdatePartnershipSettingsInput) => {
    const response = await apiClient.patch<ApiResponse<{ partnership: Partnership }>>('/partnership/settings', data);
    return response.data.data.partnership;
  },
  leave: async () => {
    const response = await apiClient.delete<ApiResponse<null>>('/partnership');
    return response.data;
  }
};
