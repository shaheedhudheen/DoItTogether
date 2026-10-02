import apiClient from './client';
import { PrayerTask, PrayerName, ApiResponse } from '@dit/shared';

export const prayerApi = {
  getToday: async () => {
    const response = await apiClient.get<ApiResponse<{ prayers: PrayerTask[] }>>('/prayer/today');
    return response.data.data.prayers;
  },
  complete: async (name: PrayerName) => {
    const response = await apiClient.post<ApiResponse<{ prayer: PrayerTask }>>(`/prayer/${name}/complete`);
    return response.data.data.prayer;
  },
  uncomplete: async (name: PrayerName) => {
    const response = await apiClient.delete<ApiResponse<{ prayer: PrayerTask }>>(`/prayer/${name}/complete`);
    return response.data.data.prayer;
  }
};
