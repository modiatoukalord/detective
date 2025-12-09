
export enum CardType {
  SUSPECT = 'SUSPECT',
  LOCATION = 'LOCATION',
  WEAPON = 'WEAPON'
}

export interface Card {
  id: string;
  name: string;
  type: CardType;
  description: string;
  iconName: string; // We will use this to map to Lucide icons dynamically or static placeholders
  jpName: string; // Japanese stylistic text
  imageUrl?: string; // Optional URL for custom card images
}

export enum GamePhase {
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
  GAME_OVER_WIN = 'GAME_OVER_WIN',
  GAME_OVER_LOSE = 'GAME_OVER_LOSE'
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isComputer: boolean;
}

export interface GameState {
  phase: GamePhase;
  solution: Card[]; // The 3 hidden cards
  players: Player[]; // 0 is user, 1 is computer
  turnCount: number;
  log: GameLogEntry[];
  lastRefutation: { card: Card | null; fromPlayer: string } | null;
}

export interface GameLogEntry {
  turn: number;
  message: string;
  type: 'info' | 'alert' | 'success' | 'deduction';
}

export interface NotebookState {
  [cardId: string]: 'unknown' | 'has' | 'cleared' | 'suspicious';
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  isUser: boolean;
  timestamp: number;
}

export enum AppView {
  MENU = 'MENU',
  CREATE_LOBBY = 'CREATE_LOBBY',
  JOIN_LOBBY = 'JOIN_LOBBY',
  LIBRARY = 'LIBRARY',
  GAME = 'GAME'
}
