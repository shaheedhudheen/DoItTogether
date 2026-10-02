import apiClient from './client';
import { CalendarDayData, CalendarSummary, ApiResponse } from '@dit/shared';

export const calendarApi = {
  getRange: async (from: string, to: string) => {
    const response = await apiClient.get<ApiResponse<{ summary: Record<string, CalendarSummary> }>>(`/calendar/range?from=${from}&to=${to}`);
    return response.data.data.summary;
  },
  getDay: async (date: string) => {
    const response = await apiClient.get<ApiResponse<{ data: CalendarDayData }>>(`/calendar/${date}`);
    return response.data.data.data;
  }
};
