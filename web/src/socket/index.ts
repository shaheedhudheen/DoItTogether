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
    'common-task:created': ['commonTasks'],
    'common-task:updated': ['commonTasks'],
    'common-task:deleted': ['commonTasks'],
    'daily-task:completed': ['dailyTasks'],
    'daily-task:uncompleted': ['dailyTasks'],
    'prayer:completed': ['prayers'],
    'prayer:uncompleted': ['prayers'],
    'todo:created': ['todos'],
    'todo:updated': ['todos'],
    'todo:deleted': ['todos'],
    'todo:completed': ['todos'],
    'todo:uncompleted': ['todos'],
    'partnership:joined': ['partnership', 'me'],
    'partnership:dissolved': ['partnership', 'me'],
  };

  Object.entries(eventsToInvalidate).forEach(([event, queryKeys]) => {
    socket?.on(event, (payload?: any) => {
      if (event === 'partnership:joined' && payload?.partnership?.id) {
        useAuthStore.getState().updateUser({ partnershipId: payload.partnership.id });
        socket?.emit('join:partnership', payload.partnership.id);
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
