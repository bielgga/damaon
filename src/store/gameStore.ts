import { create } from 'zustand';
import { GameState, Piece, PlayerColor, Position, GameMode, Difficulty, Room, RoomPlayer } from '../types/game';
import { getValidMoves, initializeBoard, makeMove } from '../utils/gameLogic';
import { calculateBestMove } from '../utils/ai';

interface Room {
  id: string;
  name: string;
  players: PlayerColor[];
  status: 'waiting' | 'playing' | 'finished';
}

interface GameStore extends GameState {
  initGame: (mode: GameMode, difficulty?: Difficulty) => void;
  selectPiece: (pieceId: string | null) => void;
  movePiece: (from: Position, to: Position) => void;
  resetGame: () => void;
  showGameSelection: boolean;
  setShowGameSelection: (show: boolean) => void;
  goBack: () => void;
  roomId: string | null;
  isHost: boolean;
  guestName: string | null;
  isWaitingPlayer: boolean;
  opponent: {
    name: string | null;
    avatar: string | null;
  };
  
  createRoom: () => void;
  joinRoom: (roomId: string, name: string) => void;
  leaveRoom: () => void;
  setGuestName: (name: string) => void;
  availableRooms: Room[];
  currentRoom: Room | null;
  playerName: string | null;
  
  setAvailableRooms: (rooms: Room[]) => void;
  setRoomData: (roomData: Room) => void;
  addPlayer: (player: PlayerColor) => void;
  startGame: (gameData: any) => void;
  handleOpponentMove: (moveData: any) => void;
  setPlayerName: (name: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
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
  setShowGameSelection: (show: boolean) => set({ showGameSelection: show }),
  roomId: null,
  isHost: false,
  guestName: null,
  isWaitingPlayer: false,
  opponent: {
    name: null,
    avatar: null
  },
  availableRooms: [],
  currentRoom: null,
  playerName: null,

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

  selectPiece: (pieceId: string | null) => {
    const { pieces, currentPlayer, gameMode } = get();
    if (gameMode === 'single' && currentPlayer === 'black') return;

    if (!pieceId) {
      set({ selectedPiece: null, validMoves: [] });
      return;
    }

    const piece = pieces.find((p) => p.id === pieceId);
    if (!piece || piece.player !== currentPlayer) return;

    const validMoves = getValidMoves(piece, pieces);
    set({ selectedPiece: pieceId, validMoves });
  },

  movePiece: (from: Position, to: Position) => {
    const { pieces, currentPlayer, gameMode, difficulty } = get();
    const result = makeMove(pieces, from, to, currentPlayer);
    
    if (!result) return;

    const { newPieces, captured, turnEnds } = result;
    
    if (captured) {
      const currentScores = get().scores;
      set({
        scores: {
          ...currentScores,
          [currentPlayer]: currentScores[currentPlayer] + 1
        }
      });
    }
    
    if (turnEnds) {
      const nextPlayer = currentPlayer === 'red' ? 'black' : 'red';
      const hasValidMoves = newPieces.some(
        (p) => p.player === nextPlayer && getValidMoves(p, newPieces).length > 0
      );

      if (!hasValidMoves) {
        set({
          pieces: newPieces,
          currentPlayer: nextPlayer,
          selectedPiece: null,
          validMoves: [],
          gameOver: true,
          winner: currentPlayer,
        });
        return;
      }

      set({
        pieces: newPieces,
        currentPlayer: nextPlayer,
        selectedPiece: null,
        validMoves: [],
      });

      // AI move in single player mode
      if (gameMode === 'single' && nextPlayer === 'black' && difficulty) {
        setTimeout(() => {
          const state = get();
          if (state.currentPlayer === 'black' && !state.gameOver) {
            const bestMove = calculateBestMove(state.pieces, difficulty);
            if (bestMove) {
              get().movePiece(bestMove.from, bestMove.to);
            }
          }
        }, 500);
      }
    } else {
      // Continue capture sequence
      set({
        pieces: newPieces,
        selectedPiece: null,
        validMoves: [],
      });

      // Se é a vez da IA e há mais capturas, continua automaticamente
      if (gameMode === 'single' && currentPlayer === 'black' && difficulty) {
        setTimeout(() => {
          const state = get();
          const capturingPiece = state.pieces.find(p => 
            p.position.row === to.row && 
            p.position.col === to.col && 
            p.mustContinueCapture
          );
          
          if (capturingPiece) {
            const validMoves = getValidMoves(capturingPiece, state.pieces);
            if (validMoves.length > 0) {
              get().movePiece(capturingPiece.position, validMoves[0]);
            }
          }
        }, 500);
      }
    }
  },

  resetGame: () => {
    const { gameMode, difficulty } = get();
    get().initGame(gameMode!, difficulty || undefined);
  },

  goBack: () => {
    const { gameMode } = get();
    if (gameMode) {
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

  setAvailableRooms: (rooms) => set({ availableRooms: rooms }),
  
  setRoomData: (roomData) => set({ 
    currentRoom: roomData,
    gameMode: 'online'
  }),

  addPlayer: (player) => {
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
}));