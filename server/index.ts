import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { Room } from '../shared/types';

dotenv.config();

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const PORT = process.env.PORT || 3001;

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Healthcheck endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// CORS configuration
const corsOptions = {
  origin: [FRONTEND_URL, 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
  connectTimeout: 60000
});

// Armazenamento em memória
const rooms = new Map<string, Room>();
const playerRooms = new Map<string, string>();

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('getRooms', () => {
    console.log('Solicitação de lista de salas recebida');
    const activeRooms = Array.from(rooms.values()).filter(room => 
      room.players.length > 0 && room.status !== 'finished'
    );
    socket.emit('availableRooms', activeRooms);
  });

  socket.on('createRoom', ({ playerName }) => {
    try {
      console.log('Criando sala para jogador:', playerName);
      
      // Verifica se o jogador já está em uma sala
      const existingRoomId = Array.from(rooms.values()).find(
        room => room.players.some(p => p.name === playerName)
      )?.id;

      if (existingRoomId) {
        console.log('Jogador já está em uma sala:', existingRoomId);
        socket.emit('error', { message: 'Você já está em uma sala' });
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
        status: 'waiting'
      };

      rooms.set(roomId, room);
      playerRooms.set(socket.id, roomId);
      
      socket.join(roomId);
      console.log('Sala criada com sucesso:', room);
      
      socket.emit('roomCreated', room);
      io.emit('availableRooms', Array.from(rooms.values()));
    } catch (error) {
      console.error('Erro ao criar sala:', error);
      socket.emit('error', { message: 'Erro ao criar sala' });
    }
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    try {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Sala não encontrada' });
        return;
      }

      if (room.players.length >= 2) {
        socket.emit('error', { message: 'Sala cheia' });
        return;
      }

      room.players.push({
        id: socket.id,
        name: playerName,
        color: 'black'
      });

      rooms.set(roomId, room);
      playerRooms.set(socket.id, roomId);
      
      socket.join(roomId);
      
      io.to(roomId).emit('roomJoined', room);
      io.emit('availableRooms', Array.from(rooms.values()));
    } catch (error) {
      console.error('Erro ao entrar na sala:', error);
      socket.emit('error', { message: 'Erro ao entrar na sala' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    const roomId = playerRooms.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(roomId);
        } else {
          rooms.set(roomId, room);
        }
        io.emit('availableRooms', Array.from(rooms.values()));
      }
      playerRooms.delete(socket.id);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`CORS configurado para: ${FRONTEND_URL}`);
  console.log(`Ambiente: ${process.env.NODE_ENV}`);
});

// Error handling
httpServer.on('error', (error) => {
  console.error('Erro no servidor HTTP:', error);
});

io.on('connect_error', (error) => {
  console.error('Erro de conexão Socket.IO:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido. Iniciando shutdown graceful...');
  httpServer.close(() => {
    console.log('Servidor HTTP fechado.');
    process.exit(0);
  });
});
