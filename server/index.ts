import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());

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

interface GameRoom {
  id: string;
  name: string;
  players: Array<{
    id: string;
    name: string;
    color?: 'red' | 'black';
  }>;
  status: 'waiting' | 'playing' | 'finished';
}

const rooms = new Map<string, GameRoom>();

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('getRooms', () => {
    socket.emit('availableRooms', Array.from(rooms.values()));
  });

  socket.on('createRoom', ({ playerName }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room: GameRoom = {
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
    socket.join(roomId);
    socket.emit('roomCreated', room);
    io.emit('availableRooms', Array.from(rooms.values()));
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    const room = rooms.get(roomId);
    if (room && room.players.length < 2) {
      room.players.push({
        id: socket.id,
        name: playerName,
        color: 'black'
      });
      room.status = 'playing';
      
      socket.join(roomId);
      rooms.set(roomId, room);
      
      io.to(roomId).emit('roomJoined', room);
      io.emit('availableRooms', Array.from(rooms.values()));

      io.to(roomId).emit('gameStarted', {
        pieces: [], // Configuração inicial das peças
        currentPlayer: 'red'
      });
    }
  });

  socket.on('makeMove', ({ roomId, from, to }) => {
    const room = rooms.get(roomId);
    if (room) {
      io.to(roomId).emit('moveMade', { from, to });
    }
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
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