import { draw } from "radash";

const randomWords = [
  "abacaxi",
  "abacate",
  "abelha",
  "acelerar",
  "acender",
  "açúcar",
  "aço",
  "admiração",
  "adolescente",
  "adrenalina",
  "afastar",
  "agilidade",
  "água",
  "agulha",
  "ajuda",
  "algodão",
  "alimento",
  "alma",
  "altura",
  "amarelo",
  "amargo",
  "amor",
  "amizade",
  "anão",
  "anjo",
  "animal",
  "ano",
  "antena",
  "antigo",
  "ânsia",
  "apaixonar",
  "apenas",
  "aperto",
  "aprender",
  "apressado",
  "aproveitar",
  "aquecer",
  "aranha",
  "árvore",
  "areia",
  "arma",
  "aroma",
  "arrependimento",
  "arroz",
  "asa",
  "ascenção",
  "assustador",
  "astro",
  "ataque",
  "atenção",
  "atitude",
  "atrair",
  "atravessar",
  "azul",
  "baba",
  "bacia",
  "bailar",
  "baixo",
  "bala",
  "balão",
  "banco",
  "banda",
  "banheira",
  "barata",
  "barba",
  "barco",
  "barulho",
  "barriga",
  "batalha",
  "batata",
  "bateria",
  "batom",
  "bau",
  "beber",
  "beijo",
  "beleza",
  "belo",
  "bênção",
  "berço",
  "besta",
  "biblioteca",
  "bicicleta",
  "bico",
  "bidê",
  "bife",
  "bigode",
  "bilhete",
  "biografia",
  "biscoito",
  "bicicleta",
  "biblioteca",
  "bife",
  "bigode",
  "bilhete",
  "biografia",
  "biscoito",
  "bispo",
  "branco",
  "brasa",
  "braço",
  "briga",
  "brilho",
  "brincar",
  "brinquedo",
  "brilho",
  "brisa",
  "broche",
  "bronze",
  "bruxa",
  "buraco",
  "burro",
  "buzina",
  "cabelo",
  "cabana",
  "cachorro",
  "cacto",
  "caçador",
  "cadeado",
  "cadeira",
  "caído",
  "caimento",
  "caixa",
  "calor",
  "calma",
  "cama",
  "caminhão",
  "camisa",
  "caminho",
  "campo",
  "canalha",
  "canção",
  "câncer",
  "candidato",
  "caneta",
  "cangaço",
  "canguçu",
  "canhoto",
  "cantar",
  "canto",
  "capa",
  "capítulo",
  "caráter",
  "carvão",
  "carne",
  "carnaval",
  "carregador",
  "carreta",
  "carta",
  "cartão",
  "casa",
  "casamento",
  "casca",
  "cascata",
  "casinha",
  "castelo",
  "catapulta",
  "catarata",
  "gato",
  "cauda",
  "causa",
  "cavalo",
  "caveira",
  "cebola",
  "céu",
  "cegueira",
  "céu",
  "cegueira",
  "celular",
  "cena",
  "cênico",
  "centavo",
  "centro",
  "cerveja",
  "certeza",
  "céu",
  "chama",
  "chaminé",
  "chapéu",
  "charada",
  "cheiro",
  "cheio",
  "chegada",
  "cheque",
  "chifre",
  "chuva",
  "chutar",
  "cicatriz",
  "cidade",
  "ciência",
  "ciganco",
  "cigarro",
  "cilindro",
  "zebra",
  "zelo",
  "zero",
  "zoológico",
  "zona",
  "zombar",
  "zumbido",
  "zunido",
];

export function getRandomWord() {
  return `${draw(randomWords)}-${draw(randomWords)}-${draw(randomWords)}`;
}