import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
  handleSocket,
} from "./socket";
import { instrument } from "@socket.io/admin-ui";

export const server = async (PORT: number) => {
  const app = express();

  const server = createServer(app);
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server, {
    cors: {
      origin: ["http://localhost:5173", "https://admin.socket.io"],
      credentials: true,
    },
  });

  instrument(io, {
    auth: false,
    mode: "development",
  });

  io.on("connection", (socket) => {
    handleSocket(socket, io);
    console.log("a user connected 📸");

    socket.onAny((eventName, ...args) => {
      console.log({ eventName, args }); // 'hello'
    });

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });

  server.listen(PORT, () => {
    console.log(`Server running in ${PORT}`);
  });
};
