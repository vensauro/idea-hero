import { server } from "./server";
import "dotenv/config";

server(process.env.PORT ? Number(process.env.PORT) : 4000, process.env.HOST);
