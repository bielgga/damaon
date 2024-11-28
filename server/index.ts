import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { Room, Piece, PlayerColor, PieceType, GameData } from '../shared/types';

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
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  });
});

// Logging middleware
app.use((_req: Request, _res: Response, next: NextFunction) => {
  logWithTimestamp(`${_req.method} ${_req.path}`);
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
  Array.from(rooms.entries()).forEach(([roomId, room]) => {
    if (room.players.length === 0 || (room.lastActivity && now - room.lastActivity > 3600000)) {
      rooms.delete(roomId);
      logWithTimestamp(`Sala removida por inatividade: ${roomId}`);
    }
  });
}, 300000); // Executa a cada 5 minutos

io.on('connection', (socket) => {
  logWithTimestamp('Cliente conectado:', { socketId: socket.id });

  socket.on('getRooms', () => {
    logWithTimestamp('Solicitação de lista de salas recebida');
    const activeRooms = Array.from(rooms.values())
      .filter(room => room.players.length > 0 && room.status !== 'finished');
    
    logWithTimestamp('Enviando lista de salas:', { 
      count: activeRooms.length,
      rooms: activeRooms.map(r => ({ id: r.id, name: r.name, players: r.players.length }))
    });
    
    socket.emit('availableRooms', activeRooms);
  });

  socket.on('createRoom', async ({ playerName }) => {
    try {
      logWithTimestamp('Recebida solicitação de criação de sala:', { 
        playerName,
        socketId: socket.id 
      });
      
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

      // Gera ID único para a sala
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      logWithTimestamp('Gerando nova sala:', { roomId });

      // Cria a sala com apenas o jogador vermelho
      const room: Room = {
        id: roomId,
        name: `Sala de ${playerName}`,
        players: [{
          id: socket.id,
          name: playerName,
          color: 'red' // Primeiro jogador sempre será vermelho
        }],
        status: 'waiting',
        lastActivity: Date.now(),
        createdAt: Date.now()
      };

      rooms.set(roomId, room);
      playerRooms.set(socket.id, roomId);
      
      await socket.join(roomId);
      
      logWithTimestamp('Sala criada com sucesso:', { 
        room,
        socketId: socket.id,
        roomsCount: rooms.size
      });
      
      socket.emit('roomCreated', room);
      io.emit('availableRooms', Array.from(rooms.values()));

    } catch (error) {
      logWithTimestamp('Erro ao criar sala:', { 
        error, 
        playerName,
        socketId: socket.id 
      });
      
      socket.emit('error', { 
        code: 'CREATE_ROOM_ERROR',
        message: 'Erro ao criar sala',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  socket.on('joinRoom', async ({ roomId, playerName }) => {
    try {
      logWithTimestamp('Recebida solicitação para entrar na sala:', { 
        roomId, 
        playerName,
        socketId: socket.id 
      });
      
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Sala não encontrada' });
        return;
      }

      if (room.players.length >= 2) {
        socket.emit('error', { message: 'Sala cheia' });
        return;
      }

      // Verifica se o jogador já está na sala
      if (room.players.some(p => p.name === playerName)) {
        socket.emit('error', { message: 'Você já está nesta sala' });
        return;
      }

      // Segundo jogador sempre será preto
      room.players.push({
        id: socket.id,
        name: playerName,
        color: 'black'
      });

      room.lastActivity = Date.now();
      rooms.set(roomId, room);
      playerRooms.set(socket.id, roomId);
      
      await socket.join(roomId);
      
      // Se tiver 2 jogadores, inicia o jogo
      if (room.players.length === 2) {
        room.status = 'playing';
        room.gameData = {
          pieces: initializeBoard(),
          currentPlayer: 'red', // Vermelho sempre começa
          scores: { red: 0, black: 0 }
        };
        
        logWithTimestamp('Iniciando jogo na sala:', { 
          roomId,
          players: room.players 
        });
        
        io.to(roomId).emit('gameStarted', room);
      } else {
        io.to(roomId).emit('roomJoined', room);
      }

      io.emit('availableRooms', Array.from(rooms.values()));

    } catch (error) {
      logWithTimestamp('Erro ao entrar na sala:', { error });
      socket.emit('error', { message: 'Erro ao entrar na sala' });
    }
  });

  // Monitora desconexões com mais detalhes
  socket.on('disconnect', (reason) => {
    logWithTimestamp('Cliente desconectado:', { 
      socketId: socket.id, 
      reason,
      roomId: playerRooms.get(socket.id)
    });
    
    const roomId = playerRooms.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        logWithTimestamp('Removendo jogador da sala:', {
          socketId: socket.id,
          roomId,
          playersCount: room.players.length
        });

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

  // Adiciona handler para erros de socket
  socket.on('error', (error) => {
    logWithTimestamp('Erro no socket:', { 
      socketId: socket.id, 
      error,
      roomId: playerRooms.get(socket.id)
    });
  });
});

// Rota raiz com informações do servidor
app.get('/', (_req: Request, res: Response) => {
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

function initializeBoard(): Piece[] {
  const pieces: Piece[] = [];
  
  // Peças vermelhas (jogador 1)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        pieces.push({
          id: `red-${row}-${col}`,
          player: 'red' as PlayerColor,
          type: 'normal' as PieceType,
          position: { row, col }
        });
      }
    }
  }
  
  // Peças pretas (jogador 2)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        pieces.push({
          id: `black-${row}-${col}`,
          player: 'black' as PlayerColor,
          type: 'normal' as PieceType,
          position: { row, col }
        });
      }
    }
  }
  
  return pieces;
}

export default server;
