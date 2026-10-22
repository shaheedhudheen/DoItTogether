import { io, Socket } from 'socket.io-client';
import { useSocketStore } from '../store/socketStore';
import { useAuthStore } from '../store/authStore';
import { QueryClient } from '@tanstack/react-query';

let socket: Socket | null = null;
let queryClientInstance: QueryClient | null = null;

export const setQueryClient = (client: QueryClient) => {
  queryClientInstance = client;
};

export const initSocket = (token: string, partnershipId?: string) => {
  if (socket?.connected) {
    if (partnershipId) {
      socket.emit('join:partnership', partnershipId);
    }
    return socket;
  }

  // Disconnect any existing socket
  if (socket) {
    socket.disconnect();
  }

  socket = io('http://localhost:3001', {
    auth: { token },
    query: { partnershipId: partnershipId || '' },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    useSocketStore.getState().setConnected(true);
    if (partnershipId) {
      socket?.emit('join:partnership', partnershipId);
    }
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    useSocketStore.getState().setConnected(false);
    console.log('Socket disconnected');
  });

  // Map server events to React Query invalidation keys
  // These event names match server/src/socket/index.ts and controller emissions
  const eventsToInvalidate: Record<string, string[]> = {
    'common-task:created': ['commonTasks', 'calendar'],
    'common-task:updated': ['commonTasks', 'calendar'],
    'common-task:deleted': ['commonTasks', 'calendar'],
    'daily-task:created': ['dailyTasks', 'calendar'],
    'daily-task:updated': ['dailyTasks', 'calendar'],
    'daily-task:deleted': ['dailyTasks', 'calendar'],
    'daily-task:completed': ['dailyTasks', 'calendar'],
    'daily-task:uncompleted': ['dailyTasks', 'calendar'],
    'prayer:completed': ['prayers', 'calendar'],
    'prayer:uncompleted': ['prayers', 'calendar'],
    'todo:created': ['todos', 'calendar'],
    'todo:updated': ['todos', 'calendar'],
    'todo:deleted': ['todos', 'calendar'],
    'todo:completed': ['todos', 'calendar'],
    'todo:uncompleted': ['todos', 'calendar'],
    'partnership:joined': ['partnership', 'me', 'prayers'],
    'partnership:settings': ['partnership', 'me', 'prayers', 'calendar'],
    'partnership:dissolved': ['partnership', 'me'],
  };

  Object.entries(eventsToInvalidate).forEach(([event, queryKeys]) => {
    socket?.on(event, (payload?: any) => {
      if (event === 'partnership:joined' && payload?.partnership?.id) {
        const updates: { partnershipId: string; prayerEnabled?: boolean } = {
          partnershipId: payload.partnership.id
        };
        if (typeof payload.partnership.prayerEnabled === 'boolean') {
          updates.prayerEnabled = payload.partnership.prayerEnabled;
        }
        useAuthStore.getState().updateUser(updates);
        socket?.emit('join:partnership', payload.partnership.id);
      }

      if (event === 'partnership:settings') {
        if (typeof payload?.partnership?.prayerEnabled === 'boolean') {
          useAuthStore.getState().updateUser({
            prayerEnabled: payload.partnership.prayerEnabled
          });
        }
      }

      if (event === 'partnership:dissolved') {
        // Drop the room reference immediately so protected pages redirect,
        // then wipe every cached query from the old room — a partner who
        // later joins a different room must never see the old shared data.
        useAuthStore.getState().updateUser({ partnershipId: null, prayerEnabled: false });
        queryClientInstance?.removeQueries();
        return;
      }

      if (queryClientInstance) {
        queryKeys.forEach((key) => {
          queryClientInstance?.invalidateQueries({ queryKey: [key] });
        });
      }
    });
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
