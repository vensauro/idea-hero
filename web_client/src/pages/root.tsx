import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";

export function Root() {
  const store = useGameStore();
  useEffect(() => {
    socket.on("connect", store.connect);
    socket.on("disconnect", store.disconnect);
    socket.on("game_state_update", store.updateGameState);

    return () => {
      socket.off("connect", store.connect);
      socket.off("disconnect", store.disconnect);
      socket.off("game_state_update", store.updateGameState);
    };
  }, [store.connect, store.disconnect, store.updateGameState]);
  return <Outlet />;
}
