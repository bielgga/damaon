import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { Room, RoomPlayer } from './types';
import { initializeBoard } from '../src/utils/gameLogic';

dotenv.config();

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || "https://damaon.netlify.app",
  credentials: true
}));

app.get('/', (req, res) => {
  res.send('Server is running');
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "https://damaon.netlify.app",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const rooms = new Map<string, Room>();

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // Enviar salas disponíveis
  socket.on('getRooms', () => {
    socket.emit('availableRooms', Array.from(rooms.values()));
  });

  // Criar sala
  socket.on('createRoom', ({ playerName }) => {
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
      gameData: {
        pieces: initializeBoard(),
        currentPlayer: 'red',
        scores: { red: 0, black: 0 }
      }
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    socket.emit('roomCreated', room);
    io.emit('availableRooms', Array.from(rooms.values()));
  });

  // Entrar na sala
  socket.on('joinRoom', ({ roomId, playerName }) => {
    const room = rooms.get(roomId);
    if (room && room.players.length < 2) {
      const newPlayer: RoomPlayer = {
        id: socket.id,
        name: playerName,
        color: 'black'
      };

      room.players.push(newPlayer);
      room.status = 'playing';
      
      socket.join(roomId);
      rooms.set(roomId, room);
      
      io.to(roomId).emit('roomJoined', room);
      io.emit('availableRooms', Array.from(rooms.values()));

      // Iniciar o jogo
      io.to(roomId).emit('gameStarted', room.gameData);
    }
  });

  // Realizar movimento
  socket.on('makeMove', ({ roomId, from, to }) => {
    const room = rooms.get(roomId);
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player && player.color === room.gameData?.currentPlayer) {
        io.to(roomId).emit('moveMade', { from, to });
        
        // Atualizar o estado do jogo
        if (room.gameData) {
          room.gameData.currentPlayer = room.gameData.currentPlayer === 'red' ? 'black' : 'red';
          rooms.set(roomId, room);
        }
      }
    }
  });

  // Desconexão
  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        // Notificar outros jogadores
        io.to(roomId).emit('playerDisconnected', socket.id);
        
        room.players.splice(playerIndex, 1);
        if (room.players.length === 0) {
          rooms.delete(roomId);
        } else {
          room.status = 'waiting';
          rooms.set(roomId, room);
        }
      }
    });
    io.emit('availableRooms', Array.from(rooms.values()));
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});