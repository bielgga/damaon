import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import { useNotifications } from '../components/Notifications';
import { Room, Position, PlayerColor } from '../types/game';

const SOCKET_URL = 'https://web-production-4161.up.railway.app';

class SocketService {
  socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    if (this.socket?.connected) {
      console.log('Socket já conectado');
      return this.socket;
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

    this.socket.on('connect', () => {
      console.log('Socket conectado:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.getRooms();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket desconectado:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Erro de conexão:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        useNotifications().addNotification('error', 'Erro de conexão com o servidor');
      }
    });

    this.socket.on('availableRooms', (rooms: Room[]) => {
      console.log('Salas disponíveis recebidas:', rooms);
      useGameStore.getState().setAvailableRooms(rooms);
    });
  }

  getRooms() {
    console.log('Solicitando lista de salas...');
    if (!this.socket?.connected) {
      console.log('Socket não conectado, reconectando...');
      this.socket = this.connect();
    }
    this.socket?.emit('getRooms');
  }

  // Métodos de Sala
  createRoom(playerName: string): Promise<Room> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        this.socket = this.connect();
      }

      console.log('Criando sala para:', playerName);
      
      // Timeout para a operação completa
      const timeout = setTimeout(() => {
        this.socket?.off('roomCreated');
        reject(new Error('Timeout ao criar sala'));
      }, 5000);

      // Handler para sucesso na criação da sala
      const handleRoomCreated = (room: Room) => {
        clearTimeout(timeout);
        console.log('Sala criada com sucesso:', room);
        
        // Atualiza o estado global
        useGameStore.getState().setRoomData(room);
        
        // Remove o listener para evitar duplicatas
        this.socket?.off('roomCreated', handleRoomCreated);
        
        resolve(room);
      };

      // Handler para erro
      const handleError = (error: any) => {
        clearTimeout(timeout);
        this.socket?.off('error', handleError);
        this.socket?.off('roomCreated', handleRoomCreated);
        reject(error);
      };

      // Registra os handlers
      this.socket?.once('roomCreated', handleRoomCreated);
      this.socket?.once('error', handleError);

      // Envia a requisição de criação
      this.socket?.emit('createRoom', { playerName }, (response: any) => {
        if (response?.error) {
          handleError(response.error);
        }
      });
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

  disconnect() {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
    this.socket = null;
  }
}

export const socketService = new SocketService(); 