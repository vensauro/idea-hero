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
import path from "node:path";

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

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });

  app.use(express.static("/client"));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client", "index.html"));
  });

  server.listen(PORT, () => {
    console.log(`Server running in ${PORT}`);
  });
};
