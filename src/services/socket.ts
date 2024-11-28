import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import { useNotifications } from '../components/Notifications';
import { Room, Position, PlayerColor } from '../types/game';

const SOCKET_URL = 'https://web-production-4161.up.railway.app';

class SocketService {
  socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private roomsInterval: NodeJS.Timeout | null = null;
  
  connect() {
    if (this.socket?.connected) {
      console.log('Socket já conectado');
      return this.socket;
    }

    // Desconecta socket existente se houver
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    console.log('Tentando conectar ao servidor:', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    this.setupEventListeners();
    return this.socket;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Eventos de Conexão
    this.socket.on('connect', () => {
      console.log('Socket conectado:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket desconectado:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Erro de conexão:', error);
      this.reconnectAttempts++;
    });

    // Eventos de Sala
    this.socket.on('roomCreated', (room: Room) => {
      console.log('Sala criada e jogador adicionado:', room);
      useGameStore.getState().setRoomData(room);
      useNotifications().addNotification('success', 'Sala criada com sucesso');
    });

    this.socket.on('roomJoined', (room: Room) => {
      console.log('Entrou na sala:', room);
      useGameStore.getState().setRoomData(room);
    });

    this.socket.on('gameStarted', (room: Room) => {
      console.log('Jogo iniciado:', room);
      if (room.gameData?.pieces) {
        console.log('Peças iniciais:', room.gameData.pieces);
      }
      useGameStore.getState().setRoomData(room);
      useNotifications().addNotification('info', 'O jogo começou!');
    });

    this.socket.on('availableRooms', (rooms: Room[]) => {
      useGameStore.getState().setAvailableRooms(rooms);
    });

    // Eventos de Jogo
    this.socket.on('moveMade', (data: { from: Position; to: Position }) => {
      console.log('Movimento realizado:', data);
      const store = useGameStore.getState();
      if (store.currentRoom?.gameData) {
        store.handleOpponentMove(data);
      }
    });

    this.socket.on('gameUpdated', (room: Room) => {
      console.log('Estado do jogo atualizado:', room);
      useGameStore.getState().setRoomData(room);
    });

    // Eventos de Erro
    this.socket.on('error', (error: any) => {
      console.error('Erro do servidor:', error);
      useNotifications().addNotification('error', error.message || 'Erro desconhecido');
    });
  }

  // Métodos de Sala
  createRoom(playerName: string): Promise<Room> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        this.socket = this.connect();
      }

      console.log('Criando sala para:', playerName);
      
      const handleRoomCreated = (room: Room) => {
        console.log('Sala criada com sucesso:', room);
        useGameStore.getState().setRoomData(room);
        this.socket?.off('roomCreated', handleRoomCreated);
        resolve(room);
      };

      this.socket?.once('roomCreated', handleRoomCreated);

      this.socket?.emit('createRoom', { playerName }, (response: any) => {
        if (response.error) {
          console.error('Erro ao criar sala:', response.error);
          this.socket?.off('roomCreated', handleRoomCreated);
          reject(response.error);
        }
      });

      // Timeout para evitar que a promessa fique pendente indefinidamente
      setTimeout(() => {
        this.socket?.off('roomCreated', handleRoomCreated);
        reject(new Error('Timeout ao criar sala'));
      }, 5000);
    });
  }

  joinRoom(roomId: string, playerName: string) {
    if (!this.socket?.connected) {
      this.socket = this.connect();
    }

    const currentRoom = useGameStore.getState().currentRoom;
    
    // Verifica se o jogador já está na sala correta
    if (currentRoom?.id === roomId && 
        currentRoom.players.some(p => p.name === playerName)) {
      console.log('Jogador já está na sala:', roomId);
      return;
    }

    // Verifica se a sala está cheia
    if (currentRoom?.players.length === 2) {
      console.log('Sala está cheia:', roomId);
      useNotifications().addNotification('error', 'Esta sala está cheia');
      return;
    }

    console.log('Entrando na sala:', roomId, 'como:', playerName);
    this.socket?.emit('joinRoom', { roomId, playerName });
  }

  leaveRoom(roomId: string) {
    console.log('Saindo da sala:', roomId);
    this.socket?.emit('leaveRoom', { roomId });
  }

  // Métodos de Jogo
  makeMove(roomId: string, from: Position, to: Position) {
    console.log('Realizando movimento:', { roomId, from, to });
    this.socket?.emit('makeMove', { roomId, from, to });
  }

  // Métodos de Atualização
  getRooms() {
    if (!this.socket?.connected) {
      this.socket = this.connect();
    }
    this.socket?.emit('getRooms');
  }

  disconnect() {
    if (this.roomsInterval) {
      clearInterval(this.roomsInterval);
    }
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
    this.socket = null;
  }
}

export const socketService = new SocketService(); 