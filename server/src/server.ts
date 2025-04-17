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

export const server = async (PORT = 4000, HOST = "0.0.0.0") => {
  const app = express();

  const server = createServer(app);
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server, {
    cors: {
      origin: [
        `http://${HOST}:5173`,
        "http://localhost:5173",
        "https://admin.socket.io",
      ],
      credentials: true,
    },
  });

  instrument(io, {
    auth: false,
    mode: "development",
  });

  io.on("connection", (socket) => {
    handleSocket(socket, io);

    if (process.env.NODE_ENV !== "production") {
      console.log("a user connected 📸");

      socket.onAny((eventName, ...args) => {
        console.log({ eventName, args, data: socket.data });
      });

      socket.on("disconnect", () => {
        console.log("user disconnected");
      });
    }
  });

  const assetsBuildPath = path.join(__dirname, "..", "..", "client");
  app.use(express.static(assetsBuildPath));
  app.get("*splat", (req, res) => {
    res.sendFile(path.join(assetsBuildPath, "index.html"));
  });

  server.listen(PORT, HOST, () => {
    console.log(`Server running in ${HOST}:${PORT}`);
  });
};
