import { create } from 'zustand';

interface SocketState {
  isConnected: boolean;
  setConnected: (status: boolean) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  isConnected: false,
  setConnected: (status) => set({ isConnected: status }),
}));
