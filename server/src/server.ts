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
// import { join } from "node:path";

// console.log(join(__dirname, "..", "..", "static"));

export const server = async (PORT: number) => {
  const app = express();

  const server = createServer(app);
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server);

  io.on("connection", (socket) => {
    handleSocket(socket);
    console.log("a user connected 📸");

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });

  server.listen(PORT, () => {
    console.log(`Server running in ${PORT}`);
  });
};
