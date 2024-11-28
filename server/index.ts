import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { Room, GameData } from '../shared/types';

dotenv.config();

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const PORT = process.env.PORT || 3001;

// Logging mais detalhado
const logWithTimestamp = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data) : '');
};

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  });
});

// Logging middleware
app.use((req, res, next) => {
  logWithTimestamp(`${req.method} ${req.path}`);
  next();
});

// CORS configuration
const corsOptions = {
  origin: [
    FRONTEND_URL,
    'http://localhost:3000',
    'https://dama-online.netlify.app'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
  connectTimeout: 60000,
  pingInterval: 25000
});

// Armazenamento em memória com limpeza periódica
const rooms = new Map<string, Room>();
const playerRooms = new Map<string, string>();

// Limpa salas inativas periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    // Remove salas vazias ou inativas por mais de 1 hora
    if (room.players.length === 0 || (room.lastActivity && now - room.lastActivity > 3600000)) {
      rooms.delete(roomId);
      logWithTimestamp(`Sala removida por inatividade: ${roomId}`);
    }
  }
}, 300000); // Executa a cada 5 minutos

io.on('connection', (socket) => {
  logWithTimestamp('Cliente conectado:', { socketId: socket.id });

  // Mantém registro da última atividade do socket
  let lastActivity = Date.now();
  const updateActivity = () => {
    lastActivity = Date.now();
  };

  socket.on('getRooms', () => {
    updateActivity();
    logWithTimestamp('Solicitação de lista de salas recebida');
    const activeRooms = Array.from(rooms.values())
      .filter(room => room.players.length > 0 && room.status !== 'finished')
      .map(room => ({
        ...room,
        lastActivity: undefined // Remove dados sensíveis/desnecessários
      }));
    socket.emit('availableRooms', activeRooms);
  });

  socket.on('createRoom', async ({ playerName }) => {
    try {
      updateActivity();
      logWithTimestamp('Criando sala para jogador:', { playerName });
      
      // Verifica se o jogador já está em uma sala
      const existingRoom = Array.from(rooms.values()).find(
        room => room.players.some(p => p.name === playerName)
      );

      if (existingRoom) {
        logWithTimestamp('Jogador já está em uma sala:', { 
          playerName, 
          roomId: existingRoom.id 
        });
        socket.emit('error', { 
          code: 'ALREADY_IN_ROOM',
          message: 'Você já está em uma sala' 
        });
        return;
      }

      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const room: Room = {
        id: roomId,
        name: `Sala de ${playerName}`,
        players: [{
          id: socket.id,
          name: playerName,
          color: 'red'
        }],
        status: 'waiting',
        lastActivity: Date.now(),
        createdAt: Date.now()
      };

      rooms.set(roomId, room);
      playerRooms.set(socket.id, roomId);
      
      await socket.join(roomId);
      logWithTimestamp('Sala criada com sucesso:', { room });
      
      socket.emit('roomCreated', room);
      io.emit('availableRooms', Array.from(rooms.values()));
    } catch (error) {
      logWithTimestamp('Erro ao criar sala:', { error, playerName });
      socket.emit('error', { 
        code: 'CREATE_ROOM_ERROR',
        message: 'Erro ao criar sala' 
      });
    }
  });

  // Monitora desconexões
  socket.on('disconnect', (reason) => {
    logWithTimestamp('Cliente desconectado:', { socketId: socket.id, reason });
    const roomId = playerRooms.get(socket.id);
    
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        room.lastActivity = Date.now();
        
        if (room.players.length === 0) {
          rooms.delete(roomId);
          logWithTimestamp('Sala removida por ficar vazia:', { roomId });
        } else {
          rooms.set(roomId, room);
          io.to(roomId).emit('playerLeft', { 
            playerId: socket.id,
            room 
          });
        }
        
        io.emit('availableRooms', Array.from(rooms.values()));
      }
      playerRooms.delete(socket.id);
    }
  });

  // Tratamento de erros do socket
  socket.on('error', (error) => {
    logWithTimestamp('Erro no socket:', { socketId: socket.id, error });
  });
});

// Rota raiz com informações do servidor
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Damas Online API',
    status: 'running',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
    rooms: rooms.size
  });
});

// Inicia o servidor
const server = httpServer.listen(PORT, () => {
  logWithTimestamp(`Servidor rodando na porta ${PORT}`, {
    frontend: FRONTEND_URL,
    environment: process.env.NODE_ENV
  });
});

// Tratamento de erros do servidor
server.on('error', (error) => {
  logWithTimestamp('Erro no servidor HTTP:', { error });
  process.exit(1);
});

// Graceful shutdown
const shutdown = () => {
  logWithTimestamp('Iniciando shutdown graceful...');
  
  // Notifica todos os clientes
  io.emit('serverShutdown', { message: 'Servidor está sendo desligado...' });
  
  // Fecha as conexões
  server.close(() => {
    logWithTimestamp('Servidor HTTP fechado.');
    process.exit(0);
  });

  // Força o fechamento após 10 segundos
  setTimeout(() => {
    logWithTimestamp('Forçando encerramento após timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('uncaughtException', (error) => {
  logWithTimestamp('Erro não tratado:', { error });
  shutdown();
});

process.on('unhandledRejection', (reason) => {
  logWithTimestamp('Promise não tratada:', { reason });
  shutdown();
});

export default server;
