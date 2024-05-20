import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "#/socket";

const URL = import.meta.env.VITE_SERVE_URL;

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  URL,
  {
    autoConnect: false,
  }
);
