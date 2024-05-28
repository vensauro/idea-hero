import { Game, GameUser } from "#/game";
import { create } from "zustand";

import { devtools, persist } from "zustand/middleware";

export interface Avatar {
  image: string;
  color: string;
}
interface GameState {
  isConnected: boolean;
  game: Game | null;
  user: GameUser | null;
  nickname: string;
  avatar: null | Avatar;
  gameCode: string;
  connect: () => void;
  disconnect: () => void;
  isOwner: () => boolean;
  isActive: () => boolean;
  updateGameState: (game: Game | null) => void;
  setAvatar: (avatar: Avatar) => void;
  setUser: (user: GameUser) => void;
  setNick: (nickname: string) => void;
  setCode: (gameCode: string) => void;
  // resetGame: () => void;
}

export const useGameStore = create<GameState>()(
  devtools(
    persist(
      (set, get) => ({
        isConnected: false,
        game: null,
        user: null,
        nickname: "",
        avatar: null,
        gameCode: "",
        isOwner: () => get().game?.owner.id === get().user?.id,
        isActive: () => {
          const action = get().game?.actualAction;
          if (action && "activeUser" in action) {
            return get().user?.id === action.activeUser.id;
          }
          return false;
        },
        connect: () => set({ isConnected: true }),
        disconnect: () => set({ isConnected: false }),
        updateGameState: (game: Game | null) => set({ game }),
        setUser: (user: GameUser) => set({ user }),
        setAvatar: (avatar) => set({ avatar }),
        setNick: (nickname) => set({ nickname }),
        setCode: (gameCode) => set({ gameCode }),
      }),
      {
        name: "game-state",
      }
    )
  )
);
