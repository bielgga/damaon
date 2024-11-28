import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import { useNotifications } from '../components/Notifications';
import { Room, Position, PlayerColor } from '../types/game';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://web-production-4161.up.railway.app';

interface MoveData {
  from: Position;
  to: Position;
}

interface GameOverData {
  winner: PlayerColor;
  reason: string;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private roomsInterval: NodeJS.Timeout | null = null;
  
  connect() {
    if (this.socket?.connected) return;

    console.log('Tentando conectar ao servidor:', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Conectado ao servidor com sucesso');
      this.reconnectAttempts = 0;
      this.getRooms();
      useNotifications().addNotification('success', 'Conectado ao servidor');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Erro de conexão:', error);
      useNotifications().addNotification('error', 'Erro ao conectar ao servidor');
    });

    // Eventos de Sala
    this.socket.on('roomCreated', (room: Room) => {
      console.log('Sala criada:', room);
      useGameStore.getState().setRoomData(room);
      useNotifications().addNotification('success', 'Sala criada com sucesso');
      this.getRooms();
    });

    this.socket.on('roomJoined', (room: Room) => {
      console.log('Entrou na sala:', room);
      useGameStore.getState().setRoomData(room);
      useNotifications().addNotification('success', 'Entrou na sala com sucesso');
      this.getRooms();
    });

    this.socket.on('availableRooms', (rooms: Room[]) => {
      console.log('Salas disponíveis:', rooms);
      useGameStore.getState().setAvailableRooms(rooms);
    });

    // Eventos de Jogo
    this.socket.on('gameStarted', (gameData) => {
      console.log('Jogo iniciado:', gameData);
      useGameStore.getState().startGame(gameData);
      useNotifications().addNotification('info', 'O jogo começou!');
    });

    this.socket.on('moveMade', (moveData: MoveData) => {
      console.log('Movimento realizado:', moveData);
      const { from, to } = moveData;
      const store = useGameStore.getState();
      store.movePiece(from, to);
    });

    this.socket.on('turnChanged', (currentPlayer: PlayerColor) => {
      console.log('Turno alterado:', currentPlayer);
      useGameStore.getState().setCurrentPlayer(currentPlayer);
    });

    this.socket.on('gameOver', (data: GameOverData) => {
      console.log('Jogo finalizado:', data);
      useGameStore.getState().handleGameOver(data);
      useNotifications().addNotification('info', `Jogo finalizado! Vencedor: ${data.winner}`);
    });

    // Eventos de Jogador
    this.socket.on('playerDisconnected', (playerId: string) => {
      console.log('Jogador desconectado:', playerId);
      useGameStore.getState().handlePlayerDisconnect(playerId);
      useNotifications().addNotification('warning', 'Um jogador se desconectou');
      this.getRooms();
    });

    this.socket.on('playerReconnected', (playerId: string) => {
      console.log('Jogador reconectado:', playerId);
      useNotifications().addNotification('success', 'Jogador reconectado');
    });

    // Polling de salas
    this.startRoomsPolling();
  }

  private startRoomsPolling() {
    if (this.roomsInterval) {
      clearInterval(this.roomsInterval);
    }

    this.roomsInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.getRooms();
      }
    }, 3000);
  }

  // Métodos de Sala
  createRoom(playerName: string) {
    if (!this.socket?.connected) {
      console.log('Socket não conectado, tentando reconectar...');
      this.connect();
      
      // Aguarda a conexão antes de criar a sala
      this.socket?.once('connect', () => {
        console.log('Conectado! Criando sala...');
        this.socket?.emit('createRoom', { playerName });
      });
      return;
    }

    console.log('Emitindo evento createRoom:', { playerName });
    this.socket.emit('createRoom', { playerName });
  }

  joinRoom(roomId: string, playerName: string) {
    console.log('Entrando na sala:', roomId, 'como:', playerName);
    this.socket?.emit('joinRoom', { roomId, playerName });
  }

  leaveRoom(roomId: string) {
    console.log('Saindo da sala:', roomId);
    this.socket?.emit('leaveRoom', { roomId });
  }

  getRooms() {
    this.socket?.emit('getRooms');
  }

  // Métodos de Jogo
  makeMove(roomId: string, from: Position, to: Position) {
    console.log('Realizando movimento:', { roomId, from, to });
    this.socket?.emit('makeMove', { roomId, from, to });
  }

  surrender(roomId: string) {
    console.log('Desistindo do jogo:', roomId);
    this.socket?.emit('surrender', { roomId });
  }

  requestRematch(roomId: string) {
    console.log('Solicitando revanche:', roomId);
    this.socket?.emit('requestRematch', { roomId });
  }

  disconnect() {
    if (this.roomsInterval) {
      clearInterval(this.roomsInterval);
    }
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketService = new SocketService(); 