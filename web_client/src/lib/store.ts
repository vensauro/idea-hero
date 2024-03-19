import { Game } from "#/game";
import { create, useStore } from "zustand";
import { derive } from "derive-zustand";

export interface Avatar {
  image: string;
  color: string;
}
interface GameState {
  isConnected: boolean;
  game: Game | null;
  nickname: string;
  avatar: null | Avatar;
  gameCode: string;
  connect: () => void;
  disconnect: () => void;
  isOwner: () => boolean;
  updateGameState: (game: Game) => void;
  setAvatar: (avatar: Avatar) => void;
  setNick: (nickname: string) => void;
  setCode: (gameCode: string) => void;
}

export const useGameStore = create<GameState>()((set, get) => ({
  isConnected: false,
  game: null,
  nickname: "",
  avatar: null,
  gameCode: "",
  isOwner: () => get().game?.owner.name === get().nickname,
  connect: () => set({ isConnected: true }),
  disconnect: () => set({ isConnected: false }),
  updateGameState: (game: Game) => set({ game }),
  setAvatar: (avatar) => set({ avatar }),
  setNick: (nickname) => set({ nickname }),
  setCode: (gameCode) => set({ gameCode }),
}));

const isOwnerStore = derive<boolean>(
  (get) => get(useGameStore).game?.owner.name === get(useGameStore).nickname
);
export const useIsOwner = () => useStore(isOwnerStore);
