import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '../store/socketStore';
import { setQueryClient } from '../socket';

export const useSocket = () => {
  const isConnected = useSocketStore((state) => state.isConnected);
  const queryClient = useQueryClient();

  useEffect(() => {
    setQueryClient(queryClient);
  }, [queryClient]);

  return { isConnected };
};
