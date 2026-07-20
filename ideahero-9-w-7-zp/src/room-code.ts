const ROOM_CODE_WORDS = [
  "ambar",
  "areia",
  "asa",
  "astro",
  "aurora",
  "barco",
  "bosque",
  "brisa",
  "campo",
  "canto",
  "cedro",
  "ceu",
  "chama",
  "chave",
  "chuva",
  "ciclo",
  "coral",
  "cristal",
  "duna",
  "eco",
  "estrela",
  "farol",
  "fauna",
  "festa",
  "fogo",
  "fonte",
  "fruto",
  "galaxia",
  "ilha",
  "jardim",
  "lago",
  "lunar",
  "mapa",
  "mar",
  "meteoro",
  "mundo",
  "nevoa",
  "norte",
  "onda",
  "orbe",
  "pedra",
  "pinho",
  "pista",
  "ponte",
  "prisma",
  "raio",
  "rede",
  "rio",
  "rota",
  "salto",
  "selva",
  "sinal",
  "sonho",
  "sol",
  "trama",
  "trilha",
  "vale",
  "vela",
  "vento",
  "verde",
  "vida",
  "vila",
  "voo",
  "zebra",
] as const;

const MAX_CREATE_ATTEMPTS = 5;

export function createRoomCode(random = Math.random) {
  const word = () =>
    ROOM_CODE_WORDS[Math.floor(random() * ROOM_CODE_WORDS.length)];
  return `${word()}-${word()}-${word()}`;
}

function isRoomCodeCollision(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLocaleLowerCase("pt-BR").includes("já está em uso");
}

export async function createRoomWithAvailableCode(
  createRoom: (code: string) => Promise<unknown>,
  random = Math.random,
) {
  for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt += 1) {
    try {
      return await createRoom(createRoomCode(random));
    } catch (error) {
      if (!isRoomCodeCollision(error) || attempt === MAX_CREATE_ATTEMPTS) {
        throw error;
      }
    }
  }
}
