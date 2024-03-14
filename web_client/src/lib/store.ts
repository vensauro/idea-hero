import { Game } from "#/game";
import { create } from "zustand";

interface GameState {
  isConnected: boolean;
  game: Game | null;
  nickname: string;
  avatar: string;
  connect: () => void;
  disconnect: () => void;
  updateGameState: (game: Game) => void;
  setAvatar: (avatar: string) => void;
  setNick: (nickname: string) => void;
}

export const useGameStore = create<GameState>()((set) => ({
  isConnected: false,
  game: null,
  nickname: "",
  avatar: "bg-slate-300",
  connect: () => set({ isConnected: true }),
  disconnect: () => set({ isConnected: false }),
  updateGameState: (game: Game) => set({ game }),
  setAvatar: (avatar) => set({ avatar }),
  setNick: (nickname) => set({ nickname }),
}));
