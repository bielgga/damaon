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
      useNotifications().addNotification('success', 'Conectado ao servidor');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket desconectado:', reason);
      useNotifications().addNotification('warning', 'Desconectado do servidor');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Erro de conexão:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        useNotifications().addNotification('error', 'Não foi possível conectar ao servidor');
      }
    });

    // Eventos de Sala
    this.socket.on('roomCreated', (room: Room) => {
      console.log('Sala criada:', room);
      useGameStore.getState().setRoomData(room);
      useNotifications().addNotification('success', 'Sala criada com sucesso');
    });

    this.socket.on('roomJoined', (room: Room) => {
      console.log('Entrou na sala:', room);
      useGameStore.getState().setRoomData(room);
      useNotifications().addNotification('success', 'Entrou na sala com sucesso');
    });

    this.socket.on('gameStarted', (room: Room) => {
      console.log('Jogo iniciado:', room);
      useGameStore.getState().setRoomData(room);
      useNotifications().addNotification('info', 'O jogo começou!');
    });

    this.socket.on('availableRooms', (rooms: Room[]) => {
      console.log('Atualizando lista de salas:', rooms);
      useGameStore.getState().setAvailableRooms(rooms);
    });

    // Eventos de Jogo
    this.socket.on('moveMade', (data: { from: Position; to: Position }) => {
      console.log('Movimento realizado:', data);
      const store = useGameStore.getState();
      if (store.currentRoom) {
        store.handleOpponentMove(data);
      }
    });

    this.socket.on('turnChanged', (currentPlayer: PlayerColor) => {
      console.log('Turno alterado:', currentPlayer);
      useGameStore.getState().setCurrentPlayer(currentPlayer);
    });

    this.socket.on('gameOver', (data: { winner: PlayerColor; reason: string }) => {
      console.log('Jogo finalizado:', data);
      useGameStore.getState().handleGameOver(data);
      useNotifications().addNotification(
        'info', 
        `Jogo finalizado! ${data.winner === 'red' ? 'Vermelho' : 'Preto'} venceu por ${data.reason}!`
      );
    });

    // Eventos de Jogador
    this.socket.on('playerLeft', (data: { playerId: string; room: Room }) => {
      console.log('Jogador saiu:', data);
      useGameStore.getState().handlePlayerDisconnect(data.playerId);
      useNotifications().addNotification('warning', 'Um jogador saiu da sala');
    });

    this.socket.on('playerReconnected', (playerId: string) => {
      console.log('Jogador reconectado:', playerId);
      useNotifications().addNotification('success', 'Jogador reconectou');
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
      this.socket?.emit('createRoom', { playerName }, (response: any) => {
        if (response.error) {
          console.error('Erro ao criar sala:', response.error);
          reject(response.error);
        } else {
          console.log('Sala criada com sucesso:', response);
          resolve(response);
        }
      });
    });
  }

  joinRoom(roomId: string, playerName: string) {
    if (!this.socket?.connected) {
      this.socket = this.connect();
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

  surrender(roomId: string) {
    console.log('Desistindo do jogo:', roomId);
    this.socket?.emit('surrender', { roomId });
  }

  requestRematch(roomId: string) {
    console.log('Solicitando revanche:', roomId);
    this.socket?.emit('requestRematch', { roomId });
  }

  // Métodos de Atualização
  getRooms() {
    if (!this.socket?.connected) {
      this.socket = this.connect();
    }
    this.socket?.emit('getRooms');
  }

  startRoomsPolling() {
    if (this.roomsInterval) {
      clearInterval(this.roomsInterval);
    }
    this.roomsInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.getRooms();
      }
    }, 3000);
  }

  stopRoomsPolling() {
    if (this.roomsInterval) {
      clearInterval(this.roomsInterval);
      this.roomsInterval = null;
    }
  }

  disconnect() {
    this.stopRoomsPolling();
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
    this.socket = null;
  }
}

export const socketService = new SocketService(); 