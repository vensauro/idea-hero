import { server } from "./server";

server(process.env.PORT ? Number(process.env.PORT) : 4000);
