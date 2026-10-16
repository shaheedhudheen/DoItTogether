import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { getActivePartnershipId } from '../utils/helpers';
import { PrismaClient } from '@prisma/client';

let io: SocketIOServer;
const prisma = new PrismaClient();

export const initSocket = (server: any) => {
  io = new SocketIOServer(server, {
    cors: { origin: env.CORS_ORIGIN, methods: ['GET', 'POST'] },
    // All client events carry tiny payloads (ids); a small cap prevents
    // memory abuse via oversized messages.
    maxHttpBufferSize: 10 * 1024
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) throw new Error('Auth token missing');
      
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { id: string };
      socket.data.userId = decoded.id;
      socket.join(decoded.id);
      
      const pId = await getActivePartnershipId(decoded.id);
      if (pId) {
        socket.data.partnershipId = pId;
        socket.join(pId);
      }
      
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.data.userId} to room ${socket.data.partnershipId}`);

    socket.on('join:partnership', async (pId: string) => {
      if (!pId) return;

      // Only allow joining the user's own active/pending partnership room
      const activePartnershipId = await getActivePartnershipId(socket.data.userId);
      if (!activePartnershipId || pId !== activePartnershipId) {
        console.warn(`User ${socket.data.userId} attempted to join unauthorized room ${pId}`);
        return;
      }

      socket.data.partnershipId = pId;
      socket.join(pId);
      console.log(`User ${socket.data.userId} joined room ${pId}`);
    });
    
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.data.userId}`);
    });
  });
};

export const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};
