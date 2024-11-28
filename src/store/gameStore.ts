import { create } from 'zustand';
import { GameState, Piece, PlayerColor, Position, GameMode, Difficulty, Room, RoomPlayer } from '../types/game';
import { getValidMoves, initializeBoard, makeMove } from '../utils/gameLogic';
import { calculateBestMove } from '../utils/ai';
import { useNotifications } from '../components/Notifications';

interface GameStore extends GameState {
  // Métodos de Inicialização
  initGame: (mode: GameMode, difficulty?: Difficulty) => void;
  resetGame: () => void;
  goBack: () => void;

  // Métodos de Jogo
  selectPiece: (pieceId: string | null) => void;
  movePiece: (from: Position, to: Position) => void;
  setCurrentPlayer: (player: PlayerColor) => void;
  handleGameOver: (data: { winner: PlayerColor; reason: string }) => void;

  // Métodos de UI
  showGameSelection: boolean;
  setShowGameSelection: (show: boolean) => void;

  // Métodos de Sala Online
  createRoom: () => void;
  joinRoom: (roomId: string, name: string) => void;
  leaveRoom: () => void;
  setGuestName: (name: string) => void;
  setPlayerName: (name: string) => void;
  setAvailableRooms: (rooms: Room[]) => void;
  setRoomData: (roomData: Room) => void;
  addPlayer: (player: RoomPlayer) => void;
  handlePlayerDisconnect: (playerId: string) => void;
  startGame: (gameData: any) => void;
  handleOpponentMove: (moveData: { from: Position; to: Position }) => void;
  surrender: () => void;
  requestRematch: () => void;

  // Estado do Jogo Online
  roomId: string | null;
  isHost: boolean;
  guestName: string | null;
  isWaitingPlayer: boolean;
  playerName: string | null;
  availableRooms: Room[];
  currentRoom: Room | null;
  opponent: {
    name: string | null;
    avatar: string | null;
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Estado Inicial
  pieces: [],
  currentPlayer: 'red',
  selectedPiece: null,
  validMoves: [],
  scores: { black: 0, red: 0 },
  gameOver: false,
  winner: null,
  activeCaptureSequence: false,
  gameMode: null,
  difficulty: null,
  showGameSelection: false,
  currentRoom: null,
  roomId: null,
  isHost: false,
  guestName: null,
  isWaitingPlayer: false,
  opponent: {
    name: null,
    avatar: null
  },
  availableRooms: [],
  playerName: null,

  // Métodos de Inicialização
  initGame: (mode: GameMode, difficulty?: Difficulty) => {
    set({
      pieces: initializeBoard(),
      currentPlayer: 'red',
      selectedPiece: null,
      validMoves: [],
      gameOver: false,
      winner: null,
      scores: { black: 0, red: 0 },
      activeCaptureSequence: false,
      gameMode: mode,
      difficulty: difficulty || null,
      showGameSelection: false,
    });
  },

  resetGame: () => {
    const { gameMode, difficulty } = get();
    get().initGame(gameMode!, difficulty || undefined);
  },

  goBack: () => {
    const { gameMode, currentRoom } = get();
    if (currentRoom) {
      // Se estiver em uma sala, sai dela
      get().leaveRoom();
    } else if (gameMode) {
      // Se estiver em um jogo, volta para a seleção de modo
      set({
        gameMode: null,
        difficulty: null,
        pieces: [],
        currentPlayer: 'red',
        selectedPiece: null,
        validMoves: [],
        gameOver: false,
        winner: null,
        showGameSelection: false
      });
    } else if (get().showGameSelection) {
      // Se estiver na seleção de modo, volta para a lista de jogos
      set({ showGameSelection: false });
    }
  },

  // Métodos de Jogo
  selectPiece: (pieceId: string | null) => {
    const { pieces, currentPlayer, currentRoom, playerName } = get();
    
    // Verifica se é a vez do jogador em modo online
    if (currentRoom) {
      const player = currentRoom.players.find(p => p.name === playerName);
      if (!player || player.color !== currentPlayer) {
        useNotifications().addNotification('error', 'Não é sua vez!');
        return;
      }
    }

    if (!pieceId) {
      set({ selectedPiece: null, validMoves: [] });
      return;
    }

    const piece = pieces.find(p => p.id === pieceId);
    if (!piece || piece.player !== currentPlayer) {
      set({ selectedPiece: null, validMoves: [] });
      return;
    }

    const validMoves = getValidMoves(piece, pieces);
    set({ selectedPiece: pieceId, validMoves });
  },

  movePiece: (from: Position, to: Position) => {
    const { pieces, currentPlayer, currentRoom, playerName, gameMode } = get();
    
    // Verifica se é a vez do jogador em modo online
    if (gameMode === 'online' && currentRoom) {
      const player = currentRoom.players.find(p => p.name === playerName);
      if (!player || player.color !== currentPlayer) {
        return; // Não permite mover se não for sua vez
      }
    }

    const result = makeMove(pieces, from, to, currentPlayer);
    if (!result) return;

    const { newPieces, captured, isKinged } = result;

    set({
      pieces: newPieces,
      currentPlayer: captured ? (isKinged ? currentPlayer : (currentPlayer === 'red' ? 'black' : 'red')) : (currentPlayer === 'red' ? 'black' : 'red'),
      selectedPiece: null,
      validMoves: [],
      scores: {
        ...get().scores,
        [currentPlayer]: get().scores[currentPlayer] + (captured ? 1 : 0)
      }
    });

    // Verifica condições de vitória
    const remainingPieces = {
      red: newPieces.filter(p => p.player === 'red').length,
      black: newPieces.filter(p => p.player === 'black').length
    };

    if (remainingPieces.red === 0 || remainingPieces.black === 0) {
      const winner = remainingPieces.red === 0 ? 'black' : 'red';
      set({ gameOver: true, winner });
      useNotifications().addNotification('success', `Jogo finalizado! ${winner === 'red' ? 'Vermelho' : 'Preto'} venceu!`);
    }
  },

  // Métodos de UI
  setShowGameSelection: (show: boolean) => set({ showGameSelection: show }),

  // Métodos de Estado do Jogo
  setCurrentPlayer: (player: PlayerColor) => set({ currentPlayer: player }),

  handleGameOver: (data) => {
    set({ 
      gameOver: true, 
      winner: data.winner,
      currentRoom: data.reason === 'surrender' 
        ? { ...get().currentRoom!, status: 'finished' } 
        : get().currentRoom
    });
    useNotifications().addNotification(
      'info', 
      `Jogo finalizado! ${data.winner === 'red' ? 'Vermelho' : 'Preto'} venceu por ${data.reason}!`
    );
  },

  // Métodos de Sala Online
  createRoom: () => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    set({ 
      roomId, 
      isHost: true,
      isWaitingPlayer: true 
    });
    // Aqui você implementaria a lógica de conexão com o servidor
  },

  joinRoom: (roomId: string, name: string) => {
    set({ 
      roomId,
      isHost: false,
      guestName: name,
      isWaitingPlayer: false
    });
    // Aqui você implementaria a lógica de conexão com o servidor
  },

  leaveRoom: () => {
    set({
      roomId: null,
      isHost: false,
      guestName: null,
      isWaitingPlayer: false,
      opponent: {
        name: null,
        avatar: null
      }
    });
  },

  setGuestName: (name: string) => {
    set({ guestName: name });
  },

  setAvailableRooms: (rooms: Room[]) => {
    console.log('Atualizando lista de salas:', rooms);
    set({ availableRooms: rooms });
  },

  setRoomData: (roomData: Room) => {
    console.log('Atualizando dados da sala:', roomData);
    set({ 
      currentRoom: roomData,
      gameMode: 'online',
      isWaitingPlayer: roomData.status === 'waiting'
    });
  },

  addPlayer: (player: RoomPlayer) => {
    const currentRoom = get().currentRoom;
    if (currentRoom) {
      set({
        currentRoom: {
          ...currentRoom,
          players: [...currentRoom.players, player]
        }
      });
    }
  },

  startGame: (gameData) => {
    set({
      pieces: gameData.pieces,
      currentPlayer: gameData.currentPlayer,
      isWaitingPlayer: false
    });
  },

  handleOpponentMove: (moveData) => {
    const { from, to } = moveData;
    get().movePiece(from, to);
  },

  setPlayerName: (name) => set({ playerName: name }),

  handlePlayerDisconnect: (playerId: string) => {
    const currentRoom = get().currentRoom;
    if (currentRoom) {
      const updatedPlayers = currentRoom.players.filter(p => p.id !== playerId);
      set({
        currentRoom: {
          ...currentRoom,
          players: updatedPlayers,
          status: 'waiting'
        },
        isWaitingPlayer: true
      });
    }
  },

  surrender: () => {
    const { currentRoom, playerName } = get();
    if (currentRoom) {
      const player = currentRoom.players.find(p => p.name === playerName);
      if (player) {
        const updatedPlayers = currentRoom.players.filter(p => p.id !== player.id);
        set({
          currentRoom: {
            ...currentRoom,
            players: updatedPlayers,
            status: 'finished'
          },
          isWaitingPlayer: true
        });
      }
    }
  },

  requestRematch: () => {
    const { currentRoom, playerName } = get();
    if (currentRoom) {
      const player = currentRoom.players.find(p => p.name === playerName);
      if (player) {
        const updatedPlayers = currentRoom.players.filter(p => p.id !== player.id);
        set({
          currentRoom: {
            ...currentRoom,
            players: updatedPlayers,
            status: 'waiting'
          },
          isWaitingPlayer: true
        });
      }
    }
  },
}));