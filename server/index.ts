import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { Room, Piece, PlayerColor, PieceType, Position } from '../shared/types';

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
      
      // Verifica se o jogador já está em alguma sala
      const existingRoom = Array.from(rooms.values()).find(
        room => room.players.some(p => p.name === playerName || p.id === socket.id)
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

      // Verifica se o jogador já está em alguma sala
      const isInAnyRoom = Array.from(rooms.values()).some(
        r => r.players.some(p => p.name === playerName || p.id === socket.id)
      );

      if (isInAnyRoom) {
        socket.emit('error', { message: 'Você já está em uma sala' });
        return;
      }

      // Verifica se a sala está cheia
      if (room.players.length >= 2) {
        socket.emit('error', { message: 'Sala cheia' });
        return;
      }

      // Verifica se o jogador está tentando entrar em sua própria sala
      const isCreator = room.players.some(p => p.name === playerName);
      if (isCreator) {
        socket.emit('error', { message: 'Você não pode entrar em sua própria sala' });
        return;
      }

      // Adiciona o segundo jogador como preto
      room.players.push({
        id: socket.id,
        name: playerName,
        color: 'black'
      });

      room.lastActivity = Date.now();
      rooms.set(roomId, room);
      playerRooms.set(socket.id, roomId);
      
      await socket.join(roomId);
      
      // Inicia o jogo apenas quando houver dois jogadores diferentes
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

  socket.on('makeMove', async ({ roomId, from, to }) => {
    try {
      const room = rooms.get(roomId);
      if (!room || !room.gameData) {
        socket.emit('error', { message: 'Sala não encontrada ou jogo não iniciado' });
        return;
      }

      const player = room.players.find(p => p.id === socket.id);
      if (!player) {
        socket.emit('error', { message: 'Jogador não encontrado na sala' });
        return;
      }

      // Verifica se é a vez do jogador
      if (player.color !== room.gameData.currentPlayer) {
        socket.emit('error', { message: 'Não é sua vez' });
        return;
      }

      // Encontra a peça que está sendo movida
      const piece = room.gameData.pieces.find(
        p => p.position.row === from.row && p.position.col === from.col
      );

      if (!piece || piece.player !== player.color) {
        socket.emit('error', { message: 'Peça inválida' });
        return;
      }

      // Valida o movimento
      const result = makeMove(room.gameData.pieces, from, to, player.color);
      if (!result) {
        socket.emit('error', { message: 'Movimento inválido' });
        return;
      }

      // Atualiza o estado do jogo
      room.gameData.pieces = result.newPieces;
      
      // Se não houver mais capturas disponíveis, passa a vez
      if (!result.mustContinueCapture) {
        room.gameData.currentPlayer = player.color === 'red' ? 'black' : 'red';
      }

      // Atualiza pontuação se houve captura
      if (result.captured) {
        room.gameData.scores[player.color]++;
      }

      // Verifica condições de vitória
      const remainingPieces = {
        red: room.gameData.pieces.filter(p => p.player === 'red').length,
        black: room.gameData.pieces.filter(p => p.player === 'black').length
      };

      if (remainingPieces.red === 0 || remainingPieces.black === 0) {
        const winner = remainingPieces.red === 0 ? 'black' : 'red';
        room.status = 'finished';
        io.to(roomId).emit('gameOver', { 
          winner,
          reason: 'capture'
        });
      }

      // Emite os eventos de atualização
      io.to(roomId).emit('moveMade', { from, to });
      io.to(roomId).emit('gameUpdated', room);

      // Atualiza a sala
      rooms.set(roomId, room);

    } catch (error) {
      logWithTimestamp('Erro ao realizar movimento:', { error });
      socket.emit('error', { message: 'Erro ao realizar movimento' });
    }
  });

  socket.on('surrender', ({ roomId }) => {
    try {
      const room = rooms.get(roomId);
      if (!room || !room.gameData) return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      room.status = 'finished';
      const winner = player.color === 'red' ? 'black' : 'red';

      io.to(roomId).emit('gameOver', {
        winner,
        reason: 'surrender'
      });

      rooms.set(roomId, room);

    } catch (error) {
      logWithTimestamp('Erro ao desistir:', { error });
    }
  });

  socket.on('requestRematch', ({ roomId }) => {
    try {
      const room = rooms.get(roomId);
      if (!room) return;

      // Reinicia o jogo
      room.status = 'playing';
      room.gameData = {
        pieces: initializeBoard(),
        currentPlayer: 'red',
        scores: { red: 0, black: 0 }
      };

      io.to(roomId).emit('gameStarted', room);
      rooms.set(roomId, room);

    } catch (error) {
      logWithTimestamp('Erro ao solicitar revanche:', { error });
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

// Funções de validação de movimento
function getBasicMoves(piece: Piece, pieces: Piece[]): Position[] {
  const moves: Position[] = [];
  const { row, col } = piece.position;

  // Direções possíveis de movimento
  const directions = piece.type === 'normal'
    ? (piece.player === 'black' ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]])
    : [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  // Verifica cada direção possível
  for (const [dRow, dCol] of directions) {
    const newRow = row + dRow;
    const newCol = col + dCol;

    // Verifica se está dentro do tabuleiro
    if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) continue;

    // Verifica se a posição está vazia
    if (!pieces.some(p => p.position.row === newRow && p.position.col === newCol)) {
      moves.push({ row: newRow, col: newCol });
    }
  }

  return moves;
}

function getCaptureMoves(piece: Piece, pieces: Piece[]): Position[] {
  const moves: Position[] = [];
  const { row, col } = piece.position;

  // Direções possíveis de captura
  const directions = piece.type === 'normal'
    ? (piece.player === 'black' ? [[2, -2], [2, 2]] : [[-2, -2], [-2, 2]])
    : [[-2, -2], [-2, 2], [2, -2], [2, 2]];

  // Verifica cada direção possível
  for (const [dRow, dCol] of directions) {
    const newRow = row + dRow;
    const newCol = col + dCol;
    const midRow = row + dRow/2;
    const midCol = col + dCol/2;

    // Verifica se está dentro do tabuleiro
    if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) continue;

    // Verifica se há uma peça adversária no meio
    const capturedPiece = pieces.find(p => 
      p.position.row === midRow && 
      p.position.col === midCol && 
      p.player !== piece.player
    );

    // Verifica se a posição final está vazia
    const isDestinationEmpty = !pieces.some(p =>
      p.position.row === newRow && p.position.col === newCol
    );

    if (capturedPiece && isDestinationEmpty) {
      moves.push({ row: newRow, col: newCol });
    }
  }

  return moves;
}

// Função para obter movimentos válidos
function getValidMoves(pieces: Piece[], from: Position, currentPlayer: PlayerColor): Position[] {
  const piece = pieces.find(p => 
    p.position.row === from.row && 
    p.position.col === from.col && 
    p.player === currentPlayer
  );

  if (!piece) return [];

  // Verifica se há capturas disponíveis
  const captures = getCaptureMoves(piece, pieces);
  if (captures.length > 0) return captures;

  // Se não houver capturas, retorna movimentos básicos
  return getBasicMoves(piece, pieces);
}

// Função auxiliar para validar movimento
function makeMove(pieces: Piece[], from: Position, to: Position, currentPlayer: PlayerColor) {
  // Verifica se é um movimento válido
  const validMoves = getValidMoves(pieces, from, currentPlayer);
  if (!validMoves.some(move => move.row === to.row && move.col === to.col)) {
    return null;
  }

  const newPieces = [...pieces];
  const pieceIndex = pieces.findIndex(
    p => p.position.row === from.row && p.position.col === from.col
  );

  // Atualiza a posição da peça
  newPieces[pieceIndex] = {
    ...newPieces[pieceIndex],
    position: to
  };

  // Verifica se é uma captura
  const rowDiff = Math.abs(to.row - from.row);
  const colDiff = Math.abs(to.col - from.col);
  let captured = false;
  let mustContinueCapture = false;

  if (rowDiff === 2) {
    const capturedRow = (from.row + to.row) / 2;
    const capturedCol = (from.col + to.col) / 2;
    const capturedIndex = pieces.findIndex(
      p => p.position.row === capturedRow && p.position.col === capturedCol
    );
    
    if (capturedIndex !== -1) {
      newPieces.splice(capturedIndex, 1);
      captured = true;

      // Verifica se há mais capturas disponíveis
      const moreCapturesAvailable = hasMoreCaptures(newPieces, to, currentPlayer);
      if (moreCapturesAvailable) {
        mustContinueCapture = true;
      }
    }
  }

  // Verifica promoção a dama
  const piece = newPieces[pieceIndex];
  if (
    piece.type === 'normal' && 
    ((currentPlayer === 'red' && to.row === 0) || 
     (currentPlayer === 'black' && to.row === 7))
  ) {
    piece.type = 'king';
  }

  return {
    newPieces,
    captured,
    mustContinueCapture
  };
}

function hasMoreCaptures(pieces: Piece[], position: Position, player: PlayerColor): boolean {
  const piece = pieces.find(p => 
    p.position.row === position.row && p.position.col === position.col
  );
  if (!piece) return false;

  // Verifica todas as direções possíveis para captura
  const directions = [
    [-2, -2], [-2, 2], [2, -2], [2, 2]
  ];

  for (const [dRow, dCol] of directions) {
    const newRow = position.row + dRow;
    const newCol = position.col + dCol;
    const midRow = position.row + dRow/2;
    const midCol = position.col + dCol/2;

    // Verifica se a posição final está dentro do tabuleiro
    if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) continue;

    // Verifica se há uma peça adversária no meio
    const capturedPiece = pieces.find(p => 
      p.position.row === midRow && 
      p.position.col === midCol && 
      p.player !== player
    );

    // Verifica se a posição final está vazia
    const isDestinationEmpty = !pieces.some(p =>
      p.position.row === newRow && p.position.col === newCol
    );

    if (capturedPiece && isDestinationEmpty) {
      return true;
    }
  }

  return false;
}

export default server;
