import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3002';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  connect() {
    if (this.socket?.connected) return;

    console.log('Conectando ao servidor:', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Conectado ao servidor');
      this.reconnectAttempts = 0;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Erro de conexão:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Máximo de tentativas de reconexão atingido');
        alert('Erro ao conectar ao servidor. Por favor, recarregue a página.');
      }
    });

    this.socket.on('roomCreated', (roomData) => {
      useGameStore.getState().setRoomData(roomData);
    });

    this.socket.on('roomJoined', (roomData) => {
      useGameStore.getState().setRoomData(roomData);
    });

    this.socket.on('playerJoined', (player) => {
      useGameStore.getState().addPlayer(player);
    });

    this.socket.on('gameStarted', (gameData) => {
      useGameStore.getState().startGame(gameData);
    });

    this.socket.on('moveMade', (moveData) => {
      useGameStore.getState().handleOpponentMove(moveData);
    });

    this.socket.on('availableRooms', (rooms) => {
      useGameStore.getState().setAvailableRooms(rooms);
    });

    this.socket.on('playerDisconnected', (playerId) => {
      useGameStore.getState().handlePlayerDisconnect(playerId);
    });
  }

  createRoom(playerName: string) {
    this.socket?.emit('createRoom', { playerName });
  }

  joinRoom(roomId: string, playerName: string) {
    this.socket?.emit('joinRoom', { roomId, playerName });
  }

  makeMove(roomId: string, from: any, to: any) {
    this.socket?.emit('makeMove', { roomId, from, to });
  }

  getRooms() {
    this.socket?.emit('getRooms');
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketService = new SocketService(); 