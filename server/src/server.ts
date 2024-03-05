import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
// import { join } from "node:path";

// console.log(join(__dirname, "..", "..", "static"));

export const server = async (PORT: number) => {
  const app = express();

  const server = createServer(app);
  const io = new Server(server);

  io.on("connection", (socket) => {
    console.log("a user connected");
  });

  server.listen(PORT, () => {
    console.log(`Server running in ${PORT}`);
  });
};
